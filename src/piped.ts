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

const instances = [
  "https://pipedapi.kavin.rocks",
  "https://piped-api.garudalinux.org",
  "https://pipedapi.in.projectsegfau.lt",
  "https://watchapi.whatever.social",
  "https://api-piped.mha.fi",
  "https://pipedapi.syncpundit.io",
  "https://pipedapi.moomoo.me",
];

export async function getVideoFromApiIdPiped(
  apiId: string,
  instanceIndex = 0
): Promise<Video> {
  const instance = instances[instanceIndex];
  try {
    const url = `${instance}/streams/${apiId}`;
    const timeoutMs = 10000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(), timeoutMs);
    });
    const responsePromise = axios.get<PipedApiResponse>(url);
    await Promise.race([responsePromise, timeoutPromise]);

    const response = await responsePromise;
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
  } catch (err) {
    if (instanceIndex < instances.length) {
      return getVideoFromApiIdPiped(apiId, instanceIndex + 1);
    }
    throw err;
  }
}
