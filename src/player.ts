import { UiMessageType } from "./shared";

let player: YT.Player;
const loadVideoPlayer = () => {
  (window as any).onYouTubeIframeAPIReady = () => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const apiId = urlSearchParams.get("apiId");
    if (apiId) {
      player = new YT.Player("player", {
        width: "100%",
        height: "100%",
        videoId: apiId,
        playerVars: {
          playsinline: 1,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
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
