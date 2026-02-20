import {
  MessageType,
  UiMessageType,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  storage,
} from "./shared";
import {
  getPlaylistVideosYoutube,
  getTopItemsYoutube,
  getUserPlaylistsYoutube,
  getVideosFromVideosIds,
  setTokens,
} from "./youtube";
import {
  getChannelVideosInnertube,
  getPlaylistVideosInnertube,
  getSearchSuggestionsInnertube,
  getTopItemsInnertube,
  getVideoCommentsInnertube,
  getVideoFromApiIdInnertube,
  reloadPlayerResponse,
  searchChannelsInnertube,
  searchPlaylistsInnertube,
  searchVideosInnertube,
} from "./innertube-api";

const sendMessage = (message: MessageType) => {
  application.postUiMessage(message);
};

const sendInfo = async () => {
  const host = document.location.host;
  const hostArray = host.split(".");
  hostArray.shift();
  const domain = hostArray.join(".");
  const origin = `${document.location.protocol}//${domain}`;
  const pluginId = await application.getPluginId();
  const locale = await application.getLocale();
  const playlists = await application.getPlaylistsInfo();
  const apiKey = storage.getItem("apiKey") ?? "";
  const clientId = storage.getItem("clientId") ?? "";
  const clientSecret = storage.getItem("clientSecret") ?? "";
  const usePlayerString = storage.getItem("usePlayer");
  const usePlayer = !usePlayerString || usePlayerString === "true";
  sendMessage({
    type: "info",
    origin: origin,
    pluginId: pluginId,
    apiKey,
    clientId,
    clientSecret,
    usePlayer,
    instance: "",
    locale,
    playlists,
  });
};

const importPlaylist = async (url: string): Promise<Playlist> => {
  const youtubeUrl = new URL(url);
  const listId = youtubeUrl.searchParams.get("list");
  if (listId) {
    const playlistResponse = await getPlaylistVideos({
      apiId: listId,
      isUserPlaylist: false,
    });

    const playlist: Playlist = {
      ...playlistResponse.playlist,
      videos: playlistResponse.items,
    };

    return playlist;
  }
  throw new Error("Couldn't retreive playlist");
};

const resolveUrls = async (urlStrings: string[]) => {
  const ids: string[] = [];
  urlStrings.forEach((u) => {
    try {
      const videoRegex =
        /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu.be)\/(?:watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]+)(?:\S+)?$/;
      const match = u.match(videoRegex);
      if (match) {
        ids.push(match[1]);
      }
    } catch {}
  });

  // Max number of ids that youtube api allows is 50
  const length = ids.length;
  const limit = 50;
  let start = 0;
  let end = limit;
  const results: Video[] = [];
  while (start < length) {
    const idSlice = ids.slice(start, end);
    const tracks = await getVideosFromVideosIds(idSlice);
    results.push(...tracks);
    start += limit;
    end += limit;
  }

  return results;
};

application.onUiMessage = async (message: UiMessageType) => {
  switch (message.type) {
    case "check-login":
      const accessToken = storage.getItem("access_token");
      if (accessToken) {
        sendMessage({ type: "login", accessToken: accessToken });
      }
      await sendInfo();
      break;
    case "login":
      setTokens(message.accessToken, message.refreshToken);
      application.onGetUserPlaylists = getUserPlaylistsYoutube;
      break;
    case "logout":
      storage.removeItem("access_token");
      storage.removeItem("refresh_token");
      application.onGetUserPlaylists = undefined;
      break;
    case "set-keys":
      storage.setItem("apiKey", message.apiKey);
      storage.setItem("clientId", message.clientId);
      storage.setItem("clientSecret", message.clientSecret);
      application.createNotification({ message: "Api Keys saved!" });
      break;
    case "useplayer":
      storage.setItem("usePlayer", String(message.usePlayer));
      break;
    case "endvideo":
      application.endVideo();
      break;
    case "getinstnace":
      // Innertube doesn't use instances, send empty string
      sendMessage({ type: "sendinstance", instance: "" });
      break;
    case "resolve-urls":
      const videos = await resolveUrls(message.videoUrls.split("\n"));
      await application.addVideosToPlaylist(message.playlistId, videos);
      application.createNotification({ message: "Success!" });
      break;
    case "reload-player-request":
      const reloadResult = await reloadPlayerResponse(
        message.videoId,
        message.reloadContext
      );
      sendMessage({
        type: "reload-player-response",
        streamingUrl: reloadResult.streamingUrl,
        ustreamerConfig: reloadResult.ustreamerConfig,
      });
      break;
    case "proxy-fetch-request":
      try {
        const fetchInit: RequestInit = {
          method: message.method,
          headers: message.headers,
        };
        if (message.body) {
          fetchInit.body = new Uint8Array(base64ToArrayBuffer(message.body));
        }
        const fetchResponse = await application.networkRequest(
          message.url,
          fetchInit
        );
        const responseBuffer = await fetchResponse.arrayBuffer();
        const responseHeaders: Record<string, string> = {};
        fetchResponse.headers.forEach((value: string, key: string) => {
          responseHeaders[key] = value;
        });
        sendMessage({
          type: "proxy-fetch-response",
          requestId: message.requestId,
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          headers: responseHeaders,
          body: arrayBufferToBase64(responseBuffer),
        });
      } catch (err: any) {
        sendMessage({
          type: "proxy-fetch-response",
          requestId: message.requestId,
          status: 0,
          statusText: "",
          headers: {},
          body: "",
        });
      }
      break;
    default:
      const _exhaustive: never = message;
      break;
  }
};

