import type { Helpers, YTNodes } from "youtubei.js";

type YTNode = Helpers.YTNode;
type LockupView = YTNodes.LockupView;
type ThumbnailView = YTNodes.ThumbnailView;

/**
 * YouTube is migrating its feeds from `videoRenderer`/`playlistRenderer` to
 * `lockupViewModel`, which youtubei.js parses into `LockupView`. A `LockupView`
 * exposes none of the `id`/`author`/`thumbnails` properties the older nodes did,
 * so guards written against those silently drop every lockup — which is how
 * channel pages, playlists and playlist search ended up returning nothing.
 *
 * These helpers pull the same fields back out of a lockup. Channel pages and
 * playlists are fully migrated; search still returns the legacy nodes, so both
 * shapes have to keep working.
 */

/**
 * youtubei.js offers `node.is(SomeClass)` for this, but comparing the type
 * string is the same check it makes internally and keeps these helpers working
 * wherever the library is mocked or a node turns up as plain data.
 */
const isNode = <T extends YTNode>(
  node: YTNode | null | undefined,
  type: string
): node is T => node?.type === type;

export const isLockupView = (node: YTNode): node is LockupView =>
  isNode(node, "LockupView");

/** Durations always render as `M:SS`, `MM:SS` or `H:MM:SS`. */
const DURATION_PATTERN = /^\d+(:[0-5]\d)+$/;

/** `"1:01:01"` -> `3661`. Returns 0 for text that isn't a duration. */
export const parseDurationText = (text?: string | null): number => {
  const trimmed = text?.trim();
  if (!trimmed || !DURATION_PATTERN.test(trimmed)) return 0;
  return trimmed
    .split(":")
    .reduce((total, part) => total * 60 + Number(part), 0);
};

/**
 * Video lockups carry the thumbnail directly; playlist and podcast lockups nest
 * it inside a collection (the stacked-cards look).
 */
const getThumbnailView = (lockup: LockupView): ThumbnailView | null => {
  const image = lockup.content_image;
  if (isNode<ThumbnailView>(image, "ThumbnailView")) return image;
  if (isNode<YTNodes.CollectionThumbnailView>(image, "CollectionThumbnailView"))
    return image.primary_thumbnail ?? null;
  return null;
};

export const getLockupImages = (lockup: LockupView): ImageInfo[] =>
  getThumbnailView(lockup)?.image ?? [];

/**
 * The channel avatar shown beside the title. A plain video lockup carries a
 * single decorated avatar; surfaces that can credit several channels (a
 * collaboration, a mix) carry a stack instead, and the first is the one the
 * card is attributed to.
 */
export const getLockupChannelImages = (lockup: LockupView): ImageInfo[] => {
  const image = lockup.metadata?.image;
  if (isNode<YTNodes.DecoratedAvatarView>(image, "DecoratedAvatarView"))
    return image.avatar?.image ?? [];
  if (isNode<YTNodes.AvatarStackView>(image, "AvatarStackView"))
    return image.avatars?.[0]?.image ?? [];
  return [];
};

/**
 * The duration sits in a thumbnail badge, sharing space with non-duration
 * badges ("Now playing", "4K", …), so match on the text rather than position.
 */
export const getLockupDuration = (lockup: LockupView): number => {
  for (const overlay of getThumbnailView(lockup)?.overlays ?? []) {
    const badges = isNode<YTNodes.ThumbnailBottomOverlayView>(
      overlay,
      "ThumbnailBottomOverlayView"
    )
      ? overlay.badges
      : isNode<YTNodes.ThumbnailOverlayBadgeView>(
            overlay,
            "ThumbnailOverlayBadgeView"
          )
        ? overlay.badges
        : [];
    for (const badge of badges ?? []) {
      const seconds = parseDurationText(badge.text);
      if (seconds) return seconds;
    }
  }
  return 0;
};

/**
 * Feeds only ever carry the *rendered* view count and publish date -- "4K
 * views", "3 hours ago" -- so these have to be read back out of display text.
 * That makes them locale-dependent, unlike the structural checks elsewhere in
 * this file. The session doesn't set a language, so youtubei.js asks for `en`
 * and these patterns hold; anything they don't recognise yields undefined, so a
 * different locale loses the metadata rather than inventing a wrong number.
 */
const VIEW_COUNT_PATTERN = /^([\d.,]+)\s*([KMB])?\s+views?$/i;

