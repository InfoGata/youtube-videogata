import {
  Constants,
  IBrowseResponse,
  Innertube,
  Mixins,
  Platform,
  Utils,
  YT,
  YTNodes,
} from "youtubei.js";
import type { Types } from "youtubei.js";
import { buildSabrFormat } from "googlevideo/utils";
import { SABR_DATA_KEY, SabrData, storage } from "./shared";

type AccountItem = YTNodes.AccountItem;
type CompactVideo = YTNodes.CompactVideo;
type LockupView = YTNodes.LockupView;
type PlaylistPanelVideo = YTNodes.PlaylistPanelVideo;
type ReelItem = YTNodes.ReelItem;
type ShortsLockupView = YTNodes.ShortsLockupView;
type WatchCardCompactVideo = YTNodes.WatchCardCompactVideo;

const getDurationSeconds = (duration: any): number => {
  if (!duration) return 0;
  if (typeof duration === "object" && "seconds" in duration) {
    return duration.seconds ?? 0;
  }
  return 0;
};

Platform.shim.eval = async (
  data: Types.BuildScriptResult,
  env: Record<string, Types.VMPrimative>
) => {
  const properties = [];

  if (env.n) {
    properties.push(`n: exportedVars.nFunction("${env.n}")`);
  }

  if (env.sig) {
    properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
  }

  const code = `${data.output}\nreturn { ${properties.join(", ")} }`;

  return new Function(code)();
};

let instance: Innertube | undefined;
const getInnertubeInstance = async (): Promise<Innertube> => {
  if (!instance) {
    instance = await Innertube.create({
      fetch: application.networkRequest,
      cookie: "CONSENT=YES+",
    });
  }
  return instance;
};

export const getInnertubeInstanceExported = getInnertubeInstance;

export const getTopItemsInnertube = async (): Promise<SearchAllResult> => {
  const youtube = await getInnertubeInstance();
  const home = await youtube.getHomeFeed();

  const videos = home.videos
    .filter(
      (
        v
      ): v is Exclude<
        typeof v,
        | ReelItem
        | PlaylistPanelVideo
        | WatchCardCompactVideo
        | ShortsLockupView
      > => "thumbnails" in v && "author" in v
    )
    .map(
      (v): Video => ({
        apiId: v.id,
        title: v.title.toString(),
        duration: getDurationSeconds(v.duration),
        channelName: v.author.name,
        channelApiId: v.author.id,
        images: v.thumbnails,
      })
    );
  return {
    videos: {
      items: videos,
    },
  };
};