async function searchVideos(
  request: SearchRequest
): Promise<SearchVideoResult> {
  return searchVideosInnertube(request);
}

async function searchChannels(
  request: SearchRequest
): Promise<SearchChannelResult> {
  return searchChannelsInnertube(request);
}

async function getChannelVideos(
  request: ChannelVideosRequest
): Promise<ChannelVideosResult> {
  return getChannelVideosInnertube(request);
}

async function searchPlaylists(
  request: SearchRequest
): Promise<SearchPlaylistResult> {
  return searchPlaylistsInnertube(request);
}

async function getPlaylistVideos(
  request: PlaylistVideoRequest
): Promise<PlaylistVideosResult> {
  if (request.isUserPlaylist) {
    return getPlaylistVideosYoutube(request);
  }
  return getPlaylistVideosInnertube(request);
}

async function getTopItems(): Promise<SearchAllResult> {
  try {
    return await getTopItemsYoutube();
  } catch {
    return await getTopItemsInnertube();
  }
}

async function getYoutubeVideo(request: GetVideoRequest): Promise<Video> {
  return getVideoFromApiIdInnertube(request.apiId);
}

async function getVideoComments(
  request: VideoCommentsRequest
): Promise<VideoCommentsResult> {
  return getVideoCommentsInnertube(request);
}

async function getCommentReplies(
  request: CommentReplyRequest
): Promise<VideoCommentsResult> {
  const commentRequest: VideoCommentsRequest = {
    apiId: request.videoApiId,
    pageInfo: request.pageInfo,
  };
  return getVideoCommentsInnertube(commentRequest);
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

export async function canParseUrl(
  url: string,
  type: ParseUrlType
): Promise<boolean> {
  const playlistRegex = /^.*(youtu.be\/|list=)([^#\&\?]*).*/;
  const videoRegex =
    /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu.be)\/(?:watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]+)(?:\S+)?$/;
  if (!playlistRegex.test(url) && !videoRegex.test(url)) {
    return false;
  }

  switch (type) {
    case "playlist":
      return new URL(url).searchParams.has("list");
    case "video":
      return true;
    default:
      return false;
  }
}

export async function getSuggestions(request: GetSearchSuggestionsRequest) {
  return getSearchSuggestionsInnertube(request);
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
application.onGetVideo = getYoutubeVideo;
application.onLookupPlaylistUrl = importPlaylist;
application.onLookupVideoUrls = resolveUrls;
application.onCanParseUrl = canParseUrl;
application.onGetSearchSuggestions = getSuggestions;

const changeTheme = (theme: Theme) => {
  localStorage.setItem("vite-ui-theme", theme);
};
application.onChangeTheme = async (theme: Theme) => {
  changeTheme(theme);
};

const init = async () => {
  const theme = await application.getTheme();
  changeTheme(theme);
  const accessToken = storage.getItem("access_token");
  if (accessToken) {
    application.onGetUserPlaylists = getUserPlaylistsYoutube;
  }
};

init();
