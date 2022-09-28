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

interface InvidiousSearchVideo {
  title: string;
  videoId: string;
  videoThumbnails: ImageInfo[];
  lengthSeconds: number;
  viewCount: number;
  author: string;
  authorId: string;
  authorUrl: string;
  published: number;
  description: string;
}

interface InvidiousSearchPlaylist {
  title: string;
  playlistId: string;
  author: string;
  authorId: string;
  videos: InvidiousSearchPlaylistVideo[];
}

interface InvidiousSearchPlaylistVideo {
  title: string;
  videoId: string;
  lengthSeconds: number;
  videoThumbnails: ImageInfo[];
}

interface InvidiousSearchChannel {
  author: string;
  authorId: string;
  authorThumbnails: ImageInfo[];
  subCount: number;
  videoCount: number;
  description: string;
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

const invdiousSearchVideoToVideo = (result: InvidiousSearchVideo): Video => {
  return {
    title: result.title,
    apiId: result.videoId,
    images: result.videoThumbnails,
    duration: result.lengthSeconds,
    views: result.viewCount,
    channelName: result.author,
    channelApiId: result.authorId,
    uploadDate: new Date(result.published * 1000).toISOString(),
  };
};

export const getTrendingInvidious = async (): Promise<Video[]> => {
  const instance = await getCurrentInstance();
  const url = `${instance}/api/v1/trending`;
  const response = await axios.get<InvidiousSearchVideo[]>(url);
  const videos = response.data.map(invdiousSearchVideoToVideo);

  return videos;
};

export const searchVideosInvidious = async (
  request: SearchRequest
): Promise<SearchVideoResult> => {
  const instance = await getCurrentInstance();
  let url = `${instance}/api/v1/search?q=${request.query}&type=video`;
  let page: PageInfo = {
    resultsPerPage: 20,
    offset: request.page?.offset || 0,
  };
  if (request.page?.nextPage) {
    url += `&page=${request.page.nextPage}`;
    const currentPage = parseInt(request.page.nextPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else if (request.page?.prevPage) {
    url += `&page=${request.page.prevPage}`;
    const currentPage = parseInt(request.page.prevPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else {
    page.nextPage = "2";
  }
  const response = await axios.get<InvidiousSearchVideo[]>(url);
  const videos = response.data.map(invdiousSearchVideoToVideo);

  const videoResults: SearchVideoResult = {
    items: videos,
    pageInfo: page,
  };
  return videoResults;
};

export const searchPlaylistsInvidious = async (
  request: SearchRequest
): Promise<SearchPlaylistResult> => {
  const instance = await getCurrentInstance();
  let url = `${instance}/api/v1/search?q=${request.query}&type=playlist`;
  const response = await axios.get<InvidiousSearchPlaylist[]>(url);
  const playlists = response.data.map(
    (d): PlaylistInfo => ({
      name: d.title,
      apiId: d.playlistId,
      images: d.videos.length > 0 ? d.videos[0].videoThumbnails : [],
    })
  );

  return {
    items: playlists,
  };
};

export const searchChannelsInvidious = async (request: SearchRequest) => {
  const instance = await getCurrentInstance();
  let url = `${instance}/api/v1/search?q=${request.query}&type=channel`;
  const response = await axios.get<InvidiousSearchChannel[]>(url);

  const channels = response.data.map(
    (d): Channel => ({
      name: d.author,
      apiId: d.authorId,
      images: d.authorThumbnails.map((a) => ({
        ...a,
        url: a.url.startsWith("http") ? a.url : `https:${a.url}`,
      })),
    })
  );

  return {
    items: channels,
  };
};

interface InvidiousChannel {
  author: string;
  authorId: string;
  authorBanners: ImageInfo[];
  authorThumbnails: ImageInfo[];
  subCount: number;
  description: string;
  latestVideos: InvidiousSearchVideo[];
}

export const getChannelVideosInvidious = async (
  request: ChannelVideosRequest
): Promise<ChannelVideosResult> => {
  const instance = await getCurrentInstance();
  const channelUrl = `${instance}/api/v1/channels/${request.apiId}?field=author,authorId,authorThumbnails`;
  const detailsResponse = await axios.get<InvidiousChannel>(channelUrl);
  const channelResult = detailsResponse.data;
  const channel: Channel = {
    name: channelResult.author,
    apiId: channelResult.authorId,
    images: channelResult.authorThumbnails.map((a) => ({
      ...a,
      url: a.url.startsWith("http") ? a.url : `https:${a.url}`,
    })),
  };
  let url = `${instance}/api/v1/channels/${request.apiId}/videos`;
  let page: PageInfo = {
    resultsPerPage: 20,
    offset: request.page?.offset || 0,
  };
  if (request.page?.nextPage) {
    url += `?page=${request.page.nextPage}`;
    const currentPage = parseInt(request.page.nextPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else if (request.page?.prevPage) {
    url += `?page=${request.page.prevPage}`;
    const currentPage = parseInt(request.page.prevPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else {
    page.nextPage = "2";
  }
  const results = await axios.get<InvidiousSearchVideo[]>(url);
  const videos = results.data.map(invdiousSearchVideoToVideo);

  return {
    channel,
    items: videos,
    pageInfo: page,
  };
};

interface InvidiousPlaylist {
  title: string;
  playlistId: string;
  author: string;
  authorId: string;
  authorThumbnails: ImageInfo[];
  description: string;
  viewCount: string;
  videos: InvidiousPlaylistVideo[];
}

interface InvidiousPlaylistVideo {
  title: string;
  videoId: string;
  author: string;
  authorId: string;
  lengthSeconds: number;
  videoThumbnails: ImageInfo[];
}

export const getPlaylistVideosInvidious = async (
  request: PlaylistVideoRequest
): Promise<PlaylistVideosResult> => {
  const instance = await getCurrentInstance();
  let url = `${instance}/api/v1/playlists/${request.apiId}`;
  const response = await axios.get<InvidiousPlaylist>(url);
  const result = response.data;
  const playlist: PlaylistInfo = {
    name: result.title,
    apiId: result.playlistId,
    images: result.videos.length > 0 ? result.videos[0].videoThumbnails : [],
  };
  const videos = result.videos.map(
    (v): Video => ({
      title: v.title,
      apiId: v.videoId,
      images: v.videoThumbnails,
      duration: v.lengthSeconds,
      channelName: v.author,
      channelApiId: v.authorId,
    })
  );

  return {
    playlist,
    items: videos,
  };
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
      images: c.authorThumbnails.map((a) => ({
        ...a,
        url: a.url.startsWith("http") ? a.url : `https:${a.url}`,
      })),
      likes: c.likeCount,
      createdDate: new Date(c.published * 1000).toISOString(),
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
