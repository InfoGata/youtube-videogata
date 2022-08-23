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
}

interface InvidiousRecommendedVideo {
  videoId: string;
  title: string;
  videoThumbnails: ImageInfo[];
  author: string;
  lengthSeconds: number;
  viewCountText: string;
}

interface InvidiousAdaptiveFormat {
  bitrate: string;
  url: string;
  container: string;
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
    channelApiId: data.authorUrl,
  };

  return video;
};
