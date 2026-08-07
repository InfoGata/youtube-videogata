import { describe, it, expect } from "vitest";
import {
  getLockupAuthor,
  getLockupDuration,
  lockupToPlaylistInfo,
  lockupToVideo,
  parseDurationText,
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
}) =>
  ({
    type: "LockupView",
    content_type: options.contentType,
    content_id: options.id,
    metadata: {
      type: "LockupMetadataView",
      title: text(options.title),
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
  rows: [
    { metadata_parts: [{ text: text("the bootleg boy", "UC0fiLCwTmAukotCXYnqfj0A") }] },
    { metadata_parts: [{ text: text("4.4M views") }, { text: text("4 years ago") }] },
  ],
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
