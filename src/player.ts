let player: YT.Player;
const loadVideoPlayer = () => {
  (window as any).onYouTubeIframeAPIReady = () => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const apiId = urlSearchParams.get("apiId");
    if (apiId) {
      player = new YT.Player("player", {
        height: "390",
        width: "640",
        videoId: apiId,
        playerVars: {
          playsinline: 1,
        },
        events: {
          onReady: onPlayerReady,
        },
      });
    }
  };

  function onPlayerReady(event: YT.PlayerEvent) {
    event.target.playVideo();
  }
};

export const init = () => {
  loadVideoPlayer();

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName("script")[0];
  firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
};
