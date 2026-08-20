import { describe, it, expect } from "vitest";
import {
  getLockupAuthor,
  getLockupChannelImages,
  getLockupDuration,
  getLockupStats,
  lockupToPlaylistInfo,
  lockupToVideo,
  parseDurationText,
  parseRelativeDate,
  parseViewCount,
} from "../src/lockup";

/**
 * Fixtures mirror the shapes YouTube actually returns, captured from a channel
 * video tab, a playlist page and playlist search. `lockup.ts` only imports
 * youtubei.js for types, so plain objects carrying a `type` are enough.
 */

const text = (content: string, browseId?: string) => ({
  toString: () => content,
  runs: [browseId ? { text: content, endpoint: { payload: { browseId } } } : { text: content }],
});

const thumbnails = [
  { url: "https://i.ytimg.com/vi/abc/hq.jpg", width: 336, height: 188 },
];

const avatar = [
  { url: "https://yt3.ggpht.com/avatar=s68", width: 68, height: 68 },
];

const decoratedAvatar = {
  type: "DecoratedAvatarView",
  avatar: { type: "AvatarView", image: avatar },
};

const avatarStack = {
  type: "AvatarStackView",
  avatars: [
    { type: "AvatarView", image: avatar },
    { type: "AvatarView", image: [{ url: "other", width: 68, height: 68 }] },
  ],
};

const thumbnailView = (duration?: string) => ({
  type: "ThumbnailView",
  image: thumbnails,
  overlays: duration
    ? [
        {
          type: "ThumbnailBottomOverlayView",
          badges: [
            { type: "ThumbnailBadgeView", text: "Now playing" },
            { type: "ThumbnailBadgeView", text: duration },
          ],
        },
      ]
    : [],
});

const lockup = (options: {
  contentType: string;
  id: string;
  title: string;
  rows?: unknown[];
  duration?: string;
  collection?: boolean;
  image?: unknown;
}) =>
  ({
    type: "LockupView",
    content_type: options.contentType,
    content_id: options.id,
    metadata: {
      type: "LockupMetadataView",
      title: text(options.title),
      image: options.image,
      metadata: {
        type: "ContentMetadataView",
        metadata_rows: options.rows ?? [],
      },
    },
    content_image: options.collection
      ? {
          type: "CollectionThumbnailView",
          primary_thumbnail: thumbnailView(options.duration),
        }
      : thumbnailView(options.duration),
  }) as any;

/** A channel's own video tab: the first row is view count, not the author. */
const channelTabVideo = lockup({
  contentType: "VIDEO",
  id: "XVFUtEh9zrY",
  title: "summer lofi",
  duration: "1:01:01",
  rows: [
    { metadata_parts: [{ text: text("310K views") }, { text: text("2 weeks ago") }] },
  ],
});

/** A playlist page: the first row is the author and links to the channel. */
const playlistPageVideo = lockup({
  contentType: "VIDEO",
  id: "1oahTaVIQvk",
  title: "Floating City",
  duration: "2:03:14",
  image: decoratedAvatar,
  rows: [
    { metadata_parts: [{ text: text("the bootleg boy", "UC0fiLCwTmAukotCXYnqfj0A") }] },
    { metadata_parts: [{ text: text("4.4M views") }, { text: text("4 years ago") }] },
  ],
});

describe("getLockupChannelImages", () => {
  it("reads the avatar off a plain video lockup", () => {
    expect(getLockupChannelImages(playlistPageVideo)).toEqual(avatar);
  });

  it("credits the first channel when several share a stack", () => {
    const collab = lockup({
      contentType: "VIDEO",
      id: "x",
      title: "collab",
      image: avatarStack,
    });
    expect(getLockupChannelImages(collab)).toEqual(avatar);
  });

  it("returns nothing when the lockup carries no avatar", () => {
    expect(getLockupChannelImages(channelTabVideo)).toEqual([]);
  });
});

describe("parseViewCount", () => {
  it("expands the abbreviations YouTube renders", () => {
    expect(parseViewCount("4K views")).toBe(4000);
    expect(parseViewCount("67K views")).toBe(67_000);
    expect(parseViewCount("1.2M views")).toBe(1_200_000);
    expect(parseViewCount("2.5B views")).toBe(2_500_000_000);
  });

  it("reads unabbreviated counts, separators and all", () => {
    expect(parseViewCount("1,234 views")).toBe(1234);
    expect(parseViewCount("1 view")).toBe(1);
  });

  it("yields nothing for text that isn't a view count", () => {
    expect(parseViewCount("3 hours ago")).toBeUndefined();
    expect(parseViewCount("the bootleg boy")).toBeUndefined();
    expect(parseViewCount("No views")).toBeUndefined();
    expect(parseViewCount(undefined)).toBeUndefined();
  });
});

