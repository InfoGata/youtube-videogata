import axios from "axios";
import { parse, toSeconds } from "iso8601-duration";
import {
  CLIENT_ID,
  MessageType,
  TOKEN_SERVER,
  TOKEN_URL,
  UiMessageType,
} from "./shared";
import "videogata-plugin-typings";
import {
  getVideoCommentsfromInvidious,
  getVideoFromApiIdInvidious,
} from "./invidious";

const http = axios.create();

const key = "AIzaSyB3nKWm5VUqMMAaFhC3QCH_0VJU84Oyq48";

const getApiKey = () => {
  const apiKey = localStorage.getItem("apiKey");
  return apiKey || key;
};

const setTokens = (accessToken: string, refreshToken?: string) => {
  localStorage.setItem("access_token", accessToken);
  if (refreshToken) {
    localStorage.setItem("refresh_token", refreshToken);
  }
};

const refreshToken = async () => {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return;

  const clientId = localStorage.getItem("clientId");
  const clientSecret = localStorage.getItem("clientSecret");
  let tokenUrl = TOKEN_SERVER;

  const params = new URLSearchParams();
  params.append("client_id", clientId || CLIENT_ID);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  if (clientId && clientSecret) {
    params.append("client_secret", clientSecret);
    tokenUrl = TOKEN_URL;
  }

  const result = await axios.post(tokenUrl, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (result.data.access_token) {
    setTokens(result.data.access_token);
    return result.data.access_token as string;
  }
};

http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = "Bearer " + token;
    }
    return config;
  },
  (error) => {
    Promise.reject(error);
  }
);

http.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const accessToken = await refreshToken();
      http.defaults.headers.common["Authorization"] = "Bearer " + accessToken;
      return http(originalRequest);
    }
  }
);

const sendMessage = (message: MessageType) => {
  application.postUiMessage(message);
};

const getUsePlayer = async () => {
  const usePlayerString = localStorage.getItem("usePlayer");
  return !usePlayerString || usePlayerString === "true";
};

const sendInfo = async () => {
  const host = document.location.host;
  const hostArray = host.split(".");
  hostArray.shift();
  const domain = hostArray.join(".");
  const origin = `${document.location.protocol}//${domain}`;
  const pluginId = await application.getPluginId();
  const apiKey = localStorage.getItem("apiKey") ?? "";
  const clientId = localStorage.getItem("clientId") ?? "";
  const clientSecret = localStorage.getItem("clientSecret") ?? "";
  const usePlayer = await getUsePlayer();
  sendMessage({
    type: "info",
    origin: origin,
    pluginId: pluginId,
    apiKey,
    clientId,
    clientSecret,
    usePlayer,
  });
};

application.onUiMessage = async (message: UiMessageType) => {
  switch (message.type) {
    case "check-login":
      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        sendMessage({ type: "login", accessToken: accessToken });
      }
      await sendInfo();
      break;
    case "login":
      setTokens(message.accessToken, message.refreshToken);
      application.onGetUserPlaylists = getUserPlaylists;
      break;
    case "logout":
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      application.onGetUserPlaylists = undefined;
      break;
    case "set-keys":
      localStorage.setItem("apiKey", message.apiKey);
      localStorage.setItem("clientId", message.clientId);
      localStorage.setItem("clientSecret", message.clientSecret);
      application.createNotification({ message: "Api keys Saved!" });
      break;
    case "useplayer":
      localStorage.setItem("usePlayer", String(message.usePlayer));
      break;
    case "endvideo":
      application.endVideo();
      break;
  }
};

function playlistResultToPlaylist(
  result: GoogleAppsScript.YouTube.Schema.PlaylistListResponse
): PlaylistInfo[] {
  const items = result.items || [];
  return items.map(
    (r): PlaylistInfo => ({
      apiId: r.id,
      name: r.snippet?.title || "",
      images: [
        {
          width: r.snippet?.thumbnails?.default?.width || 0,
          url: r.snippet?.thumbnails?.default?.url || "",
          height: r.snippet?.thumbnails?.default?.height || 0,
        },
      ],
      isUserPlaylist: true,
    })
  );
}

function playlistSearchResultToPlaylist(
  result: GoogleAppsScript.YouTube.Schema.SearchListResponse
): PlaylistInfo[] {
  const items = result.items || [];
  return items.map(
    (r): PlaylistInfo => ({
      apiId: r.id?.playlistId,
      name: r.snippet?.title || "",
      images: [
        {
          width: r.snippet?.thumbnails?.default?.width || 0,
          url: r.snippet?.thumbnails?.default?.url || "",
          height: r.snippet?.thumbnails?.default?.height || 0,
        },
      ],
    })
  );
}

function channelSearchResultToChannel(
  result: GoogleAppsScript.YouTube.Schema.SearchListResponse
): Channel[] {
  const items = result.items || [];

  return items.map(
    (r): Channel => ({
      apiId: r.id?.channelId,
      name: r.snippet?.channelTitle || "",
      images: [
        {
          width: r.snippet?.thumbnails?.default?.width || 0,
          url: r.snippet?.thumbnails?.default?.url || "",
          height: r.snippet?.thumbnails?.default?.height || 0,
        },
      ],
    })
  );
}

