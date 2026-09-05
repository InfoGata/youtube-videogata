import {
  Constants,
  Helpers,
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
import {
  isLockupView,
  LockupAuthor,
  lockupToPlaylistInfo,
  lockupToVideo,
  parseRelativeDate,
  parseViewCount,
} from "./lockup";
import { SABR_DATA_KEY, SabrData, storage } from "./shared";

type AccountItem = YTNodes.AccountItem;
type CompactVideo = YTNodes.CompactVideo;

const getDurationSeconds = (duration: any): number => {
  if (!duration) return 0;
  if (typeof duration === "object" && "seconds" in duration) {
    return duration.seconds ?? 0;
  }
  return 0;
};

type NodeText = { text?: string; toString: () => string };

/** The pre-lockup renderer nodes: `Video`, `CompactVideo`, `PlaylistVideo`, … */
type LegacyVideoNode = {
  id: string;
  title: { toString: () => string };
  duration?: unknown;
  author: { name?: string; id?: string; thumbnails?: ImageInfo[] };
  thumbnails?: ImageInfo[];
  /** `Video` exposes a numeric-ish count; `ReelItem` only the short form. */
  view_count?: NodeText;
  short_view_count?: NodeText;
  views?: NodeText;
  published?: NodeText;
};

/** These nodes carry view counts as rendered text, same as lockups do. */
const legacyViews = (node: LegacyVideoNode): number | undefined => {
  for (const candidate of [node.view_count, node.short_view_count, node.views]) {
    const views = parseViewCount(candidate?.text ?? candidate?.toString());
    if (views !== undefined) return views;
  }
  return undefined;
};

const asLegacyVideo = (node: Helpers.YTNode): LegacyVideoNode | null => {
  const candidate = node as unknown as Partial<LegacyVideoNode>;
  if (typeof candidate.id !== "string" || !candidate.author || !candidate.title)
    return null;
  return candidate as LegacyVideoNode;
};

/**
 * `Feed#playlists` gained `LockupView` support upstream, but `Feed#videos` and
 * `Playlist#items` still collect only the legacy renderer nodes, so a fully
 * migrated page looks empty through them. Pull the video lockups off the feed's
 * memo instead. Non-video lockups on the page (related playlists and the like)
 * come along too and get dropped by `lockupToVideo`.
 */
const withVideoLockups = (
  nodes: Helpers.YTNode[],
  feed: { memo?: Helpers.Memo }
): Helpers.YTNode[] => {
  const lockups = feed.memo?.getType?.(YTNodes.LockupView) ?? [];
  return lockups.length > 0 ? [...nodes, ...lockups] : nodes;
};

/**
 * Feeds return either the legacy renderer nodes or the newer `LockupView`, and
 * a single response can mix the two, so every video list goes through here.
 */
const toVideos = (
  nodes: Helpers.YTNode[],
  fallback: LockupAuthor = {}
): Video[] =>
  nodes
    .map((node): Video | null => {
      if (isLockupView(node)) return lockupToVideo(node, fallback);
      const legacy = asLegacyVideo(node);
      if (!legacy) return null;
      return {
        apiId: legacy.id,
        title: legacy.title.toString(),
        duration: getDurationSeconds(legacy.duration),
        channelName: legacy.author.name,
        channelApiId: legacy.author.id,
        images: legacy.thumbnails ?? [],
        channelImages: legacy.author.thumbnails ?? [],
        views: legacyViews(legacy),
        uploadDate: parseRelativeDate(
          legacy.published?.text ?? legacy.published?.toString()
        ),
      };
    })
    .filter((video): video is Video => video !== null);

const toPlaylistInfos = (nodes: Helpers.YTNode[]): PlaylistInfo[] =>
  nodes
    .map((node): PlaylistInfo | null => {
      if (isLockupView(node)) return lockupToPlaylistInfo(node);
      if ("id" in node && "title" in node && "thumbnails" in node) {
        const legacy = node as unknown as {
          id: string;
          title: { toString: () => string };
          thumbnails?: ImageInfo[];
        };
        return {
          apiId: legacy.id,
          name: legacy.title.toString(),
          images: legacy.thumbnails ?? [],
        };
      }
      return null;
    })
    .filter((playlist): playlist is PlaylistInfo => playlist !== null);

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

const CONSENT_COOKIE = "CONSENT=YES+";
const YOUTUBE_ORIGIN = "https://www.youtube.com";

/**
 * youtubei.js signs InnerTube calls with `Authorization: SAPISIDHASH`, a hash
 * taken over `https://www.youtube.com`. YouTube only honours that signature
 * when it can see the matching origin, and the real `Origin` header never
 * survives the trip out (the extension strips its own, and `Origin` can't be
 * set from fetch anyway) -- so the signature is ignored and every response
 * comes back logged out, no matter how good the cookie is. `X-Origin` states
 * the origin explicitly, which is exactly what the YouTube web client sends
 * alongside its own SAPISIDHASH. youtubei.js sets `Authorization` and
 * `X-Goog-Authuser` but not this one, so we add it here.
 */
const innertubeFetch: typeof application.networkRequest = (input, init) => {
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined)
  );
  headers.set("X-Origin", YOUTUBE_ORIGIN);
  return application.networkRequest(input, { ...init, headers });
};

