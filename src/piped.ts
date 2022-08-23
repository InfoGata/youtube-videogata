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
  uploadedDate: string;
  uploader: string;
  uploaderUrl: string;
  views: number;
  relatedStreams: PipedRelatedStream[];
}

interface PipedRelatedStream {
  duration: number;
  thumbnail: string;
  title: string;
  url: string;
  views: string;
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
    channelApiId: data.uploaderUrl.split("/").slice(-1)[0],
  };
  return video;
}
