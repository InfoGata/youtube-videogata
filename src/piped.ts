import axios from "axios";

interface PipedApiResponse {
  videoStreams: PipedApiVideoStream[];
  title: string;
  description: string;
  duration: number;
  hls: string;
  dislikes: number;
  likes: number;
  // YYYY-MM-DD
  uploadDate: string;
  uploader: string;
  uploaderUrl: string;
  views: number;
  relatedStreams: PipedRelatedStream[];
}

interface PipedRelatedStream {
  duration: number;
  uploaderName: string;
  uploaderUrl?: string;
  thumbnail: string;
  title: string;
  url: string;
  views: number;
}

interface PipedApiVideoStream {
  format: string;
  url: string;
  bitrate: number;
}

export async function getVideoFromApiIdPiped(apiId: string): Promise<Video> {
  const url = `https://pipedapi.kavin.rocks/streams/${apiId}`;
  const response = await axios.get<PipedApiResponse>(url);
  const data = response.data;

  const video: Video = {
    title: data.title,
    apiId: apiId,
    sources: [{ source: data.hls, type: "application/x-mpegURL" }],
    duration: data.duration,
    views: data.views,
    likes: data.likes,
    dislikes: data.dislikes,
    description: data.description,
    channelName: data.uploader,
    // channelName is /channel/{channelApiId}
    channelApiId: data.uploaderUrl.split("/").slice(-1)[0],
    uploadDate: new Date(data.uploadDate).toISOString(),
    recommendedVideos: data.relatedStreams.map(
      (r): Video => ({
        title: r.title,
        // apiId is "/watch?v={apiId}"
        apiId: r.url.split("=").slice(-1)[0],
        images: [{ url: r.thumbnail }],
        duration: r.duration,
        views: r.views,
        channelName: r.uploaderName,
        channelApiId: r.uploaderUrl?.split("/").slice(-1)[0],
      })
    ),
  };
  return video;
}
