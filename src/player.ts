import {
  MessageType,
  UiMessageType,
  SABR_DATA_KEY,
  SabrData,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "./shared";

const getTime = () => {
  const hashSearchParams = new URLSearchParams(location.hash.substring(1));
  const t = parseInt(hashSearchParams.get("t") ?? "0", 10) || undefined;
  return t;
};

function sendMessage(message: UiMessageType) {
  parent.postMessage(message, "*");
}

function createProxyFetch(): typeof fetch {
  let requestIdCounter = 0;

  const proxyFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    // Only proxy googlevideo URLs that hit CORS issues
    if (!url.includes("googlevideo.com")) {
      return fetch(input, init);
    }

    const requestId = `proxy-${requestIdCounter++}`;
    const method = init?.method || "GET";
    const headers: Record<string, string> = {};

    if (init?.headers) {
      const h = new Headers(init.headers);
      h.forEach((value, key) => {
        headers[key] = value;
      });
    }

    let body: string | undefined;
    if (init?.body) {
      let arrayBuffer: ArrayBuffer;
      if (init.body instanceof ArrayBuffer) {
        arrayBuffer = init.body;
      } else if (ArrayBuffer.isView(init.body)) {
        arrayBuffer = init.body.buffer as ArrayBuffer;
      } else {
        arrayBuffer = await new Response(init.body as any).arrayBuffer();
      }
      body = arrayBufferToBase64(arrayBuffer);
    }

    return new Promise<Response>((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        const data = event.data;
        if (
          data.type === "proxy-fetch-response" &&
          data.requestId === requestId
        ) {
          window.removeEventListener("message", handler);

          if (data.error) {
            reject(new Error(data.error));
            return;
          }

          const bodyBytes = base64ToArrayBuffer(data.body);
          const response = new Response(bodyBytes, {
            status: data.status,
            statusText: data.statusText,
            headers: data.headers,
          });
          resolve(response);
        }
      };
      window.addEventListener("message", handler);

      sendMessage({
        type: "proxy-fetch-request",
        requestId,
        url,
        method,
        headers,
        body,
      });
    });
  };

  return proxyFetch as typeof fetch;
}

const loadYouTubeIFramePlayer = () => {
  const playerDiv = document.getElementById("player")!;
  playerDiv.style.display = "";

  let player: YT.Player;
  (window as any).onYouTubeIframeAPIReady = () => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const apiId = urlSearchParams.get("apiId") ?? undefined;
    const t = getTime();
    if (apiId) {
      player = new YT.Player("player", {
        width: "100%",
        height: "100%",
        videoId: apiId,
        playerVars: {
          playsinline: 1,
          start: t,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });

      window.addEventListener("hashchange", () => {
        const t = getTime();
        if (t) {
          player.seekTo(t, true);
        }
      });
    }
  };

  function onPlayerReady(event: YT.PlayerEvent) {
    event.target.playVideo();
  }

  function onPlayerStateChange(event: YT.OnStateChangeEvent) {
    if (event.data === YT.PlayerState.ENDED) {
      console.log("End Track");
      sendMessage({ type: "endvideo" });
    }
  }

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName("script")[0];
  firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
};

