import {
  IBrowseResponse,
  Innertube,
  Mixins,
  Endpoints,
} from "youtubei.js/web.bundle";
import type {
  PlaylistPanelVideo,
  ReelItem,
  WatchCardCompactVideo,
} from "youtubei.js/dist/src/parser/nodes";

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
        ReelItem | PlaylistPanelVideo | WatchCardCompactVideo
      > => "thumbnails" in v && "author" in v
    )
    .map(
      (v): Video => ({
        apiId: v.id,
        title: v.title.toString(),
        duration: v.duration.seconds,
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
    Endpoints.BrowseEndpoint.PATH,
    {
      ...Endpoints.BrowseEndpoint.build({ browse_id: "FEchannels" }),
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
  const channelId: string = accountInfo.footers?.endpoint.payload.browseId;
  const channel = await youtube.getChannel(channelId);
  if (channel.has_playlists) {
    const playlistChannel = await channel.getPlaylists();
    const playlists = playlistChannel.playlists.map(
      (p): PlaylistInfo => ({
        name: p.title.toString(),
        apiId: p.id,
        images: p.thumbnails,
      })
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
        PlaylistPanelVideo | WatchCardCompactVideo | ReelItem
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
