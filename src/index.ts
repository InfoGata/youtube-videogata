import { localeStringToLocale, MessageType, UiMessageType } from "./shared";
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
} from "./invidious";
import { getVideoFromApiIdPiped } from "./piped";
import {
  getPlaylistVideosYoutube,
  getUserPlaylistsYoutube,
  setTokens,
} from "./youtube";
import { translate } from "preact-i18n";

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
  const locale = await application.getLocale();
  const apiKey = localStorage.getItem("apiKey") ?? "";
  const clientId = localStorage.getItem("clientId") ?? "";
  const clientSecret = localStorage.getItem("clientSecret") ?? "";
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
      application.onGetUserPlaylists = getUserPlaylistsYoutube;
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

      const localeString = await application.getLocale();
      const locale = localeStringToLocale(localeString);
      const notificationText = translate("apiKeysSaved", "common", locale);
      application.createNotification({ message: notificationText });
      break;
    case "useplayer":
      localStorage.setItem("usePlayer", String(message.usePlayer));
      break;
    case "endvideo":
      application.endVideo();
      break;
    case "getinstnace":
      const instance = await getRandomInstance();
      sendMessage({ type: "sendinstance", instance });
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

const init = async () => {
  const accessToken = localStorage.getItem("access_token");
  if (accessToken) {
    application.onGetUserPlaylists = getUserPlaylistsYoutube;
  }
  await fetchInstances();
};

init();
