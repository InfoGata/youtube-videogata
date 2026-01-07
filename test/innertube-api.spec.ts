import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the youtubei.js library to avoid network calls and URL parsing issues
vi.mock('youtubei.js', () => {
  return {
    Innertube: {
      create: vi.fn().mockResolvedValue({
        getHomeFeed: vi.fn().mockResolvedValue({
          videos: [
            {
              id: 'test-video-1',
              title: { toString: () => 'Test Video 1' },
              duration: { seconds: 300 },
              author: { name: 'Test Channel', id: 'test-channel-1' },
              thumbnails: [{ url: 'test.jpg' }]
            },
            {
              id: 'test-video-2',
              title: { toString: () => 'Test Video 2' },
              duration: { seconds: 600 },
              author: { name: 'Test Channel 2', id: 'test-channel-2' },
              thumbnails: [{ url: 'test2.jpg' }]
            }
          ]
        }),
        getInfo: vi.fn().mockResolvedValue({
          basic_info: {
            title: 'Video Title',
            duration: 300,
            view_count: 1000,
            short_description: 'Video description',
            thumbnail: [{ url: 'thumb.jpg' }]
          },
          primary_info: {
            published: { text: '2024-01-15' }
          },
          secondary_info: {
            owner: {
              author: { name: 'Channel Name', id: 'channel-id' }
            }
          },
          streaming_data: {
            hls_manifest_url: 'https://example.com/manifest.m3u8'
          },
          watch_next_feed: [
            {
              type: 'CompactVideo',
              id: 'related-video-1',
              title: { toString: () => 'Related Video 1' },
              duration: { seconds: 200 },
              author: { name: 'Related Channel', id: 'related-channel-1' },
              thumbnails: [{ url: 'related.jpg' }]
            }
          ]
        }),
        getSearchSuggestions: vi.fn().mockResolvedValue([
          'suggestion 1',
          'suggestion 2',
          { toString: () => 'suggestion 3' }
        ]),
        getComments: vi.fn().mockResolvedValue({
          contents: [
            {
              type: 'CommentThread',
              comment: {
                comment_id: 'comment-1',
                content: { toString: () => 'This is a comment' },
                author: {
                  name: 'Commenter',
                  thumbnails: [{ url: 'avatar.jpg' }]
                },
                vote_count: { text: '42' }
              }
            },
            {
              type: 'CommentThread',
              comment: {
                comment_id: 'comment-2',
                content: { toString: () => 'Another comment' },
                author: {
                  name: 'Another Commenter',
                  thumbnails: [{ url: 'avatar2.jpg' }]
                },
                vote_count: { text: '10' }
              }
            }
          ]
        }),
        getChannel: vi.fn().mockResolvedValue({
          getVideos: vi.fn().mockResolvedValue({
            videos: [
              {
                id: 'channel-video-1',
                title: { toString: () => 'Channel Video 1' },
                duration: { seconds: 360 },
                author: { name: 'Channel Author', id: 'channel-author-1' },
                thumbnails: [{ url: 'channel-video.jpg' }]
              },
              {
                id: 'channel-video-2',
                title: { toString: () => 'Channel Video 2' },
                duration: { seconds: 480 },
                author: { name: 'Channel Author', id: 'channel-author-1' },
                thumbnails: [{ url: 'channel-video2.jpg' }]
              }
            ]
          })
        }),
        getPlaylist: vi.fn().mockResolvedValue({
          items: [
            {
              id: 'playlist-video-1',
              title: { toString: () => 'Playlist Video 1' },
              duration: { seconds: 240 },
              author: { name: 'Playlist Channel', id: 'playlist-channel-1' },
              thumbnails: [{ url: 'playlist.jpg' }]
            }
          ],
          info: {
            title: 'Test Playlist',
            thumbnails: [{ url: 'playlist-thumb.jpg' }]
          }
        }),
        search: vi.fn().mockImplementation((query, options) => {
          if (options.type === 'video') {
            return Promise.resolve({
              videos: [
                {
                  id: 'search-video-1',
                  title: { toString: () => `Search Video: ${query}` },
                  duration: { seconds: 180 },
                  author: { name: 'Search Channel', id: 'search-channel-1' },
                  thumbnails: [{ url: 'search.jpg' }]
                }
              ]
            });
          } else if (options.type === 'channel') {
            return Promise.resolve({
              channels: [
                {
                  id: 'search-channel-1',
                  author: {
                    name: `Search Channel: ${query}`,
                    thumbnails: [{ url: 'channel.jpg' }]
                  }
                }
              ]
            });
          } else if (options.type === 'playlist') {
            return Promise.resolve({
              playlists: [
                {
                  id: 'search-playlist-1',
                  title: { toString: () => `Search Playlist: ${query}` },
                  thumbnails: [{ url: 'playlist.jpg' }],
                  author: { name: 'Playlist Author' }
                }
              ]
            });
          }
        })
      })
    },
    Mixins: {},
    IBrowseResponse: {},
    YTNodes: {
      AccountItem: {},
      AccountItemSection: {},
      CompactVideo: {},
      LockupView: {},
      PlaylistPanelVideo: {},
      ReelItem: {},
      ShortsLockupView: {},
      WatchCardCompactVideo: {}
    }
  };
});