function resultToVideoYoutube(
  result: GoogleAppsScript.YouTube.Schema.VideoListResponse
): Video[] {
  const items = result.items || [];
  return items.map(
    (i): Video => ({
      apiId: i.id,
      duration: toSeconds(parse(i.contentDetails?.duration || "0")),
      images:
        i.snippet?.thumbnails &&
        Object.values(i.snippet?.thumbnails).map(
          (v: GoogleAppsScript.YouTube.Schema.Thumbnail) => ({
            url: v.url || "",
            height: v.height || 0,
            width: v.width || 0,
          })
        ),
      title: i.snippet?.title || "",
    })
  );
}

async function getUserPlaylists(
  request: UserPlaylistRequest
): Promise<SearchPlaylistResult> {
  const url = "https://www.googleapis.com/youtube/v3/playlists";
  const urlWithQuery = `${url}?part=snippet,contentDetails&mine=true&key=${getApiKey()}`;
  const result =
    await http.get<GoogleAppsScript.YouTube.Schema.PlaylistListResponse>(
      urlWithQuery
    );
  const playlistResults: SearchPlaylistResult = {
    items: playlistResultToPlaylist(result.data),
    pageInfo: {
      totalResults: result.data.pageInfo?.totalResults || 0,
      resultsPerPage: result.data.pageInfo?.resultsPerPage || 0,
      offset: request.page ? request.page.offset : 0,
      nextPage: result.data.nextPageToken,
      prevPage: result.data.prevPageToken,
    },
  };
  return playlistResults;
}

async function searchVideos(
  request: SearchRequest
): Promise<SearchVideoResult> {
  const url = "https://www.googleapis.com/youtube/v3/search";
  let urlWithQuery = `${url}?part=id&type=video&maxResults=50&key=${getApiKey()}&q=${encodeURIComponent(
    request.query
  )}`;
  if (request.page) {
    if (request.page.nextPage) {
      // Next Page
      urlWithQuery += `&pageToken=${request.page.nextPage}`;
    } else if (request.page.prevPage) {
      // Prev P1ge
      urlWithQuery += `&pageToken=${request.page.prevPage}`;
    }
  }

  const results =
    await axios.get<GoogleAppsScript.YouTube.Schema.SearchListResponse>(
      urlWithQuery
    );
  const detailsUrl = "https://www.googleapis.com/youtube/v3/videos";
  const ids = results.data.items?.map((i) => i.id?.videoId).join(",");
  const detailsUrlWithQuery = `${detailsUrl}?key=${getApiKey()}&part=snippet,contentDetails&id=${ids}`;
  const detailsResults =
    await axios.get<GoogleAppsScript.YouTube.Schema.VideoListResponse>(
      detailsUrlWithQuery
    );
  const trackResults: SearchVideoResult = {
    items: resultToVideoYoutube(detailsResults.data),
    pageInfo: {
      totalResults: results.data.pageInfo?.totalResults || 0,
      resultsPerPage: results.data.pageInfo?.resultsPerPage || 0,
      offset: request.page ? request.page.offset : 0,
      nextPage: results.data.nextPageToken,
      prevPage: results.data.prevPageToken,
    },
  };
  return trackResults;
}

async function searchChannels(
  request: SearchRequest
): Promise<SearchChannelResult> {
  const url = "https://www.googleapis.com/youtube/v3/search";
  let urlWithQuery = `${url}?part=snippet&type=channel&maxResults=50&key=${getApiKey()}&q=${encodeURIComponent(
    request.query
  )}`;
  const results =
    await axios.get<GoogleAppsScript.YouTube.Schema.SearchListResponse>(
      urlWithQuery
    );

  return {
    items: channelSearchResultToChannel(results.data),
  };
}

async function getChannelVideos(
  request: ChannelVideosRequest
): Promise<ChannelVideosResult> {
  const url = "https://youtube.googleapis.com/youtube/v3/channels";
  const urlWithQuery = `${url}?part=contentDetails&id=${
    request.apiId
  }&key=${getApiKey()}`;
  const results =
    await axios.get<GoogleAppsScript.YouTube.Schema.ChannelListResponse>(
      urlWithQuery
    );
  const channels = results.data.items;
  const channelInfo = channels && channels[0];
  if (channelInfo) {
    const uploadsPlaylist =
      channelInfo.contentDetails?.relatedPlaylists?.uploads;
    const videos = await getPlaylistVideos({
      apiId: uploadsPlaylist,
      isUserPlaylist: false,
    });
    return { items: videos.items };
  }

  return {
    items: [],
  };
}