export const getVideoFromApiIdInnertube = async (
  apiId: string
): Promise<Video> => {
  console.log("Getting video info for id", apiId);
  const youtube = await getInnertubeInstance();

  const playerResponse = await youtube.actions.execute("/player", {
    videoId: apiId,
    contentCheckOk: true,
    racyCheckOk: true,
    playbackContext: {
      contentPlaybackContext: {
        signatureTimestamp: youtube.session.player?.signature_timestamp,
      },
    },
  });

  const cpn = Utils.generateRandomString(16);
  const videoInfo = new YT.VideoInfo(
    [playerResponse],
    youtube.actions,
    cpn
  );

  console.log("Got video info from innertube", videoInfo);

  const basicInfo = videoInfo.basic_info;
  const isLive = !!basicInfo.is_live;
  const isPostLiveDVR =
    !!basicInfo.is_post_live_dvr ||
    (!!basicInfo.is_live_content &&
      !!(
        videoInfo.streaming_data?.dash_manifest_url ||
        videoInfo.streaming_data?.hls_manifest_url
      ));

  // Get watch_next data for related videos and metadata
  const info = await youtube.getInfo(apiId);
  const videoDetails = info.primary_info;
  const channelInfo = info.secondary_info?.owner;

  const relatedVideos = (info.watch_next_feed ?? [])
    .filter((v): v is CompactVideo => v.type === "CompactVideo")
    .map((v): Video => {
      const vid = v as CompactVideo;
      return {
        apiId: vid.id,
        title: vid.title.toString(),
        duration: getDurationSeconds(vid.duration),
        channelName: vid.author.name,
        channelApiId: vid.author.id,
        images: vid.thumbnails,
      };
    });

  // Build and store SABR data for the player
  if (videoInfo.streaming_data) {
    let manifest = "";
    let liveManifestUrl: string | undefined;

    if (isLive) {
      liveManifestUrl = videoInfo.streaming_data.dash_manifest_url
        ? `${videoInfo.streaming_data.dash_manifest_url}/mpd_version/7`
        : videoInfo.streaming_data.hls_manifest_url;
    } else if (isPostLiveDVR) {
      liveManifestUrl =
        videoInfo.streaming_data.hls_manifest_url ||
        (videoInfo.streaming_data.dash_manifest_url
          ? `${videoInfo.streaming_data.dash_manifest_url}/mpd_version/7`
          : undefined);
    } else {
      manifest = btoa(
        await videoInfo.toDash({
          manifest_options: {
            is_sabr: true,
            captions_format: "vtt",
            include_thumbnails: false,
          },
        })
      );
    }

    const streamingUrl = await youtube.session.player!.decipher(
      videoInfo.streaming_data?.server_abr_streaming_url
    );

    const sabrData: SabrData = {
      manifest,
      streamingUrl,
      formats: videoInfo.streaming_data.adaptive_formats.map(buildSabrFormat),
      ustreamerConfig:
        videoInfo.player_config?.media_common_config
          .media_ustreamer_request_config
          ?.video_playback_ustreamer_config,
      clientInfo: {
        osName: youtube.session.context.client.osName,
        osVersion: youtube.session.context.client.osVersion,
        clientName: parseInt(
          Constants.CLIENT_NAME_IDS[
            youtube.session.context.client
              .clientName as keyof typeof Constants.CLIENT_NAME_IDS
          ]
        ),
        clientVersion: youtube.session.context.client.clientVersion,
      },
      videoId: apiId,
      title: basicInfo.title ?? "",
      isLive,
      isPostLiveDVR,
      liveManifestUrl,
    };

    storage.setItem(SABR_DATA_KEY, JSON.stringify(sabrData));
  }

  const video: Video = {
    title: basicInfo.title ?? "",
    apiId: apiId,
    sources: [],
    duration: basicInfo.duration ?? 0,
    views: basicInfo.view_count ?? 0,
    likes: 0,
    description: basicInfo.short_description ?? "",
    channelName: channelInfo?.author?.name ?? "",
    channelApiId: channelInfo?.author?.id ?? "",
    uploadDate: videoDetails?.published?.text
      ? new Date(videoDetails.published.text).toISOString()
      : undefined,
    recommendedVideos: relatedVideos,
    images: basicInfo.thumbnail ?? [],
  };
  console.log("Got video info", video);
  return video;
};

export const reloadPlayerResponse = async (
  videoId: string,
  reloadContext: any
): Promise<{ streamingUrl: string; ustreamerConfig?: string }> => {
  const youtube = await getInnertubeInstance();

  const reloadedInfo = await youtube.actions.execute("/player", {
    videoId,
    contentCheckOk: true,
    racyCheckOk: true,
    playbackContext: {
      contentPlaybackContext: {
        signatureTimestamp: youtube.session.player?.signature_timestamp,
      },
      reloadPlaybackContext: reloadContext,
    },
  });

  const cpn = Utils.generateRandomString(16);
  const parsedInfo = new YT.VideoInfo(
    [reloadedInfo],
    youtube.actions,
    cpn
  );

  const streamingUrl = await youtube.session.player!.decipher(
    parsedInfo.streaming_data?.server_abr_streaming_url
  );

  const ustreamerConfig =
    parsedInfo.player_config?.media_common_config
      .media_ustreamer_request_config?.video_playback_ustreamer_config;

  return { streamingUrl, ustreamerConfig };
};

export const getSearchSuggestionsInnertube = async (
  request: GetSearchSuggestionsRequest
): Promise<string[]> => {
  const youtube = await getInnertubeInstance();
  const suggestions = await youtube.getSearchSuggestions(request.query);
  return suggestions.map((s: string | { toString: () => string }) =>
    typeof s === "string" ? s : s.toString()
  );
};

