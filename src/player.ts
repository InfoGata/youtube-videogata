import { UiMessageType } from "./shared";

const getTime = () => {
  const hashSearchParams = new URLSearchParams(location.hash.substring(1));
  const t = parseInt(hashSearchParams.get("t") ?? "0", 10) || undefined;
  return t;
};

let player: YT.Player;
const loadVideoPlayer = () => {
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

  function sendMessage(message: UiMessageType) {
    parent.postMessage(message, "*");
  }

  function onPlayerStateChange(event: YT.OnStateChangeEvent) {
    if (event.data === YT.PlayerState.ENDED) {
      console.log("End Track");
      sendMessage({ type: "endvideo" });
    }
  }
};

export const init = () => {
  loadVideoPlayer();

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName("script")[0];
  firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
};