/**
 * The cookie string handed to youtubei.js.
 *
 * The `Cookie` header the library then sets on each request is dropped by fetch
 * as a forbidden header, and that's fine: the live session cookies are attached
 * by the browser itself, because VideoGata asks the extension to send our
 * `siteMatch` requests with credentials. What this string is actually for is
 * `SAPISID` — youtubei.js reads it to derive a fresh `Authorization:
 * SAPISIDHASH` per request, which is what makes InnerTube treat us as signed
 * in. Deriving it per request is also why we capture the cookie at login rather
 * than a ready-made `Authorization` header, which would go stale.
 */
const buildCookie = async (): Promise<string> => {
  try {
    const headers = await application.getAuthHeaders("www.youtube.com");
    const cookie = headers["Cookie"] ?? headers["cookie"];
    if (cookie) {
      return `${cookie}; ${CONSENT_COOKIE}`;
    }
  } catch {
    // An older VideoGata without getAuthHeaders just means a signed-out session.
  }
  return CONSENT_COOKIE;
};

let instance: Innertube | undefined;
const getInnertubeInstance = async (): Promise<Innertube> => {
  if (!instance) {
    instance = await Innertube.create({
      fetch: innertubeFetch,
      cookie: await buildCookie(),
    });
  }
  return instance;
};

/**
 * Drops the memoized session so the next call rebuilds it. The session's
 * cookie is fixed at creation, so signing in or out has to start a new one.
 */
export const resetInnertubeInstance = () => {
  instance = undefined;
};

export const getInnertubeInstanceExported = getInnertubeInstance;

export const getTopItemsInnertube = async (): Promise<SearchAllResult> => {
  const youtube = await getInnertubeInstance();
  const home = await youtube.getHomeFeed();

  const videos = toVideos(withVideoLockups(home.videos, home));
  return {
    videos: {
      items: videos,
    },
  };
};

/**
 * The signed-in user's own YouTube home feed. Returns nothing when there's no
 * signed-in session, which tells VideoGata to fall back to the top items.
 */
export const getUserFeedInnertube = async (): Promise<SearchVideoResult> => {
  if (!(await application.isLoggedIn())) {
    return { items: [] };
  }

  const youtube = await getInnertubeInstance();
  const home = await youtube.getHomeFeed();

  return { items: toVideos(withVideoLockups(home.videos, home)) };
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

/**
 * YouTube only sends abbreviated counts on comments ("204K", "1.2M"), so
 * expand them back into the numbers the app expects.
 */
const parseCommentCount = (value?: string): number => {
  if (!value) return 0;
  const match = /([\d.,]+)\s*([KMB])?/i.exec(value);
  if (!match) return 0;
  const amount = parseFloat(match[1].replace(/,/g, ""));
  if (Number.isNaN(amount)) return 0;
  const multipliers: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };
  return Math.round(amount * (multipliers[match[2]?.toLowerCase() ?? ""] ?? 1));
};

/**
 * A continuation item either carries its token directly or hides it behind a
 * "Load more" button, which takes precedence when present.
 */
const getContinuationToken = (
  item?: YTNodes.ContinuationItem
): string | undefined => {
  const endpoint = item?.button?.endpoint ?? item?.endpoint;
  return endpoint?.payload?.token;
};

interface CommentThreadPage {
  threads: YTNodes.CommentThread[];
  continuation?: string;
}

/**
 * Top level comments and replies come back in the same shape: response
 * endpoints holding comment threads followed by a continuation item.
 */
const toCommentThreadPage = (
  endpoints?: Helpers.ObservedArray<Helpers.YTNode>
): CommentThreadPage => {
  const threads: YTNodes.CommentThread[] = [];
  let continuation: string | undefined;

  for (const endpoint of endpoints ?? []) {
    const contents = (
      endpoint as { contents?: Helpers.ObservedArray<Helpers.YTNode> }
    ).contents;
    if (!contents) continue;

    threads.push(...contents.filterType(YTNodes.CommentThread));
    continuation ??= getContinuationToken(
      contents.firstOfType(YTNodes.ContinuationItem)
    );
  }

  return { threads, continuation };
};

