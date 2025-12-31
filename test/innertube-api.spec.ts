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
            }
          ]
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
          ]
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
                  thumbnails: [{ url: 'playlist.jpg' }]
                }
              ]
            });
          }
        })
      })
    },
    Mixins: {},
    IBrowseResponse: {}
  };
});

// Mock the parser nodes to avoid YTNode circular dependency
vi.mock('youtubei.js/dist/src/parser/nodes', () => ({
  AccountItem: {},
  AccountItemSection: {},
  LockupView: {},
}));

import {
  getTopInnerTubeItems,
  getUserChannelsInnerTube,
  getUserPlaylistsInnertube,
  getPlaylistVideosInnertube,
  searchVideosInnertube,
  searchChannelsInnertube,
  searchPlaylistsInnertube,
} from '../src/innertube-api';

describe('Innertube API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTopInnerTubeItems', () => {
    it('should return top videos from home feed', async () => {
      const result = await getTopInnerTubeItems();
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
  });

  describe('getPlaylistVideosInnertube', () => {
    it('should return videos from a playlist', async () => {
      const playlistId = 'PLFgquLnL59alCl_2TQvOiD5Vgm1hYGSJT'; // Example playlist ID
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
  });
}); 