import axios from "axios";
const instance = "invidious.namazso.eu";

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
  published: number;
}

interface InvidiousAdaptiveFormat {
  bitrate: string;
  url: string;
  container: string;
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

export const getVideoFromApiIdInvidious = async (
  apiId: string
): Promise<Video> => {
  const url = `https://${instance}/api/v1/videos/${apiId}`;

  const response = await axios.get<InvidiousVideoReponse>(url);
  const data = response.data;
  const video: Video = {
    title: data.title,
    apiId: apiId,
    sources: data.adaptiveFormats
      .filter((a) => a.container === "mp4")
      .map((a) => ({ type: "video/mp4", source: a.url })),
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
    uploadDate: new Date(data.published).toISOString(),
  };

  return video;
};

export const getVideoCommentsfromInvidious = async (
  request: VideoCommentsRequest
): Promise<VideoCommentsResult> => {
  let url = `https://${instance}/api/v1/comments/${request.apiId}`;
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
