import { MessageType, UiMessageType, storage } from "./shared";
import {
  getVideoCommentsfromInvidious,
  getRandomInstance,
  getVideoFromApiIdInvidious,
  fetchInstances,
  getCurrentInstance,
  getTrendingInvidious,
  searchChannelsInvidious,
  searchVideosInvidious,
  searchPlaylistsInvidious,
  getPlaylistVideosInvidious,
  getChannelVideosInvidious,
  onGetInvidiousSearchSuggestions,
} from "./invidious";
import { getVideoFromApiIdPiped } from "./piped";
import {
  getPlaylistVideosYoutube,
  getUserPlaylistsYoutube,
  getVideosFromVideosIds,
  setTokens,
} from "./youtube";

const sendMessage = (message: MessageType) => {
  application.postUiMessage(message);
};

const getUsePlayer = async () => {
  const usePlayerString = storage.getItem("usePlayer");
  return !usePlayerString || usePlayerString === "true";
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
  const usePlayer = await getUsePlayer();
  const instance = await getCurrentInstance();
  sendMessage({
    type: "info",
    origin: origin,
    pluginId: pluginId,
    apiKey,
    clientId,
    clientSecret,
    usePlayer,
    instance,
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
      const instance = await getRandomInstance();
      sendMessage({ type: "sendinstance", instance });
      break;
    case "resolve-urls":
      const videos = await resolveUrls(message.videoUrls.split("\n"));
      await application.addVideosToPlaylist(message.playlistId, videos);
      application.createNotification({ message: "Success!" });
      break;
    default:
      const _exhaustive: never = message;
      break;
  }
};

async function searchVideos(
  request: SearchRequest
): Promise<SearchVideoResult> {
  return searchVideosInvidious(request);
}

async function searchChannels(
  request: SearchRequest
): Promise<SearchChannelResult> {
  return searchChannelsInvidious(request);
}

async function getChannelVideos(
  request: ChannelVideosRequest
): Promise<ChannelVideosResult> {
  return getChannelVideosInvidious(request);
}

async function searchPlaylists(
  request: SearchRequest
): Promise<SearchPlaylistResult> {
  return searchPlaylistsInvidious(request);
}

async function getPlaylistVideos(
  request: PlaylistVideoRequest
): Promise<PlaylistVideosResult> {
  if (request.isUserPlaylist) {
    return getPlaylistVideosYoutube(request);
  }
  return getPlaylistVideosInvidious(request);
}

async function getTopItems(): Promise<SearchAllResult> {
  const videos = await getTrendingInvidious();
  const videoResults: SearchVideoResult = {
    items: videos,
  };

  return {
    videos: videoResults,
  };
}

async function getYoutubeVideo(request: GetVideoRequest): Promise<Video> {
  const usePlayer = await getUsePlayer();
  const result = usePlayer
    ? getVideoFromApiIdInvidious(request.apiId)
    : getVideoFromApiIdPiped(request.apiId);
  return result;
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
    pageInfo: request.pageInfo,
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
  return onGetInvidiousSearchSuggestions(request);
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
application.onUsePlayer = getUsePlayer;
application.onGetVideo = getYoutubeVideo;
application.onLookupPlaylistUrl = importPlaylist;
application.onLookupVideoUrls = resolveUrls;
application.onCanParseUrl = canParseUrl;
application.onGetSearchSuggestions = getSuggestions;

const init = async () => {
  const accessToken = storage.getItem("access_token");
  if (accessToken) {
    application.onGetUserPlaylists = getUserPlaylistsYoutube;
  }
  await fetchInstances();
};

init();
