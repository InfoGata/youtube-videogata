import {
  IBrowseResponse,
  Innertube,
  Mixins,
  YTNodes,
} from "youtubei.js";

type AccountItem = YTNodes.AccountItem;
type AccountItemSection = YTNodes.AccountItemSection;
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

type SearchAllResult = {
  videos?: SearchVideoResult;
};

type SearchVideoResult = {
  items: Video[];
};

type SearchChannelResult = {
  items: Channel[];
};

type SearchPlaylistResult = {
  items: PlaylistInfo[];
};

type PlaylistVideosResult = {
  items: Video[];
};

type Video = {
  apiId: string;
  title: string;
  duration: number;
  channelName: string;
  channelApiId: string;
  images: any[];
};

type Channel = {
  apiId: string;
  name: string;
  images: any[];
};

type PlaylistInfo = {
  apiId: string;
  name: string;
  images: any[];
};

type UserChannelRequest = any;
type UserPlaylistRequest = any;
type PlaylistVideoRequest = {
  apiId?: string;
  isUserPlaylist: boolean;
};
type SearchRequest = {
  query: string;
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

export const getTopInnerTubeItems = async (): Promise<SearchAllResult> => {
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

export const getUserChannelsInnerTube = async (
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
  return {
    items: channels,
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

    return {
      items: playlists,
    };
  }

  return {
    items: [],
  };
};

export const getPlaylistVideosInnertube = async (
  request: PlaylistVideoRequest
): Promise<PlaylistVideosResult> => {
  if (!request.apiId) {
    return {
      items: [],
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
        duration: i.duration.seconds,
        channelName: i.author.name,
        channelApiId: i.author.id,
        images: i.thumbnails,
      })
    );

  return {
    items: videos,
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
  return {
    items: videos,
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
  return {
    items: channels,
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
  return {
    items: playlists,
  };
};

