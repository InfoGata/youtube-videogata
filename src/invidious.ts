import axios from "axios";
import { StorageType } from "./shared";

interface InvidiousVideoReponse {
  title: string;
  videoId: string;
  description: string;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  author: string;
  authorUrl: string;
  lengthSeconds: number;
  hlsUrl: string;
  dashUrl: string;
  recommendedVideos: InvidiousRecommendedVideo[];
  adaptiveFormats: InvidiousAdaptiveFormat[];
  formatStreams: InvidiousFormatStream[];
  published: number;
}

interface InvidiousAdaptiveFormat {
  bitrate: string;
  url: string;
  container: string;
}

interface InvidiousFormatStream {
  container: string;
  url: string;
}

interface InvidiousRecommendedVideo {
  videoId: string;
  title: string;
  videoThumbnails: ImageInfo[];
  author: string;
  authorId: string;
  lengthSeconds: number;
  viewCountText: string;
  viewCount: number;
}

interface InvidiousComments {
  commentCount?: number;
  comments: InvidiousComment[];
  continuation: string;
}

interface InvidiousComment {
  author: string;
  authorThumbnails: ImageInfo[];
  authorId: string;
  content: string;
  published: number;
  likeCount: number;
  commentId: string;
  authorIsChannelOwner: boolean;
  replies?: InvidiousReplies;
}

interface InvidiousReplies {
  replyCount: number;
  continuation: string;
}

interface InvidiousInstance {
  0: string;
  1: InvidiousInstanceData;
}

interface InvidiousInstanceData {
  api: boolean;
  cors: boolean;
  uri: string;
}

export const fetchInstances = async () => {
  const instancesUrl = "https://api.invidious.io/instances.json";
  const response = await axios.get<InvidiousInstance[]>(instancesUrl);
  let instances = response.data;
  instances = instances.filter((instance) =>
    instance[0].includes(".onion") || instance[0].includes(".i2p")
      ? false
      : true
  );
  // Only use instances that uses cors
  instances = instances.filter((instance) => instance[1].cors);
  localStorage.setItem(StorageType.Instances, JSON.stringify(instances));
  return instances;
};

export const getRandomInstance = async (): Promise<string> => {
  const instanceString = localStorage.getItem(StorageType.Instances);
  let instances: InvidiousInstance[] = [];
  if (instanceString) {
    instances = JSON.parse(instanceString);
  } else {
    instances = await fetchInstances();
  }
  const randomIndex = Math.floor(Math.random() * instances.length);
  const newInstance = instances[randomIndex][1].uri;

  localStorage.setItem(StorageType.CurrentInstance, newInstance);
  return newInstance;
};

export const getCurrentInstance = async (): Promise<string> => {
  let instance = localStorage.getItem(StorageType.CurrentInstance);
  if (!instance) {
    instance = await getRandomInstance();
  }
  return instance;
};

export const getVideoFromApiIdInvidious = async (
  apiId: string
): Promise<Video> => {
  const instance = await getCurrentInstance();
  const url = `${instance}/api/v1/videos/${apiId}`;

  const response = await axios.get<InvidiousVideoReponse>(url);
  const data = response.data;
  const video: Video = {
    title: data.title,
    apiId: apiId,
    sources: [
      { source: `${data.dashUrl}?local=true`, type: "application/dash+xml" },
    ],
    duration: data.lengthSeconds,
    views: data.viewCount,
    likes: data.likeCount,
    dislikes: data.dislikeCount,
    description: data.description,
    channelName: data.author,
    channelApiId: data.authorUrl.split("/").slice(-1)[0],
    recommendedVideos: data.recommendedVideos.map((r) => ({
      title: r.title,
      apiId: r.videoId,
      images: r.videoThumbnails,
      duration: r.lengthSeconds,
      views: r.viewCount,
      channelName: r.author,
      channelApiId: r.authorId,
    })),
    uploadDate: new Date(data.published * 1000).toISOString(),
  };

  return video;
};

export const getVideoCommentsfromInvidious = async (
  request: VideoCommentsRequest
): Promise<VideoCommentsResult> => {
  const instance = await getCurrentInstance();
  let url = `${instance}/api/v1/comments/${request.apiId}`;
  if (request.page) {
    url = `${url}?continuation=${request.page.nextPage}`;
  }
  const response = await axios.get<InvidiousComments>(url);
  const comments = response.data.comments.map(
    (c): VideoComment => ({
      apiId: c.commentId,
      videoCommentId: request.apiId,
      content: c.content,
      author: c.author,
      images: c.authorThumbnails,
      replyCount: c.replies?.replyCount,
      replyPage: c.replies?.continuation,
    })
  );
  const page: PageInfo = {
    totalResults: response.data.commentCount || 0,
    resultsPerPage: 0,
    offset: 0,
    nextPage: response.data.continuation,
  };
  return { comments: comments, page };
};
