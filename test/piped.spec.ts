import {
  fetchInstances,
  getInstance,
  getCurrentInstance,
  getVideoFromApiIdPiped,
  onGetPipedSearchSuggestions,
  searchVideosPiped,
  searchPlaylistsPiped,
  searchChannelsPiped,
  getChannelVideosPiped,
  getPlaylistVideosPiped,
  getTrendingPiped,
} from "../src/piped";

describe("piped.ts integration tests", () => {
  // Increase timeout for integration tests
  jest.setTimeout(30000);

  describe("fetchInstances", () => {
    it("should fetch and store instances", async () => {
      const instances = await fetchInstances();
      expect(Array.isArray(instances)).toBe(true);
      expect(instances.length).toBeGreaterThan(0);
      expect(instances[0]).toHaveProperty("api_url");
      expect(instances[0]).toHaveProperty("name");
      expect(instances[0]).toHaveProperty("version");
    });
  });

  describe("getInstance", () => {
    it("should return a valid instance URL", async () => {
      const instance = await getInstance();
      expect(typeof instance).toBe("string");
      expect(instance.startsWith("https://")).toBe(true);
    });
  });

  describe("getCurrentInstance", () => {
    it("should return a valid instance URL", async () => {
      const instance = await getCurrentInstance();
      expect(typeof instance).toBe("string");
      expect(instance.startsWith("https://")).toBe(true);
    });
  });

  describe("getVideoFromApiIdPiped", () => {
    it("should fetch video data for a known video", async () => {
      // Using a known video ID (Rick Astley - Never Gonna Give You Up)
      const videoId = "dQw4w9WgXcQ";
      const video = await getVideoFromApiIdPiped(videoId);

      expect(video).toHaveProperty("title");
      expect(video).toHaveProperty("apiId", videoId);
      expect(video).toHaveProperty("sources");
      const sources = video.sources!;
      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources[0]).toHaveProperty("source");
      expect(sources[0]).toHaveProperty("type", "application/x-mpegURL");
      expect(video).toHaveProperty("duration");
      expect(video).toHaveProperty("views");
      expect(video).toHaveProperty("description");
      expect(video).toHaveProperty("channelName");
      expect(video).toHaveProperty("channelApiId");
      expect(video).toHaveProperty("uploadDate");
      expect(video).toHaveProperty("recommendedVideos");
    });
  });

  describe("onGetPipedSearchSuggestions", () => {
    it("should return search suggestions for a query", async () => {
      const suggestions = await onGetPipedSearchSuggestions({ query: "test" });
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(typeof suggestions[0]).toBe("string");
    });
  });

  describe("searchVideosPiped", () => {
    it("should search and return video results", async () => {
      const result = await searchVideosPiped({ query: "test" });
      
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty("title");
      expect(result.items[0]).toHaveProperty("apiId");
      expect(result.items[0]).toHaveProperty("images");
      expect(result.items[0]).toHaveProperty("duration");
      expect(result.items[0]).toHaveProperty("views");
      expect(result.items[0]).toHaveProperty("channelName");
      expect(result.items[0]).toHaveProperty("channelApiId");
      expect(result).toHaveProperty("pageInfo");
      expect(result.pageInfo).toHaveProperty("nextPage");
    });
  });

  describe("searchPlaylistsPiped", () => {
    it("should search and return playlist results", async () => {
      const result = await searchPlaylistsPiped({ query: "test" });
      
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty("name");
      expect(result.items[0]).toHaveProperty("apiId");
      expect(result.items[0]).toHaveProperty("images");
      expect(result.items[0]).toHaveProperty("videos");
      expect(result).toHaveProperty("pageInfo");
      expect(result.pageInfo).toHaveProperty("nextPage");
    });
  });

  describe("searchChannelsPiped", () => {
    it("should search and return channel results", async () => {
      const result = await searchChannelsPiped({ query: "test" });
      
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty("name");
      expect(result.items[0]).toHaveProperty("apiId");
      expect(result.items[0]).toHaveProperty("images");
      expect(result).toHaveProperty("pageInfo");
      expect(result.pageInfo).toHaveProperty("nextPage");
    });
  });

  describe("getChannelVideosPiped", () => {
    it("should fetch videos from a known channel", async () => {
      const channelId = "UChi08h4577eFsNXGd3sxYhw";
      const result = await getChannelVideosPiped({ apiId: channelId });
      
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty("title");
      expect(result.items[0]).toHaveProperty("apiId");
      expect(result.items[0]).toHaveProperty("images");
      expect(result.items[0]).toHaveProperty("duration");
      expect(result.items[0]).toHaveProperty("views");
      expect(result.items[0]).toHaveProperty("channelName");
      expect(result.items[0]).toHaveProperty("channelApiId");
      expect(result).toHaveProperty("pageInfo");
      expect(result.pageInfo).toHaveProperty("nextPage");
    });
  });

  describe("getPlaylistVideosPiped", () => {
    it("should fetch videos from a known playlist", async () => {
      const playlistId = "PLWsnao9n727MuFgH2vwhDQnB_M7GrG4HE";
      const result = await getPlaylistVideosPiped({ apiId: playlistId, isUserPlaylist: false });
      
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty("title");
      expect(result.items[0]).toHaveProperty("apiId");
      expect(result.items[0]).toHaveProperty("images");
      expect(result.items[0]).toHaveProperty("duration");
      expect(result.items[0]).toHaveProperty("views");
      expect(result.items[0]).toHaveProperty("channelName");
      expect(result.items[0]).toHaveProperty("channelApiId");
      expect(result).toHaveProperty("pageInfo");
      expect(result.pageInfo).toHaveProperty("nextPage");
    });
  });

  describe("getTrendingPiped", () => {
    it("should fetch trending videos", async () => {
      const result = await getTrendingPiped();
      
      expect(result).toHaveProperty("videos");
      const videos = result.videos!;
      expect(videos).toHaveProperty("items");
      expect(Array.isArray(videos.items)).toBe(true);
      expect(videos.items.length).toBeGreaterThan(0);
      
      const firstVideo = videos.items[0];
      expect(firstVideo).toHaveProperty("title");
      expect(firstVideo).toHaveProperty("apiId");
      expect(firstVideo).toHaveProperty("images");
      expect(firstVideo).toHaveProperty("duration");
      expect(firstVideo).toHaveProperty("views");
      expect(firstVideo).toHaveProperty("channelName");
      expect(firstVideo).toHaveProperty("channelApiId");
    });
  });
}); 