import ky from "ky";
import { storage, StorageType } from "./shared";
const defaultInstace = "https://piped.kavin.rocks";

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
  audioStreams: PipedAudioStream[];
  dash: string | null;
  lbryId: string;
  livestream: boolean;
  proxyUrl: string;
  subtitles: PipedSubtitle[];
  thumbnailUrl: string;
  uploaderVerified: boolean;
}

interface PipedAudioStream {
  bitrate: number;
  codec: string;
  format: string;
  indexEnd: number;
  indexStart: number;
  initStart: number;
  initEnd: number;
  mimeType: string;
  quality: string;
  url: string;
  videoOnly: boolean;
}

interface PipedChannelVideos {
  avatarUrl: string;
  bannerUrl: string;
  description: string;
  id: string;
  name: string;
  nextpage: string;
  relatedStreams: PipedRelatedStream[];
}

interface PipedChannelVideoNextPage {
  nextpage: string;
  relatedStreams: PipedRelatedStream[];
}

interface PipedPlaylistVideos {
  bannerUrl: string;
  name: string;
  nextpage: string;
  relatedStreams: PipedRelatedStream[];
  thumbnailUrl: string;
  uploader: string;
  uploaderAvatar: string;
  uploaderUrl: string;
  videos: number;
}

interface PipedSubtitle {
  autoGenerated: boolean;
  code: string;
  mimeType: string;
  name: string;
  url: string;
}

interface PipedRelatedStream {
  duration: number;
  uploaderName: string;
  uploaderUrl?: string;
  thumbnail: string;
  title: string;
  url: string;
  views: number;
  uploadedDate: string;
  uploaderAvatar: string;
  uploaderVerified: boolean;
}

interface PipedApiVideoStream {
  format: string;
  url: string;
  bitrate: number;
}

interface PipedInstance {
  name: string;
  api_url: string;
  version: string;
  up_to_date: boolean;
  cdn: boolean;
  registered: number;
  last_checked: number;
  uptime_24h: number;
  uptime_7d: number;
  uptime_30d: number;
}

interface PipedComments {
  author: string;
  commentId: string;
  commentText: string;
  commentedTtime: string;
  commentorUrl: string;
  hearted: boolean;
  likeCount: number;
  pinned: boolean;
  verified: boolean;
  creatorReplied: boolean;
  thumbnail: string;
}

interface PipedCommentsResponse {
  disabled: boolean;
  nextpage: string;
  comments: PipedComments[];
}

interface PipedSearchResponse {
  items: (PipedChannelSearchItem | PipedVideoSearchItem | PipedPlaylistSearchItem)[];
  nextpage: string;
  suggestion: string;
  corrected: boolean;
}

interface PipedChannelSearchItem {
  type: "channel";
  // url is /channel/{channelApiId}
  url: string;
  name: string;
  thumbnail: string;
  description: string;
  subscribers: number;
  videos: number;
  verified: boolean;
}

interface PipedVideoSearchItem {
  type: "stream";
  // url is /watch?v={videoApiId}
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderAvatar: string;
  uploadedDate: string;
  shortDescription: string;
  duration: number;
  views: number;
  uploaded: number;
  uploaderVerified: boolean;
  isShort: boolean;
}

interface PipedPlaylistSearchItem {
  type: "playlist";
  // url is /watch?v={playlistApiId}
  url: string;
  name: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderVerified: boolean;
  playlistType: string;
  videos: number;
}

export const fetchInstances = async () => {
  const instancesUrl = "https://piped-instances.kavin.rocks/";
  const instances = await ky.get<PipedInstance[]>(instancesUrl).json();
  storage.setItem(StorageType.PipedInstances, JSON.stringify(instances));
  return instances;
};

export const getInstance = async (): Promise<string> => {
  const instanceString = storage.getItem(StorageType.PipedInstances);
  let instances: PipedInstance[] = [];
  if (instanceString) {
    instances = JSON.parse(instanceString);
  } else {
    try {
      instances = await fetchInstances();
    } catch (err) {
      console.error(err);
      return defaultInstace;
    }
  }
  const newInstance = instances[0].api_url;

  storage.setItem(StorageType.PipedCurrentInstance, newInstance);
  return newInstance;
};

const getAllInstances = async (): Promise<PipedInstance[]> => {
  const instanceString = storage.getItem(StorageType.PipedInstances);
  if (instanceString) {
    return JSON.parse(instanceString);
  }
  return await fetchInstances();
};

export const getCurrentInstance = async (): Promise<string> => {
  let instance = storage.getItem(StorageType.PipedCurrentInstance);
  if (!instance) {
    instance = await getInstance();
  }
  return instance;
};

export async function getVideoFromApiIdPiped(
  apiId: string,
  instanceIndex = 0
): Promise<Video> {
  const instances = await getAllInstances();
  let instance = await getCurrentInstance();
  if (instanceIndex > 0 && instanceIndex < instances.length) {
    instance = instances[instanceIndex].api_url;
  }
  try {
    const url = `${instance}/streams/${apiId}`;
    const timeoutMs = 10000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(), timeoutMs);
    });
    const responsePromise = ky.get<PipedApiResponse>(url).json();
    await Promise.race([responsePromise, timeoutPromise]);

    const data = await responsePromise;
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
    const instances = await getAllInstances();
    if (instanceIndex < instances.length) {
      return getVideoFromApiIdPiped(apiId, instanceIndex + 1);
    }
    throw err;
  }
}