export const getVideoCommentsInnertube = async (
  request: VideoCommentsRequest
): Promise<VideoCommentsResult> => {
  if (!request.apiId) {
    const pageInfo: PageInfo = {
      resultsPerPage: 0,
      offset: 0,
    };
    return {
      comments: [],
      pageInfo,
    };
  }

  try {
    const youtube = await getInnertubeInstance();
    const comments = await youtube.getComments(request.apiId);

    const videoComments: VideoComment[] = comments.contents
      .filter((c: { type: string }): boolean => c.type === "CommentThread")
      .map((thread: any): VideoComment => {
        const comment = thread.comment;
        return {
          apiId: comment?.comment_id ?? "",
          videoCommentId: request.apiId,
          content: comment?.content?.toString() ?? "",
          author: comment?.author?.name ?? "",
          images: comment?.author?.thumbnails ?? [],
          likes: comment?.vote_count?.text
            ? parseInt(comment.vote_count.text.replace(/[^0-9]/g, "")) || 0
            : 0,
        };
      });

    const pageInfo: PageInfo = {
      resultsPerPage: videoComments.length,
      offset: 0,
    };

    return {
      comments: videoComments,
      pageInfo,
    };
  } catch {
    const pageInfo: PageInfo = {
      resultsPerPage: 0,
      offset: 0,
    };
    return {
      comments: [],
      pageInfo,
    };
  }
};

export const getChannelVideosInnertube = async (
  request: ChannelVideosRequest
): Promise<ChannelVideosResult> => {
  if (!request.apiId) {
    const pageInfo: PageInfo = {
      resultsPerPage: 0,
      offset: 0,
    };
    return {
      items: [],
      pageInfo,
    };
  }

  const youtube = await getInnertubeInstance();
  const channel = await youtube.getChannel(request.apiId);
  const videosTab = await channel.getVideos();

  const videos = videosTab.videos
    .filter(
      (
        v
      ): v is Exclude<
        typeof v,
        | ReelItem
        | PlaylistPanelVideo
        | WatchCardCompactVideo
        | ShortsLockupView
      > => "id" in v && "author" in v
    )
    .map(
      (v): Video => ({
        apiId: v.id,
        title: v.title.toString(),
        duration: getDurationSeconds(v.duration),
        channelName: v.author.name,
        channelApiId: v.author.id,
        images: v.thumbnails,
      })
    );

  const pageInfo: PageInfo = {
    resultsPerPage: videos.length,
    offset: 0,
  };

  return {
    items: videos,
    pageInfo,
  };
};

export const getUserChannelsInnertube = async (
  _request: UserChannelRequest
): Promise<SearchChannelResult> => {
  const youtube = await getInnertubeInstance();
  const response = await youtube.actions.execute("/browse", {
    browseId: "FEchannels",
    parse: true,
  });
  const feed: Mixins.Feed<IBrowseResponse> = new Mixins.Feed(
    youtube.actions,
    response
  );

  const channels = feed.channels.map(
    (c): Channel => ({
      apiId: c.id,
      name: c.author.name,
      images: c.author.thumbnails,
    })
  );

  const pageInfo: PageInfo = {
    resultsPerPage: channels.length,
    offset: 0,
  };

  return {
    items: channels,
    pageInfo,
  };
};

export const getUserPlaylistsInnertube = async (
  _request: UserPlaylistRequest
): Promise<SearchPlaylistResult> => {
  const youtube = await getInnertubeInstance();
  const accountInfo = await youtube.account.getInfo();
  const channelId: string = accountInfo.contents
    ?.as(YTNodes.AccountItemSection)
    ?.contents.find(
      (c): c is AccountItem => c.type === "channel"
    )?.channel_handle.endpoint?.payload.browseId;
  const channel = await youtube.getChannel(channelId);
  if (channel.has_playlists) {
    const playlistChannel = await channel.getPlaylists();
    const playlists = playlistChannel.playlists.map((p): PlaylistInfo => {
      if ("title" in p && "id" in p && "thumbnails" in p) {
        return {
          name: p.title.toString(),
          apiId: p.id,
          images: p.thumbnails,
        };
      }
      return {
        name: "",
        apiId: "",
        images: [],
      };
    });

    const pageInfo: PageInfo = {
      resultsPerPage: playlists.length,
      offset: 0,
    };

    return {
      items: playlists,
      pageInfo,
    };
  }

  const pageInfo: PageInfo = {
    resultsPerPage: 0,
    offset: 0,
  };

  return {
    items: [],
    pageInfo,
  };
};

