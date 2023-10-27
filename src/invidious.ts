import axios from "axios";
import {
  getYoutubeChannelUrl,
  getYoutubePlaylistUrl,
  getYoutubeVideoUrl,
  storage,
  StorageType,
} from "./shared";

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

interface InvidiousChannelVideos {
  continuation: string;
  videos: InvidiousSearchVideo[];
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
  storage.setItem(StorageType.Instances, JSON.stringify(instances));
  return instances;
};

export const getRandomInstance = async (): Promise<string> => {
  const instanceString = storage.getItem(StorageType.Instances);
  let instances: InvidiousInstance[] = [];
  if (instanceString) {
    instances = JSON.parse(instanceString);
  } else {
    instances = await fetchInstances();
  }
  const randomIndex = Math.floor(Math.random() * instances.length);
  const newInstance = instances[randomIndex][1].uri;

  storage.setItem(StorageType.CurrentInstance, newInstance);
  return newInstance;
};

export const getCurrentInstance = async (): Promise<string> => {
  let instance = storage.getItem(StorageType.CurrentInstance);
  if (!instance) {
    instance = await getRandomInstance();
  }
  return instance;
};

const sendRequest = async <T>(path: string) => {
  let instance = await getCurrentInstance();
  try {
    const url = `${instance}${path}`;
    const request = await axios.get<T>(url);
    return request;
  } catch {
    instance = await getRandomInstance();
    const url = `${instance}${path}`;
    const request = await axios.get<T>(url);
    return request;
  }
};

export const getVideoFromApiIdInvidious = async (
  apiId: string
): Promise<Video> => {
  const path = `/api/v1/videos/${apiId}`;
  const response = await sendRequest<InvidiousVideoReponse>(path);
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
    originalUrl: getYoutubeVideoUrl(apiId),
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
    originalUrl: getYoutubeVideoUrl(result.videoId),
  };
};

export const getTrendingInvidious = async (): Promise<Video[]> => {
  const path = `/api/v1/trending`;
  const response = await sendRequest<InvidiousSearchVideo[]>(path);
  const videos = response.data.map(invdiousSearchVideoToVideo);

  return videos;
};