const getCommentContinuation = async (
  youtube: Innertube,
  continuation: string
): Promise<CommentThreadPage> => {
  const response = await youtube.actions.execute("/next", {
    continuation,
    parse: true,
  });
  return toCommentThreadPage(response.on_response_received_endpoints);
};

const toVideoComment = (
  thread: YTNodes.CommentThread,
  videoApiId: string
): VideoComment => {
  const comment = thread.comment;
  return {
    apiId: comment?.comment_id ?? "",
    videoCommentId: videoApiId,
    content: comment?.content?.toString() ?? "",
    author: comment?.author?.name ?? "",
    images: comment?.author?.thumbnails ?? [],
    likes: parseCommentCount(comment?.like_count),
    replyCount: parseCommentCount(comment?.reply_count),
    // Replies are only reachable through the token handed out with the parent.
    replyPage: getContinuationToken(
      thread.comment_replies_data?.sub_threads?.firstOfType(
        YTNodes.ContinuationItem
      )
    ),
  };
};

const emptyCommentsResult = (): VideoCommentsResult => ({
  comments: [],
  pageInfo: {
    resultsPerPage: 0,
    offset: 0,
  },
});

const toVideoCommentsResult = (
  page: CommentThreadPage,
  videoApiId: string,
  offset: number
): VideoCommentsResult => {
  const comments = page.threads.map((thread) =>
    toVideoComment(thread, videoApiId)
  );

  return {
    comments,
    pageInfo: {
      resultsPerPage: comments.length,
      offset,
      nextPage: page.continuation,
    },
  };
};

export const getVideoCommentsInnertube = async (
  request: VideoCommentsRequest
): Promise<VideoCommentsResult> => {
  const videoApiId = request.apiId;
  if (!videoApiId) {
    return emptyCommentsResult();
  }

  try {
    const youtube = await getInnertubeInstance();
    const continuation = request.pageInfo?.nextPage;
    const page = continuation
      ? await getCommentContinuation(youtube, continuation)
      : toCommentThreadPage(
          (await youtube.getComments(videoApiId)).page
            .on_response_received_endpoints
        );

    return toVideoCommentsResult(
      page,
      videoApiId,
      request.pageInfo?.offset ?? 0
    );
  } catch (e) {
    console.error("Failed to get comments for video", videoApiId, e);
    return emptyCommentsResult();
  }
};

export const getCommentRepliesInnertube = async (
  request: CommentReplyRequest
): Promise<VideoCommentsResult> => {
  const continuation = request.pageInfo?.nextPage;
  if (!continuation) {
    return emptyCommentsResult();
  }

  try {
    const youtube = await getInnertubeInstance();
    const page = await getCommentContinuation(youtube, continuation);

    return toVideoCommentsResult(
      page,
      request.videoApiId ?? "",
      request.pageInfo?.offset ?? 0
    );
  } catch (e) {
    console.error("Failed to get replies for comment", request.commentApiId, e);
    return emptyCommentsResult();
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

  // A channel's own video tab omits the author from each lockup, so supply the
  // channel being browsed.
  const videos = toVideos(withVideoLockups(videosTab.videos, videosTab), {
    channelName: channel.metadata?.title,
    channelApiId: request.apiId,
  });

  const pageInfo: PageInfo = {
    resultsPerPage: videos.length,
    offset: 0,
  };

  return {
    items: videos,
    pageInfo,
  };
};

export const searchChannelVideosInnertube = async (
  request: ChannelSearchRequest
): Promise<SearchVideoResult> => {
  const emptyResult: SearchVideoResult = {
    items: [],
    pageInfo: { resultsPerPage: 0, offset: 0 },
  };
  if (!request.apiId) {
    return emptyResult;
  }

  const youtube = await getInnertubeInstance();
  const channel = await youtube.getChannel(request.apiId);
  // Not every channel exposes a search tab.
  if (!channel.has_search) {
    return emptyResult;
  }

  const results = await channel.search(request.query);

  // Results from within a channel omit the author from each lockup, so supply
  // the channel being searched.
  const videos = toVideos(withVideoLockups(results.videos, results), {
    channelName: channel.metadata?.title,
    channelApiId: request.apiId,
  });

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
    const playlists = toPlaylistInfos(playlistChannel.playlists);

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
  const videos = toVideos(withVideoLockups(feed.items, feed));

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
  const videos = toVideos(withVideoLockups(response.videos, response));

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
  const playlists = toPlaylistInfos(response.playlists);

  const pageInfo: PageInfo = {
    resultsPerPage: playlists.length,
    offset: 0,
  };

  return {
    items: playlists,
    pageInfo,
  };
};