async function searchPlaylists(
  request: SearchRequest
): Promise<SearchPlaylistResult> {
  const url = "https://www.googleapis.com/youtube/v3/search";
  let urlWithQuery = `${url}?part=snippet&type=playlist&maxResults=50&key=${getApiKey()}&q=${encodeURIComponent(
    request.query
  )}`;
  if (request.page) {
    if (request.page.nextPage) {
      // Next Page
      urlWithQuery += `&pageToken=${request.page.nextPage}`;
    } else if (request.page.prevPage) {
      // Prev P1ge
      urlWithQuery += `&pageToken=${request.page.prevPage}`;
    }
  }
  const results =
    await axios.get<GoogleAppsScript.YouTube.Schema.SearchListResponse>(
      urlWithQuery
    );
  const playlistResults: SearchPlaylistResult = {
    items: playlistSearchResultToPlaylist(results.data),
    pageInfo: {
      totalResults: results.data.pageInfo?.totalResults || 0,
      resultsPerPage: results.data.pageInfo?.resultsPerPage || 0,
      offset: request.page ? request.page.offset : 0,
      nextPage: results.data.nextPageToken,
      prevPage: results.data.prevPageToken,
    },
  };
  return playlistResults;
}

async function getPlaylistVideos(
  request: PlaylistVideoRequest
): Promise<SearchVideoResult> {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems`;
  let urlWithQuery = `${url}?part=contentDetails&maxResults=50&key=${getApiKey()}&playlistId=${
    request.apiId
  }`;
  if (request.isUserPlaylist) {
    urlWithQuery += "&mine=true";
  }
  if (request.page) {
    if (request.page.nextPage) {
      // Next Page
      urlWithQuery += `&pageToken=${request.page.nextPage}`;
    } else if (request.page.prevPage) {
      // Prev P1ge
      urlWithQuery += `&pageToken=${request.page.prevPage}`;
    }
  }
  const instance = request.isUserPlaylist ? http : axios;
  const result =
    await instance.get<GoogleAppsScript.YouTube.Schema.PlaylistItemListResponse>(
      urlWithQuery
    );
  const detailsUrl = "https://www.googleapis.com/youtube/v3/videos";
  const ids = result.data.items
    ?.map((i) => i.contentDetails?.videoId)
    .join(",");
  const detailsUrlWithQuery = `${detailsUrl}?key=${getApiKey()}&part=snippet,contentDetails&id=${ids}`;
  const detailsResults =
    await axios.get<GoogleAppsScript.YouTube.Schema.VideoListResponse>(
      detailsUrlWithQuery
    );
  const trackResults: SearchVideoResult = {
    items: resultToVideoYoutube(detailsResults.data),
    pageInfo: {
      totalResults: result.data.pageInfo?.totalResults || 0,
      resultsPerPage: result.data.pageInfo?.resultsPerPage || 0,
      offset: request.page ? request.page.offset : 0,
      nextPage: result.data.nextPageToken,
      prevPage: result.data.prevPageToken,
    },
  };
  return trackResults;
}

async function getTopItems(): Promise<SearchAllResult> {
  const url = "https://www.googleapis.com/youtube/v3/videos";
  const urlWithQuery = `${url}?key=${getApiKey()}&videoCategoryId=10&chart=mostPopular&part=snippet,contentDetails`;
  const detailsResults =
    await axios.get<GoogleAppsScript.YouTube.Schema.VideoListResponse>(
      urlWithQuery
    );
  const videoResults: SearchVideoResult = {
    items: resultToVideoYoutube(detailsResults.data),
  };
  return {
    videos: videoResults,
  };
}

async function getYoutubeVideo(request: GetVideoRequest): Promise<Video> {
  return getVideoFromApiIdInvidious(request.apiId);
}

async function getVideoComments(
  request: VideoCommentsRequest
): Promise<VideoCommentsResult> {
  return getVideoCommentsfromInvidious(request);
}

async function getCommentReplies(
  request: CommentReplyRequest
): Promise<VideoCommentsResult> {
  const commentRequest: VideoCommentsRequest = {
    apiId: request.videoApiId,
    page: request.page,
  };
  return getVideoCommentsfromInvidious(commentRequest);
}

async function searchAll(request: SearchRequest): Promise<SearchAllResult> {
  const videosPromise = searchVideos(request);
  const playlistsPromise = searchPlaylists(request);
  const channelsPromise = searchChannels(request);
  const [videos, playlists, channels] = await Promise.all([
    videosPromise,
    playlistsPromise,
    channelsPromise,
  ]);
  return {
    videos,
    playlists,
    channels,
  };
}

application.onSearchAll = searchAll;
application.onSearchVideos = searchVideos;
application.onSearchPlaylists = searchPlaylists;
application.onSearchChannels = searchChannels;
application.onGetChannelVideos = getChannelVideos;
application.onGetPlaylistVideos = getPlaylistVideos;
application.onGetVideoComments = getVideoComments;
application.onGetCommentReplies = getCommentReplies;
application.onGetTopItems = getTopItems;
//application.onUsePlayer = getUsePlayer;
application.onGetVideo = getYoutubeVideo;

const init = () => {
  const accessToken = localStorage.getItem("access_token");
  if (accessToken) {
    application.onGetUserPlaylists = getUserPlaylists;
  }
};

init();
