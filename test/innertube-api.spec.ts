import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock googlevideo/utils
vi.mock('googlevideo/utils', () => ({
  buildSabrFormat: vi.fn((format: any) => format),
}));

// Mock the youtubei.js library to avoid network calls and URL parsing issues
vi.mock('youtubei.js', () => {
  const mockVideoInfo = {
    basic_info: {
      title: 'Video Title',
      duration: 300,
      view_count: 1000,
      short_description: 'Video description',
      thumbnail: [{ url: 'thumb.jpg' }],
      is_live: false,
      is_post_live_dvr: false,
      is_live_content: false,
    },
    streaming_data: {
      server_abr_streaming_url: 'https://example.com/sabr',
      adaptive_formats: [],
      hls_manifest_url: undefined,
      dash_manifest_url: undefined,
    },
    player_config: {
      media_common_config: {
        media_ustreamer_request_config: {
          video_playback_ustreamer_config: 'test-config',
        },
      },
    },
    playability_status: { status: 'OK' },
    toDash: vi.fn().mockResolvedValue('<MPD></MPD>'),
  };

  // Sentinels standing in for the real parser node classes, so that
  // filterType/firstOfType can match on identity like youtubei.js does.
  const CommentThreadNode = { name: 'CommentThread' };
  const ContinuationItemNode = { name: 'ContinuationItem' };

  const mockObserved = (items: any[]) => {
    const array: any = [...items];
    array.filterType = (type: any) =>
      array.filter((item: any) => item.nodeType === type);
    array.firstOfType = (type: any) =>
      array.find((item: any) => item.nodeType === type);
    return array;
  };

  const mockContinuation = (token: string, useButton = false) => ({
    nodeType: ContinuationItemNode,
    button: useButton ? { endpoint: { payload: { token } } } : undefined,
    endpoint: { payload: { token: useButton ? undefined : token } },
  });

  const mockCommentThread = (
    id: string,
    content: string,
    author: string,
    likeCount: string,
    replies?: { replyCount: string; token: string }
  ) => ({
    nodeType: CommentThreadNode,
    comment: {
      comment_id: id,
      content: { toString: () => content },
      author: { name: author, thumbnails: [{ url: `${id}.jpg` }] },
      like_count: likeCount,
      reply_count: replies?.replyCount,
    },
    comment_replies_data: replies
      ? { sub_threads: mockObserved([mockContinuation(replies.token)]) }
      : undefined,
  });

  const mockCommentsContinuation = (continuation: string) => {
    const isReplies = continuation.startsWith('reply');
    return {
      on_response_received_endpoints: mockObserved([
        {
          contents: mockObserved([
            isReplies
              ? mockCommentThread('reply-1', 'This is a reply', 'Replier', '5')
              : mockCommentThread(
                  'comment-3',
                  'Page two comment',
                  'Third Commenter',
                  '1.2K'
                ),
            mockContinuation(
              isReplies ? 'reply-token-2' : 'next-page-token-2',
              isReplies
            ),
          ]),
        },
      ]),
    };
  };

  return {
    Platform: {
      shim: {
        eval: undefined as any,
      },
    },
    Constants: {
      CLIENT_NAME_IDS: {
        WEB: '1',
      },
    },
    Utils: {
      generateRandomString: vi.fn().mockReturnValue('mock-cpn-string'),
    },
    YT: {
      VideoInfo: vi.fn().mockImplementation(function () { return mockVideoInfo; }),
    },
    Innertube: {
      create: vi.fn().mockResolvedValue({
        session: {
          player: {
            signature_timestamp: 12345,
            decipher: vi.fn().mockResolvedValue('https://example.com/deciphered-sabr'),
          },
          context: {
            client: {
              osName: 'Windows',
              osVersion: '10.0',
              clientName: 'WEB',
              clientVersion: '2.0',
            },
          },
        },
        actions: {
          execute: vi.fn().mockImplementation((endpoint: string, args: any) => {
            if (endpoint === '/next' && args?.continuation) {
              return Promise.resolve(mockCommentsContinuation(args.continuation));
            }
            return Promise.resolve({ data: 'mock-player-response' });
          }),
        },
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
          page: {
            on_response_received_endpoints: mockObserved([
              // The first endpoint holds the comments header, not any threads.
              { contents: mockObserved([]) },
              {
                contents: mockObserved([
                  mockCommentThread(
                    'comment-1',
                    'This is a comment',
                    'Commenter',
                    '42',
                    { replyCount: '3', token: 'reply-token-1' }
                  ),
                  mockCommentThread(
                    'comment-2',
                    'Another comment',
                    'Another Commenter',
                    '10'
                  ),
                  mockContinuation('next-page-token'),
                ]),
              },
            ]),
          },
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
      CommentThread: CommentThreadNode,
      ContinuationItem: ContinuationItemNode,
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
  getUserFeedInnertube,
  resetInnertubeInstance,
  getVideoFromApiIdInnertube,
  getSearchSuggestionsInnertube,
  getVideoCommentsInnertube,
  getCommentRepliesInnertube,
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

  describe('getUserFeedInnertube', () => {
    const app = (global as any).application;

    // The session is memoized module-wide, so each case has to start from a
    // fresh one for its cookie to be the one Innertube.create sees.
    beforeEach(() => {
      resetInnertubeInstance();
    });

    const realNetworkRequest = app.networkRequest;
    afterEach(() => {
      app.isLoggedIn = async () => false;
      app.getAuthHeaders = async () => ({});
      app.networkRequest = realNetworkRequest;
      resetInnertubeInstance();
    });

    it('returns nothing when the user is signed out', async () => {
      app.isLoggedIn = async () => false;

      const result = await getUserFeedInnertube();
      expect(result.items).toEqual([]);
    });

    it('returns the home feed when the user is signed in', async () => {
      app.isLoggedIn = async () => true;

      const result = await getUserFeedInnertube();
      expect(result.items.length).toBeGreaterThan(1);
      expect(result.items[0]).toHaveProperty('apiId');
      expect(result.items[0]).toHaveProperty('title');
    });

    it('builds the session with the captured cookie so SAPISID is available', async () => {
      app.isLoggedIn = async () => true;
      app.getAuthHeaders = async (domain: string) =>
        domain === 'www.youtube.com' ? { Cookie: 'SAPISID=secret' } : {};

      await getUserFeedInnertube();

      const { Innertube } = await import('youtubei.js');
      expect(Innertube.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cookie: expect.stringContaining('SAPISID=secret'),
        })
      );
    });

    it('sends X-Origin so YouTube honours the SAPISIDHASH signature', async () => {
      app.isLoggedIn = async () => true;
      app.getAuthHeaders = async () => ({ Cookie: 'SAPISID=secret' });

      await getUserFeedInnertube();

      const { Innertube } = await import('youtubei.js');
      const passedFetch = (Innertube.create as any).mock.calls.at(-1)[0].fetch;

      const seen: Headers[] = [];
      app.networkRequest = async (_input: any, init: any) => {
        seen.push(new Headers(init.headers));
        return new Response('{}');
      };
      await passedFetch('https://www.youtube.com/youtubei/v1/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(seen[0].get('X-Origin')).toBe('https://www.youtube.com');
      // The caller's own headers must survive being wrapped.
      expect(seen[0].get('Content-Type')).toBe('application/json');
    });

    it('falls back to the consent-only cookie when nothing was captured', async () => {
      app.isLoggedIn = async () => true;
      app.getAuthHeaders = async () => ({});

      await getUserFeedInnertube();

      const { Innertube } = await import('youtubei.js');
      expect(Innertube.create).toHaveBeenCalledWith(
        expect.objectContaining({ cookie: 'CONSENT=YES+' })
      );
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

    it('should return empty sources (SABR data stored separately)', async () => {
      const result = await getVideoFromApiIdInnertube('test-video-id');

      expect(result.sources).toBeDefined();
      expect(result.sources).toEqual([]);
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

    it('should expose the continuation token as nextPage', async () => {
      const result = await getVideoCommentsInnertube({ apiId: 'test-video-id' });

      expect(result.pageInfo?.nextPage).toBe('next-page-token');
    });

    it('should include reply count and reply page', async () => {
      const result = await getVideoCommentsInnertube({ apiId: 'test-video-id' });

      expect(result.comments[0]).toHaveProperty('replyCount', 3);
      expect(result.comments[0]).toHaveProperty('replyPage', 'reply-token-1');
      expect(result.comments[1].replyPage).toBeUndefined();
    });

    it('should fetch the next page from a continuation token', async () => {
      const result = await getVideoCommentsInnertube({
        apiId: 'test-video-id',
        pageInfo: { resultsPerPage: 2, offset: 2, nextPage: 'next-page-token' },
      });

      expect(result.comments.length).toBe(1);
      expect(result.comments[0]).toHaveProperty('apiId', 'comment-3');
      expect(result.pageInfo).toHaveProperty('offset', 2);
      expect(result.pageInfo?.nextPage).toBe('next-page-token-2');
    });

    it('should expand abbreviated like counts', async () => {
      const result = await getVideoCommentsInnertube({
        apiId: 'test-video-id',
        pageInfo: { resultsPerPage: 2, offset: 2, nextPage: 'next-page-token' },
      });

      expect(result.comments[0]).toHaveProperty('likes', 1200);
    });

    it('should return empty comments when the request fails', async () => {
      const { Innertube } = await import('youtubei.js');
      const youtube: any = await (Innertube as any).create();
      const original = youtube.getComments;
      youtube.getComments = vi.fn().mockRejectedValue(new Error('parse failed'));
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        const result = await getVideoCommentsInnertube({
          apiId: 'test-video-id',
        });

        expect(result.comments).toEqual([]);
        expect(result.pageInfo?.nextPage).toBeUndefined();
        expect(consoleError).toHaveBeenCalled();
      } finally {
        youtube.getComments = original;
        consoleError.mockRestore();
      }
    });
  });

  describe('getCommentRepliesInnertube', () => {
    it('should return replies for a comment', async () => {
      const result = await getCommentRepliesInnertube({
        commentApiId: 'comment-1',
        videoApiId: 'test-video-id',
        pageInfo: { resultsPerPage: 0, offset: 0, nextPage: 'reply-token-1' },
      });

      expect(result.comments.length).toBe(1);
      expect(result.comments[0]).toHaveProperty('apiId', 'reply-1');
      expect(result.comments[0]).toHaveProperty(
        'videoCommentId',
        'test-video-id'
      );
      expect(result.comments[0]).toHaveProperty('content', 'This is a reply');
    });

    it('should read the next reply page from the load more button', async () => {
      const result = await getCommentRepliesInnertube({
        commentApiId: 'comment-1',
        videoApiId: 'test-video-id',
        pageInfo: { resultsPerPage: 0, offset: 0, nextPage: 'reply-token-1' },
      });

      expect(result.pageInfo?.nextPage).toBe('reply-token-2');
    });

    it('should return empty replies without a continuation token', async () => {
      const result = await getCommentRepliesInnertube({
        commentApiId: 'comment-1',
        videoApiId: 'test-video-id',
      });

      expect(result.comments).toEqual([]);
      expect(result.pageInfo?.nextPage).toBeUndefined();
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