export const searchVideosInvidious = async (
  request: SearchRequest
): Promise<SearchVideoResult> => {
  let path = `/api/v1/search?q=${request.query}&type=video`;
  let page: PageInfo = {
    resultsPerPage: 20,
    offset: request.pageInfo?.offset || 0,
  };
  if (request.pageInfo?.nextPage) {
    path += `&page=${request.pageInfo.nextPage}`;
    const currentPage = parseInt(request.pageInfo.nextPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else if (request.pageInfo?.prevPage) {
    path += `&page=${request.pageInfo.prevPage}`;
    const currentPage = parseInt(request.pageInfo.prevPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else {
    page.nextPage = "2";
  }
  const filters = request.filterInfo?.filters;
  if (filters) {
    const filterStrings = filters
      .filter((f) => !!f.value)
      .map((f) => `&${f.id}=${f.value}`);
    path += filterStrings.join("");
  }

  const response = await sendRequest<InvidiousSearchVideo[]>(path);
  const videos = response.data.map(invdiousSearchVideoToVideo);
  const filterInfo: FilterInfo = {
    filters: [
      {
        id: "date",
        displayName: "Date",
        type: "radio",
        value: "",
        options: [
          { displayName: "All Time", value: "" },
          { displayName: "Year", value: "year" },
          { displayName: "Month", value: "month" },
          { displayName: "Week", value: "week" },
          { displayName: "Today", value: "today" },
          { displayName: "Hour", value: "hour" },
        ],
      },
      {
        id: "duration",
        displayName: "Duration",
        type: "radio",
        value: "",
        options: [
          { displayName: "Any", value: "" },
          { displayName: "Short", value: "short" },
          { displayName: "Long", value: "long" },
        ],
      },
      {
        id: "sort_by",
        displayName: "Sort By",
        type: "select",
        value: "relevance",
        options: [
          { displayName: "Relevance", value: "relevance" },
          { displayName: "Rating", value: "rating" },
          { displayName: "Upload Date", value: "update_date" },
          { displayName: "View Count", value: "view_count" },
        ],
      },
    ],
  };

  const videoResults: SearchVideoResult = {
    items: videos,
    pageInfo: page,
    filterInfo,
  };
  return videoResults;
};

export const searchPlaylistsInvidious = async (
  request: SearchRequest
): Promise<SearchPlaylistResult> => {
  let path = `/api/v1/search?q=${request.query}&type=playlist`;
  let page: PageInfo = {
    resultsPerPage: 20,
    offset: request.pageInfo?.offset || 0,
  };
  if (request.pageInfo?.nextPage) {
    path += `&page=${request.pageInfo.nextPage}`;
    const currentPage = parseInt(request.pageInfo.nextPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else if (request.pageInfo?.prevPage) {
    path += `&page=${request.pageInfo.prevPage}`;
    const currentPage = parseInt(request.pageInfo.prevPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else {
    page.nextPage = "2";
  }

  const response = await sendRequest<InvidiousSearchPlaylist[]>(path);

  const playlists = response.data.map(
    (d): PlaylistInfo => ({
      name: d.title,
      apiId: d.playlistId,
      images: d.videos.length > 0 ? d.videos[0].videoThumbnails : [],
      originalUrl: getYoutubePlaylistUrl(d.playlistId),
    })
  );

  return {
    items: playlists,
    pageInfo: page,
  };
};

export const searchChannelsInvidious = async (request: SearchRequest) => {
  let path = `/api/v1/search?q=${request.query}&type=channel`;
  const response = await sendRequest<InvidiousSearchChannel[]>(path);

  const channels = response.data.map(
    (d): Channel => ({
      name: d.author,
      apiId: d.authorId,
      images: d.authorThumbnails.map((a) => ({
        ...a,
        url: a.url.startsWith("http") ? a.url : `https:${a.url}`,
      })),
      originalUrl: getYoutubeChannelUrl(d.authorId),
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
  const channelPath = `/api/v1/channels/${request.apiId}?field=author,authorId,authorThumbnails`;
  const detailsResponse = await sendRequest<InvidiousChannel>(channelPath);
  const channelResult = detailsResponse.data;
  const channel: Channel = {
    name: channelResult.author,
    apiId: channelResult.authorId,
    images: channelResult.authorThumbnails.map((a) => ({
      ...a,
      url: a.url.startsWith("http") ? a.url : `https:${a.url}`,
    })),
    originalUrl: getYoutubeChannelUrl(channelResult.authorId),
  };
  let path = `/api/v1/channels/${request.apiId}/videos`;
  let page: PageInfo = {
    resultsPerPage: 20,
    offset: request.pageInfo?.offset || 0,
  };
  if (request.pageInfo?.nextPage) {
    path += `?page=${request.pageInfo.nextPage}`;
    const currentPage = parseInt(request.pageInfo.nextPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else if (request.pageInfo?.prevPage) {
    path += `?page=${request.pageInfo.prevPage}`;
    const currentPage = parseInt(request.pageInfo.prevPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else {
    page.nextPage = "2";
  }
  const results = await sendRequest<InvidiousChannelVideos>(path);
  const videos = results.data.videos.map(invdiousSearchVideoToVideo);

  return {
    channel,
    items: videos,
    pageInfo: page,
  };
};

export const onGetInvidiousSearchSuggestions = async (
  request: GetSearchSuggestionsRequest
): Promise<string[]> => {
  const path = `/api/v1/search/suggestions?q=${request.query}`;
  const response = await sendRequest<{ query: string; suggestions: string[] }>(
    path
  );
  return response.data.suggestions;
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
  let path = `/api/v1/playlists/${request.apiId}`;
  const response = await sendRequest<InvidiousPlaylist>(path);
  const result = response.data;
  const playlist: PlaylistInfo = {
    name: result.title,
    apiId: result.playlistId,
    images: result.videos.length > 0 ? result.videos[0].videoThumbnails : [],
    originalUrl: getYoutubePlaylistUrl(result.playlistId),
  };
  const videos = result.videos.map(
    (v): Video => ({
      title: v.title,
      apiId: v.videoId,
      images: v.videoThumbnails,
      duration: v.lengthSeconds,
      channelName: v.author,
      channelApiId: v.authorId,
      originalUrl: getYoutubeVideoUrl(v.videoId),
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
  let path = `/api/v1/comments/${request.apiId}`;
  if (request.pageInfo) {
    path = `${path}?continuation=${request.pageInfo.nextPage}`;
  }
  const response = await sendRequest<InvidiousComments>(path);
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
  return { comments: comments, pageInfo: page };
};