export const getPlaylistVideosInnertube = async (
  request: PlaylistVideoRequest
): Promise<PlaylistVideosResult> => {
  if (!request.apiId) {
    const pageInfo: PageInfo = {
      resultsPerPage: 0,
      offset: 0,
    };
    return {
      items: [],
      pageInfo,
      playlist: {
        name: "",
        apiId: "",
        images: [],
      },
    };
  }
  const youtube = await getInnertubeInstance();
  const feed = await youtube.getPlaylist(request.apiId);
  const videos = feed.items
    .filter(
      (
        i
      ): i is Exclude<
        typeof i,
        | PlaylistPanelVideo
        | WatchCardCompactVideo
        | ReelItem
        | ShortsLockupView
      > => "id" in i && "author" in i
    )
    .map(
      (i): Video => ({
        apiId: i.id,
        title: i.title.toString(),
        duration: getDurationSeconds(i.duration),
        channelName: i.author.name,
        channelApiId: i.author.id,
        images: i.thumbnails,
      })
    );

  const pageInfo: PageInfo = {
    resultsPerPage: videos.length,
    offset: 0,
  };

  const playlist: PlaylistInfo = {
    name: feed.info.title ?? "",
    apiId: request.apiId,
    images: feed.info.thumbnails ?? [],
  };

  return {
    items: videos,
    pageInfo,
    playlist,
  };
};

export const searchVideosInnertube = async (
  request: SearchRequest
): Promise<SearchVideoResult> => {
  const youtube = await getInnertubeInstance();
  const response = await youtube.search(request.query, {
    type: "video",
  });
  const videos = response.videos
    .filter(
      (
        i
      ): i is Exclude<
        typeof i,
        | ShortsLockupView
        | PlaylistPanelVideo
        | WatchCardCompactVideo
        | ReelItem
        | ShortsLockupView
      > => "id" in i && "author" in i
    )
    .map(
      (i): Video => ({
        apiId: i.id,
        title: i.title.toString(),
        duration: getDurationSeconds(i.duration),
        channelName: i.author.name,
        channelApiId: i.author.id,
        images: i.thumbnails,
      })
    );

  const pageInfo: PageInfo = {
    resultsPerPage: videos.length,
    offset: 0,
  };

  return {
    items: videos,
    pageInfo,
  };
};

export const searchChannelsInnertube = async (
  request: SearchRequest
): Promise<SearchChannelResult> => {
  const youtube = await getInnertubeInstance();
  const response = await youtube.search(request.query, {
    type: "channel",
  });
  const channels = response.channels.map(
    (c): Channel => ({
      apiId: c.id,
      name: c.author.name,
      images: c.author.thumbnails,
    })
  );

  const pageInfo: PageInfo = {
    resultsPerPage: channels.length,
    offset: 0,
  };

  return {
    items: channels,
    pageInfo,
  };
};

export const searchPlaylistsInnertube = async (
  request: SearchRequest
): Promise<SearchPlaylistResult> => {
  const youtube = await getInnertubeInstance();
  const response = await youtube.search(request.query, {
    type: "playlist",
  });
  const playlists = response.playlists
    .filter(
      (i): i is Exclude<typeof i, LockupView> => "id" in i && "author" in i
    )
    .map(
      (p): PlaylistInfo => ({
        apiId: p.id,
        name: p.title.toString(),
        images: p.thumbnails,
      })
    );

  const pageInfo: PageInfo = {
    resultsPerPage: playlists.length,
    offset: 0,
  };

  return {
    items: playlists,
    pageInfo,
  };
};
