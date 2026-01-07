import {
  IBrowseResponse,
  Innertube,
  Mixins,
  YTNodes,
} from "youtubei.js";

type AccountItem = YTNodes.AccountItem;
type CompactVideo = YTNodes.CompactVideo;
type LockupView = YTNodes.LockupView;
type PlaylistPanelVideo = YTNodes.PlaylistPanelVideo;
type ReelItem = YTNodes.ReelItem;
type ShortsLockupView = YTNodes.ShortsLockupView;
type WatchCardCompactVideo = YTNodes.WatchCardCompactVideo;

const getDurationSeconds = (duration: any): number => {
  if (!duration) return 0;
  if (typeof duration === 'object' && 'seconds' in duration) {
    return duration.seconds ?? 0;
  }
  return 0;
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

export const getTopItemsInnertube = async (): Promise<SearchAllResult> => {
  const youtube = await getInnertubeInstance();
  const home = await youtube.getHomeFeed();

  const videos = home.videos
    .filter(
      (
        v
      ): v is Exclude<
        typeof v,
        ReelItem | PlaylistPanelVideo | WatchCardCompactVideo | ShortsLockupView
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
  const youtube = await getInnertubeInstance();
  const info = await youtube.getInfo(apiId);
  const basicInfo = info.basic_info;
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

  const video: Video = {
    title: basicInfo.title ?? "",
    apiId: apiId,
    sources: info.streaming_data?.hls_manifest_url
      ? [{ source: info.streaming_data.hls_manifest_url, type: "application/x-mpegURL" }]
      : [],
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
  return video;
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
    // Comments may not be available for all videos
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
      (v): v is Exclude<typeof v, ReelItem | PlaylistPanelVideo | WatchCardCompactVideo | ShortsLockupView> =>
        "id" in v && "author" in v
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
  const response = await youtube.actions.execute(
    "/browse",
    {
      browseId: "FEchannels",
      parse: true,
    }
  );
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
  const channelId: string = accountInfo.contents?.as(
    YTNodes.AccountItemSection
  )?.contents.find(
    (c): c is AccountItem => c.type === "channel"
  )?.channel_handle.endpoint?.payload.browseId;
  const channel = await youtube.getChannel(channelId);
  if (channel.has_playlists) {
    const playlistChannel = await channel.getPlaylists();
    const playlists = playlistChannel.playlists.map(
      (p): PlaylistInfo => {
        if ('title' in p && 'id' in p && 'thumbnails' in p) {
          return {
            name: p.title.toString(),
            apiId: p.id,
            images: p.thumbnails,
          };
        }
        // Handle LockupView case
        return {
          name: '',
          apiId: '',
          images: [],
        };
      }
    );

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
        PlaylistPanelVideo | WatchCardCompactVideo | ReelItem | ShortsLockupView
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
      (i): i is Exclude<typeof i, ShortsLockupView | PlaylistPanelVideo | WatchCardCompactVideo | ReelItem | ShortsLockupView> => "id" in i && "author" in i
    )
    .map((i): Video => ({
      apiId: i.id,
      title: i.title.toString(),
      duration: getDurationSeconds(i.duration),
      channelName: i.author.name,
      channelApiId: i.author.id,
      images: i.thumbnails,
    }));

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