// Mock the parser nodes to avoid YTNode circular dependency
vi.mock('youtubei.js/dist/src/parser/nodes', () => ({
  AccountItem: {},
  AccountItemSection: {},
  LockupView: {},
}));

import {
  getTopItemsInnertube,
  getVideoFromApiIdInnertube,
  getSearchSuggestionsInnertube,
  getVideoCommentsInnertube,
  getChannelVideosInnertube,
  getPlaylistVideosInnertube,
  searchVideosInnertube,
  searchChannelsInnertube,
  searchPlaylistsInnertube,
} from '../src/innertube-api';

describe('Innertube API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTopItemsInnertube', () => {
    it('should return top videos from home feed', async () => {
      const result = await getTopItemsInnertube();
      expect(result).toBeDefined();
      expect(result.videos).toBeDefined();
      if (result.videos) {
        expect(Array.isArray(result.videos.items)).toBe(true);

        if (result.videos.items.length > 0) {
          const video = result.videos.items[0];
          expect(video).toHaveProperty('apiId');
          expect(video).toHaveProperty('title');
          expect(video).toHaveProperty('duration');
          expect(video).toHaveProperty('channelName');
          expect(video).toHaveProperty('channelApiId');
          expect(video).toHaveProperty('images');
        }
      }
    });

    it('should return multiple videos', async () => {
      const result = await getTopItemsInnertube();
      expect(result.videos?.items.length).toBeGreaterThan(1);
    });
  });

  describe('getVideoFromApiIdInnertube', () => {
    it('should return video details for a valid video ID', async () => {
      const result = await getVideoFromApiIdInnertube('test-video-id');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('apiId', 'test-video-id');
      expect(result).toHaveProperty('title', 'Video Title');
      expect(result).toHaveProperty('duration', 300);
      expect(result).toHaveProperty('views', 1000);
      expect(result).toHaveProperty('description', 'Video description');
      expect(result).toHaveProperty('channelName', 'Channel Name');
      expect(result).toHaveProperty('channelApiId', 'channel-id');
    });

    it('should include HLS source when available', async () => {
      const result = await getVideoFromApiIdInnertube('test-video-id');

      expect(result.sources).toBeDefined();
      expect(result.sources?.length).toBeGreaterThan(0);
      expect(result.sources?.[0].source).toBe('https://example.com/manifest.m3u8');
      expect(result.sources?.[0].type).toBe('application/x-mpegURL');
    });

    it('should include recommended videos', async () => {
      const result = await getVideoFromApiIdInnertube('test-video-id');

      expect(result.recommendedVideos).toBeDefined();
      expect(Array.isArray(result.recommendedVideos)).toBe(true);
    });

    it('should include images/thumbnails', async () => {
      const result = await getVideoFromApiIdInnertube('test-video-id');

      expect(result.images).toBeDefined();
      expect(Array.isArray(result.images)).toBe(true);
    });
  });

  describe('getSearchSuggestionsInnertube', () => {
    it('should return search suggestions for a query', async () => {
      const result = await getSearchSuggestionsInnertube({ query: 'test' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should handle both string and object suggestions', async () => {
      const result = await getSearchSuggestionsInnertube({ query: 'test' });

      expect(result).toContain('suggestion 1');
      expect(result).toContain('suggestion 2');
      expect(result).toContain('suggestion 3');
    });
  });

  describe('getVideoCommentsInnertube', () => {
    it('should return comments for a video', async () => {
      const result = await getVideoCommentsInnertube({ apiId: 'test-video-id' });

      expect(result).toBeDefined();
      expect(result.comments).toBeDefined();
      expect(Array.isArray(result.comments)).toBe(true);
      expect(result.comments.length).toBe(2);
    });

    it('should return comment details', async () => {
      const result = await getVideoCommentsInnertube({ apiId: 'test-video-id' });

      const firstComment = result.comments[0];
      expect(firstComment).toHaveProperty('apiId', 'comment-1');
      expect(firstComment).toHaveProperty('videoCommentId', 'test-video-id');
      expect(firstComment).toHaveProperty('content', 'This is a comment');
      expect(firstComment).toHaveProperty('author', 'Commenter');
      expect(firstComment).toHaveProperty('likes', 42);
      expect(firstComment.images).toBeDefined();
    });

    it('should return empty comments for undefined apiId', async () => {
      const result = await getVideoCommentsInnertube({ apiId: undefined as any });

      expect(result).toBeDefined();
      expect(result.comments).toEqual([]);
      expect(result.pageInfo).toBeDefined();
    });

    it('should include pageInfo', async () => {
      const result = await getVideoCommentsInnertube({ apiId: 'test-video-id' });

      expect(result.pageInfo).toBeDefined();
      expect(result.pageInfo).toHaveProperty('resultsPerPage');
      expect(result.pageInfo).toHaveProperty('offset', 0);
    });
  });

  describe('getChannelVideosInnertube', () => {
    it('should return videos from a channel', async () => {
      const result = await getChannelVideosInnertube({ apiId: 'test-channel-id' });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(2);
    });

    it('should return video details for channel videos', async () => {
      const result = await getChannelVideosInnertube({ apiId: 'test-channel-id' });

      const firstVideo = result.items[0];
      expect(firstVideo).toHaveProperty('apiId', 'channel-video-1');
      expect(firstVideo).toHaveProperty('title', 'Channel Video 1');
      expect(firstVideo).toHaveProperty('duration', 360);
      expect(firstVideo).toHaveProperty('channelName', 'Channel Author');
      expect(firstVideo).toHaveProperty('channelApiId', 'channel-author-1');
      expect(firstVideo).toHaveProperty('images');
    });

    it('should return empty array for undefined apiId', async () => {
      const result = await getChannelVideosInnertube({ apiId: undefined as any });

      expect(result).toBeDefined();
      expect(result.items).toEqual([]);
      expect(result.pageInfo).toBeDefined();
    });

    it('should include pageInfo', async () => {
      const result = await getChannelVideosInnertube({ apiId: 'test-channel-id' });

      expect(result.pageInfo).toBeDefined();
      expect(result.pageInfo).toHaveProperty('resultsPerPage', 2);
      expect(result.pageInfo).toHaveProperty('offset', 0);
    });
  });

  describe('getPlaylistVideosInnertube', () => {
    it('should return videos from a playlist', async () => {
      const playlistId = 'PLFgquLnL59alCl_2TQvOiD5Vgm1hYGSJT';
      const result = await getPlaylistVideosInnertube({ apiId: playlistId, isUserPlaylist: false });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      if (result.items.length > 0) {
        const video = result.items[0];
        expect(video).toHaveProperty('apiId');
        expect(video).toHaveProperty('title');
        expect(video).toHaveProperty('duration');
        expect(video).toHaveProperty('channelName');
        expect(video).toHaveProperty('channelApiId');
        expect(video).toHaveProperty('images');
      }
    });

    it('should return empty array for invalid playlist ID', async () => {
      const result = await getPlaylistVideosInnertube({ apiId: '', isUserPlaylist: false });
      expect(result).toBeDefined();
      expect(result.items).toEqual([]);
    });

    it('should return playlist info', async () => {
      const result = await getPlaylistVideosInnertube({ apiId: 'test-playlist', isUserPlaylist: false });

      expect(result.playlist).toBeDefined();
      expect(result.playlist).toHaveProperty('name', 'Test Playlist');
      expect(result.playlist).toHaveProperty('apiId', 'test-playlist');
      expect(result.playlist?.images).toBeDefined();
    });

    it('should include pageInfo', async () => {
      const result = await getPlaylistVideosInnertube({ apiId: 'test-playlist', isUserPlaylist: false });

      expect(result.pageInfo).toBeDefined();
      expect(result.pageInfo).toHaveProperty('resultsPerPage');
      expect(result.pageInfo).toHaveProperty('offset', 0);
    });
  });

  describe('searchVideosInnertube', () => {
    it('should return search results for videos', async () => {
      const result = await searchVideosInnertube({ query: 'test' });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      if (result.items.length > 0) {
        const video = result.items[0];
        expect(video).toHaveProperty('apiId');
        expect(video).toHaveProperty('title');
        expect(video).toHaveProperty('duration');
        expect(video).toHaveProperty('channelName');
        expect(video).toHaveProperty('channelApiId');
        expect(video).toHaveProperty('images');
      }
    });

    it('should include pageInfo in results', async () => {
      const result = await searchVideosInnertube({ query: 'test' });

      expect(result.pageInfo).toBeDefined();
      expect(result.pageInfo).toHaveProperty('resultsPerPage');
      expect(result.pageInfo).toHaveProperty('offset', 0);
    });

    it('should include query in video title', async () => {
      const result = await searchVideosInnertube({ query: 'music' });

      expect(result.items[0].title).toContain('music');
    });
  });

  describe('searchChannelsInnertube', () => {
    it('should return search results for channels', async () => {
      const result = await searchChannelsInnertube({ query: 'test' });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      if (result.items.length > 0) {
        const channel = result.items[0];
        expect(channel).toHaveProperty('apiId');
        expect(channel).toHaveProperty('name');
        expect(channel).toHaveProperty('images');
      }
    });

    it('should include pageInfo in results', async () => {
      const result = await searchChannelsInnertube({ query: 'test' });

      expect(result.pageInfo).toBeDefined();
      expect(result.pageInfo).toHaveProperty('resultsPerPage');
      expect(result.pageInfo).toHaveProperty('offset', 0);
    });

    it('should include query in channel name', async () => {
      const result = await searchChannelsInnertube({ query: 'gaming' });

      expect(result.items[0].name).toContain('gaming');
    });
  });

  describe('searchPlaylistsInnertube', () => {
    it('should return search results for playlists', async () => {
      const result = await searchPlaylistsInnertube({ query: 'test' });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      if (result.items.length > 0) {
        const playlist = result.items[0];
        expect(playlist).toHaveProperty('apiId');
        expect(playlist).toHaveProperty('name');
        expect(playlist).toHaveProperty('images');
      }
    });

    it('should include pageInfo in results', async () => {
      const result = await searchPlaylistsInnertube({ query: 'test' });

      expect(result.pageInfo).toBeDefined();
      expect(result.pageInfo).toHaveProperty('resultsPerPage');
      expect(result.pageInfo).toHaveProperty('offset', 0);
    });

    it('should include query in playlist name', async () => {
      const result = await searchPlaylistsInnertube({ query: 'workout' });

      expect(result.items[0].name).toContain('workout');
    });
  });
}); 