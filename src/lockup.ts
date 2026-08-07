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
  return {
    apiId: lockup.content_id,
    title: lockup.metadata?.title?.toString() ?? "",
    duration: getLockupDuration(lockup),
    channelName: author.channelName ?? fallback.channelName,
    channelApiId: author.channelApiId ?? fallback.channelApiId,
    images: getLockupImages(lockup),
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