describe("parseRelativeDate", () => {
  const now = Date.parse("2026-08-20T12:00:00.000Z");

  it("walks back from now by the stated amount", () => {
    expect(parseRelativeDate("3 hours ago", now)).toBe(
      "2026-08-20T09:00:00.000Z"
    );
    expect(parseRelativeDate("1 day ago", now)).toBe(
      "2026-08-19T12:00:00.000Z"
    );
    expect(parseRelativeDate("2 weeks ago", now)).toBe(
      "2026-08-06T12:00:00.000Z"
    );
  });

  it("handles the streamed and premiered prefixes", () => {
    expect(parseRelativeDate("Streamed 3 hours ago", now)).toBe(
      "2026-08-20T09:00:00.000Z"
    );
    expect(parseRelativeDate("Premiered 1 day ago", now)).toBe(
      "2026-08-19T12:00:00.000Z"
    );
  });

  it("yields nothing rather than guessing at unfamiliar text", () => {
    expect(parseRelativeDate("310K views", now)).toBeUndefined();
    expect(parseRelativeDate("il y a 3 heures", now)).toBeUndefined();
    expect(parseRelativeDate(undefined, now)).toBeUndefined();
  });
});

describe("getLockupStats", () => {
  const now = Date.parse("2026-08-20T12:00:00.000Z");

  it("finds stats in the second row, as a feed lays them out", () => {
    expect(getLockupStats(playlistPageVideo, now)).toEqual({
      views: 4_400_000,
      uploadDate: "2022-08-21T12:00:00.000Z",
    });
  });

  it("finds them in the first row too, as a channel page lays them out", () => {
    expect(getLockupStats(channelTabVideo, now)).toEqual({
      views: 310_000,
      uploadDate: "2026-08-06T12:00:00.000Z",
    });
  });

  it("returns nothing when no row carries stats", () => {
    expect(
      getLockupStats(lockup({ contentType: "VIDEO", id: "x", title: "y" }), now)
    ).toEqual({});
  });
});

describe("parseDurationText", () => {
  it("parses hours, minutes and seconds", () => {
    expect(parseDurationText("1:01:01")).toBe(3661);
    expect(parseDurationText("12:34")).toBe(754);
  });

  it("ignores text that isn't a duration", () => {
    expect(parseDurationText("Now playing")).toBe(0);
    expect(parseDurationText("310K views")).toBe(0);
    expect(parseDurationText("4")).toBe(0);
    expect(parseDurationText(undefined)).toBe(0);
  });
});

describe("getLockupDuration", () => {
  it("picks the duration badge out from among other badges", () => {
    expect(getLockupDuration(channelTabVideo)).toBe(3661);
  });

  it("returns 0 when there is no badge, as for a live stream", () => {
    expect(
      getLockupDuration(lockup({ contentType: "VIDEO", id: "x", title: "live" }))
    ).toBe(0);
  });
});

describe("getLockupAuthor", () => {
  it("reads the author and channel id from the linked row", () => {
    expect(getLockupAuthor(playlistPageVideo)).toEqual({
      channelName: "the bootleg boy",
      channelApiId: "UC0fiLCwTmAukotCXYnqfj0A",
    });
  });

  it("does not mistake a view-count row for the author", () => {
    expect(getLockupAuthor(channelTabVideo)).toEqual({});
  });
});

describe("lockupToVideo", () => {
  it("maps a video lockup", () => {
    expect(lockupToVideo(playlistPageVideo)).toEqual({
      apiId: "1oahTaVIQvk",
      title: "Floating City",
      duration: 7394,
      channelName: "the bootleg boy",
      channelApiId: "UC0fiLCwTmAukotCXYnqfj0A",
      images: thumbnails,
      channelImages: avatar,
      views: 4_400_000,
      uploadDate: expect.any(String),
    });
  });

  it("falls back to the channel being browsed when the lockup omits it", () => {
    const video = lockupToVideo(channelTabVideo, {
      channelName: "Lofi Girl",
      channelApiId: "UCSJ4gkVC6NrvII8umztf0Ow",
    });
    expect(video).toMatchObject({
      apiId: "XVFUtEh9zrY",
      duration: 3661,
      channelName: "Lofi Girl",
      channelApiId: "UCSJ4gkVC6NrvII8umztf0Ow",
    });
  });

  it("skips lockups that aren't videos", () => {
    expect(
      lockupToVideo(lockup({ contentType: "PLAYLIST", id: "PL1", title: "mix" }))
    ).toBeNull();
  });
});

describe("lockupToPlaylistInfo", () => {
  it("maps a playlist lockup, unwrapping the collection thumbnail", () => {
    const playlist = lockup({
      contentType: "PLAYLIST",
      id: "PLOzDu",
      title: "Chill Lofi Beats",
      collection: true,
    });
    expect(lockupToPlaylistInfo(playlist)).toEqual({
      apiId: "PLOzDu",
      name: "Chill Lofi Beats",
      images: thumbnails,
    });
  });

  it("accepts podcasts, which search returns alongside playlists", () => {
    const podcast = lockup({
      contentType: "PODCAST",
      id: "PLpod",
      title: "A Podcast",
      collection: true,
    });
    expect(lockupToPlaylistInfo(podcast)?.apiId).toBe("PLpod");
  });

  it("skips lockups that aren't playlists", () => {
    expect(lockupToPlaylistInfo(channelTabVideo)).toBeNull();
  });
});