const VIEW_MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  m: 1e6,
  b: 1e9,
};

/** `"4K views"` -> `4000`. Undefined for text that isn't a view count. */
export const parseViewCount = (text?: string | null): number | undefined => {
  const match = VIEW_COUNT_PATTERN.exec(text?.trim() ?? "");
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) return undefined;
  const multiplier = match[2] ? VIEW_MULTIPLIERS[match[2].toLowerCase()] : 1;
  return Math.round(amount * multiplier);
};

/** Also matches "Streamed 3 days ago" and "Premiered 2 weeks ago". */
const RELATIVE_DATE_PATTERN =
  /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i;

const RELATIVE_DATE_MS: Record<string, number> = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

/**
 * `"3 hours ago"` -> an ISO timestamp three hours back. Approximate by nature,
 * which is fine: the app renders it straight back as a relative time, so it
 * round-trips to the string YouTube showed.
 */
export const parseRelativeDate = (
  text?: string | null,
  now: number = Date.now()
): string | undefined => {
  const match = RELATIVE_DATE_PATTERN.exec(text?.trim() ?? "");
  if (!match) return undefined;
  const unit = RELATIVE_DATE_MS[match[2].toLowerCase()];
  if (!unit) return undefined;
  return new Date(now - Number(match[1]) * unit).toISOString();
};

export interface LockupStats {
  views?: number;
  uploadDate?: string;
}

/**
 * Which row holds the stats varies by surface -- second row in a feed, first on
 * a channel page -- so every part gets tried rather than trusting a position.
 */
export const getLockupStats = (
  lockup: LockupView,
  now: number = Date.now()
): LockupStats => {
  const stats: LockupStats = {};
  for (const row of lockup.metadata?.metadata?.metadata_rows ?? []) {
    for (const part of row.metadata_parts ?? []) {
      const text = part.text?.toString();
      if (!text) continue;
      stats.views ??= parseViewCount(text);
      stats.uploadDate ??= parseRelativeDate(text, now);
    }
  }
  return stats;
};

export interface LockupAuthor {
  channelName?: string;
  channelApiId?: string;
}

/**
 * Metadata rows differ by surface: on a playlist the first row is the author,
 * on a channel page it's the view count (the author being implicit there). The
 * author row is the one holding a single part that links to a channel, which
 * distinguishes it without having to match localised "views"/"ago" strings.
 *
 * Returns nothing when no row qualifies, leaving the caller to fall back to a
 * channel it already knows about.
 */
export const getLockupAuthor = (lockup: LockupView): LockupAuthor => {
  const rows = lockup.metadata?.metadata?.metadata_rows ?? [];
  for (const row of rows) {
    const parts = row.metadata_parts ?? [];
    if (parts.length !== 1) continue;
    const text = parts[0].text;
    const channelName = text?.toString();
    if (!channelName) continue;
    const channelApiId = text?.runs
      ?.map((run) =>
        "endpoint" in run ? run.endpoint?.payload?.browseId : undefined
      )
      .find((id): id is string => typeof id === "string");
    if (channelApiId) return { channelName, channelApiId };
  }
  return {};
};

/**
 * `fallback` supplies the channel when the surface omits it, e.g. a channel's
 * own video tab, where every video is by the channel being browsed.
 */
export const lockupToVideo = (
  lockup: LockupView,
  fallback: LockupAuthor = {}
): Video | null => {
  if (lockup.content_type !== "VIDEO") return null;
  const author = getLockupAuthor(lockup);
  const stats = getLockupStats(lockup);
  return {
    apiId: lockup.content_id,
    title: lockup.metadata?.title?.toString() ?? "",
    duration: getLockupDuration(lockup),
    channelName: author.channelName ?? fallback.channelName,
    channelApiId: author.channelApiId ?? fallback.channelApiId,
    images: getLockupImages(lockup),
    channelImages: getLockupChannelImages(lockup),
    views: stats.views,
    uploadDate: stats.uploadDate,
  };
};

export const lockupToPlaylistInfo = (
  lockup: LockupView
): PlaylistInfo | null => {
  if (lockup.content_type !== "PLAYLIST" && lockup.content_type !== "PODCAST")
    return null;
  return {
    apiId: lockup.content_id,
    name: lockup.metadata?.title?.toString() ?? "",
    images: getLockupImages(lockup),
  };
};