const loadSabrPlayer = async () => {
  const shaka = (await import("shaka-player/dist/shaka-player.ui.js")).default;
  await import("shaka-player/dist/controls.css");
  const { SabrStreamingAdapter } = await import(
    "googlevideo/sabr-streaming-adapter"
  );
  const { ShakaPlayerAdapter } = await import("./ShakaPlayerAdapter");
  const { botguardService } = await import("./BotguardService");

  const videoContainer = document.getElementById(
    "video-container"
  ) as HTMLDivElement;
  const videoElement = document.getElementById("video") as HTMLVideoElement;
  const playerDiv = document.getElementById("player")!;

  playerDiv.style.display = "none";
  videoContainer.style.display = "";

  const sabrDataStr = localStorage.getItem(SABR_DATA_KEY);
  if (!sabrDataStr) {
    console.error("[Player] No SABR data found in localStorage");
    return;
  }

  const sabrData: SabrData = JSON.parse(sabrDataStr);
  console.log("[Player] SABR data loaded for video:", sabrData.videoId);

  // Initialize Shaka
  shaka.polyfill.installAll();
  if (!shaka.Player.isBrowserSupported()) {
    console.error("[Player] Shaka Player is not supported on this browser");
    return;
  }

  const player = new shaka.Player();
  player.configure({
    abr: { enabled: true },
    streaming: {
      bufferingGoal: 120,
      rebufferingGoal: 2,
    },
  });

  await player.attach(videoElement);

  const ui = new shaka.ui.Overlay(player, videoContainer, videoElement);
  ui.configure({
    addBigPlayButton: false,
    overflowMenuButtons: [
      "captions",
      "quality",
      "language",
      "picture_in_picture",
      "playback_rate",
      "loop",
    ],
    customContextMenu: true,
  });

  // Initialize BotGuard in parallel
  let playbackWebPoToken: string | undefined;
  let playbackWebPoTokenCreationLock = false;
  let coldStartToken: string | undefined;
  const playbackWebPoTokenContentBinding = sabrData.videoId;

  botguardService
    .init()
    .then(() => console.info("[Player]", "BotGuard client initialized"));

  async function mintContentWebPO() {
    if (!playbackWebPoTokenContentBinding || playbackWebPoTokenCreationLock)
      return;
    playbackWebPoTokenCreationLock = true;
    try {
      coldStartToken = botguardService.mintColdStartToken(
        playbackWebPoTokenContentBinding
      );
      console.info(
        "[Player]",
        `Cold start token created (Content binding: ${decodeURIComponent(playbackWebPoTokenContentBinding)})`
      );

      if (!botguardService.isInitialized()) await botguardService.reinit();

      if (botguardService.integrityTokenBasedMinter) {
        playbackWebPoToken =
          await botguardService.integrityTokenBasedMinter.mintAsWebsafeString(
            decodeURIComponent(playbackWebPoTokenContentBinding)
          );
        console.info(
          "[Player]",
          `WebPO token created (Content binding: ${decodeURIComponent(playbackWebPoTokenContentBinding)})`
        );
      }
    } catch (err) {
      console.error("[Player]", "Error minting WebPO token", err);
    } finally {
      playbackWebPoTokenCreationLock = false;
    }
  }

  // Create player adapter with proxy fetch for CORS bypass
  const shakaPlayerAdapter = new ShakaPlayerAdapter();
  shakaPlayerAdapter.setFetchFunction(createProxyFetch());

  // Create SABR adapter
  const sabrAdapter = new SabrStreamingAdapter({
    playerAdapter: shakaPlayerAdapter,
    clientInfo: sabrData.clientInfo,
  });

  sabrAdapter.onMintPoToken(async () => {
    if (!playbackWebPoToken) {
      if (sabrData.isLive) {
        await mintContentWebPO();
      } else {
        mintContentWebPO().then();
      }
    }
    return playbackWebPoToken || coldStartToken || "";
  });

  sabrAdapter.onReloadPlayerResponse(async (reloadContext) => {
    console.log("[Player]", "Requesting player response reload...");

    return new Promise<void>((resolve) => {
      const handler = (event: MessageEvent) => {
        const data = event.data as MessageType;
        if (data.type === "reload-player-response") {
          window.removeEventListener("message", handler);
          sabrAdapter.setStreamingURL(data.streamingUrl);
          if (data.ustreamerConfig) {
            sabrAdapter.setUstreamerConfig(data.ustreamerConfig);
          }
          resolve();
        }
      };
      window.addEventListener("message", handler);

      sendMessage({
        type: "reload-player-request",
        videoId: sabrData.videoId,
        reloadContext,
      });
    });
  });

  sabrAdapter.attach(player);

  if (
    sabrData.formats.length > 0 &&
    !sabrData.isPostLiveDVR &&
    !sabrData.isLive
  ) {
    sabrAdapter.setStreamingURL(sabrData.streamingUrl);
    if (sabrData.ustreamerConfig) {
      sabrAdapter.setUstreamerConfig(sabrData.ustreamerConfig);
    }
    sabrAdapter.setServerAbrFormats(sabrData.formats);
  }

  // Load manifest
  let manifestUri: string | undefined;
  if (sabrData.isLive || sabrData.isPostLiveDVR) {
    manifestUri = sabrData.liveManifestUrl;
  } else {
    manifestUri = `data:application/dash+xml;base64,${sabrData.manifest}`;
  }

  if (!manifestUri) {
    console.error("[Player] No valid manifest URI");
    return;
  }

  await player.load(manifestUri);
  console.log("[Player]", `Now playing: ${sabrData.title}`);

  // Handle video end
  videoElement.addEventListener("ended", () => {
    console.log("End Track");
    sendMessage({ type: "endvideo" });
  });

  // Handle seek via hash
  window.addEventListener("hashchange", () => {
    const t = getTime();
    if (t) {
      videoElement.currentTime = t;
    }
  });

  // Apply initial seek if present
  const initialTime = getTime();
  if (initialTime) {
    videoElement.currentTime = initialTime;
  }
};

export const init = () => {
  const usePlayer = localStorage.getItem("usePlayer");
  if (!usePlayer || usePlayer === "true") {
    loadYouTubeIFramePlayer();
  } else {
    loadSabrPlayer().catch((err) => {
      console.error("[Player] Failed to initialize SABR player:", err);
    });
  }
};