interface PipedSearchSuggestionsResponse {
  0: string;
  1: string[];
}

const relatedStreamToVideo = (stream: PipedRelatedStream): Video => ({
  title: stream.title,
  apiId: stream.url.split("=").slice(-1)[0],
  images: [{ url: stream.thumbnail }],
  duration: stream.duration,
  views: stream.views,
  channelName: stream.uploaderName,
  channelApiId: stream.uploaderUrl?.split("/").slice(-1)[0],
});

export const onGetPipedSearchSuggestions = async (request: GetSearchSuggestionsRequest): Promise<string[]> => {
  const instance = await getCurrentInstance();
  const url = `${instance}/opensearch/suggestions?query=${request.query}`;
  const response = await ky.get<PipedSearchSuggestionsResponse>(url).json();
  return response[1];
};

export const getVideoCommentsPiped = async (request: VideoCommentsRequest): Promise<VideoCommentsResult> => {
  const instance = await getCurrentInstance();
  const url = `${instance}/comments/${request.apiId}`;
  const response = await ky.get<PipedCommentsResponse>(url).json();
  const comments = response.comments.map(
    (c): VideoComment => ({
      apiId: c.commentId,
      videoCommentId: request.apiId,
      content: c.commentText,
      author: c.author,
      images: [{
        url: c.thumbnail,
      }],
      likes: c.likeCount,
    })
  );

  const page: PageInfo = {
    resultsPerPage: 0,
    offset: 0,
    nextPage: response.nextpage,
  };

  return {
    comments,
    pageInfo: page,
  };
};

export const searchVideosPiped = async (request: SearchRequest): Promise<SearchVideoResult> => {
  const instance = await getCurrentInstance();
  const url = `${instance}/search?q=${request.query}&filter=videos`;
  const response = await ky.get<PipedSearchResponse>(url).json();
  const items = response.items.filter((item): item is PipedVideoSearchItem => item.type === "stream").map((item): Video => {
      return {
        title: item.title,
        apiId: item.url.split("=").slice(-1)[0],
        images: [{ url: item.thumbnail }],
        duration: item.duration,
        views: item.views,
        channelName: item.uploaderName,
        channelApiId: item.uploaderUrl?.split("/").slice(-1)[0],
      }
  });
  const pageInfo: PageInfo = {
    resultsPerPage: 0,
    offset: 0,
    nextPage: response.nextpage,
  }
  return {
    items,
    pageInfo,
  }
}

export const searchPlaylistsPiped = async (request: SearchRequest): Promise<SearchPlaylistResult> => {
  const instance = await getCurrentInstance();
  const url = `${instance}/search?q=${request.query}&filter=playlists`;
  const response = await ky.get<PipedSearchResponse>(url).json();
  const items = response.items.filter((item): item is PipedPlaylistSearchItem => item.type === "playlist").map((item): Playlist => {
    return {
      name: item.name,
      apiId: item.url.split("=").slice(-1)[0],
      images: [{ url: item.thumbnail }],
      videos: [],
    }
  })
  const pageInfo: PageInfo = {
    resultsPerPage: 0,
    offset: 0,
    nextPage: response.nextpage,
  }
  return {
    items,
    pageInfo,
  }
}

export const searchChannelsPiped = async (request: SearchRequest): Promise<SearchChannelResult> => {
  const instance = await getCurrentInstance();
  const url = `${instance}/search?q=${request.query}&filter=channels`;
  const response = await ky.get<PipedSearchResponse>(url).json();
  const items = response.items.filter((item): item is PipedChannelSearchItem => item.type === "channel").map((item): Channel => {
    return {
      name: item.name,
      apiId: item.url.split("=").slice(-1)[0],
      images: [{ url: item.thumbnail }],
    }
  })
  const pageInfo: PageInfo = {
    resultsPerPage: 0,
    offset: 0,
    nextPage: response.nextpage,
  }
  return {
    items,
    pageInfo,
  }
}

export const getChannelVideosPiped = async (request: ChannelVideosRequest): Promise<ChannelVideosResult> => {
  const instance = await getCurrentInstance();
  const url = `${instance}/channel/${request.apiId}`;
  const response = await ky.get<PipedChannelVideos>(url).json();
  const videos = response.relatedStreams.map(relatedStreamToVideo);
  const pageInfo: PageInfo = {
    resultsPerPage: 0,
    offset: 0,
    nextPage: response.nextpage,
  }
  return {
    items: videos,
    pageInfo,
  }
}


export const getPlaylistVideosPiped = async (request: PlaylistVideoRequest): Promise<PlaylistVideosResult> => {
  const instance = await getCurrentInstance();
  const url = `${instance}/playlists/${request.apiId}`;
  const response = await ky.get<PipedPlaylistVideos>(url).json();
  const videos = response.relatedStreams.map(relatedStreamToVideo);
  const pageInfo: PageInfo = {
    resultsPerPage: 0,
    offset: 0,
    nextPage: response.nextpage,
  }
  return {
    items: videos,
    pageInfo,
  }
}

export const getTrendingPiped = async (): Promise<SearchAllResult> => {
  const instance = await getCurrentInstance();
  // TODO: get region from user
  const region = "US";
  const url = `${instance}/trending?region=${region}`;
  const response = await ky.get<PipedRelatedStream[]>(url).json();
  const items = response.map(relatedStreamToVideo);
  return {
    videos: {
      items,
    },
  };
}