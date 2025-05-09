import ky from "ky";

const AUTH_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/auth";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const REDIRECT_PATH = "/login_popup.html";

export const storage: Storage = {
  get length() {
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  },
  clear: function (): void {
    try {
      localStorage.clear();
    } catch {}
  },
  getItem: function (key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  removeItem: function (key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
  setItem: function (key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  key: function (index: number): string | null {
    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  },
};

type UiCheckLoginType = {
  type: "check-login";
};
type UiLoginType = {
  type: "login";
  accessToken: string;
  refreshToken: string;
};
type UiLogoutType = {
  type: "logout";
};
type UiSetKeysType = {
  type: "set-keys";
  apiKey: string;
  clientId: string;
  clientSecret: string;
};
type UiUsePlayerType = {
  type: "useplayer";
  usePlayer: boolean;
};
type UiEndVideoType = {
  type: "endvideo";
};
type UiGetInstanceType = {
  type: "getinstnace";
};
type UiResolveUrls = {
  type: "resolve-urls";
  videoUrls: string;
  playlistId: string;
};

export type UiMessageType =
  | UiCheckLoginType
  | UiLoginType
  | UiLogoutType
  | UiSetKeysType
  | UiUsePlayerType
  | UiEndVideoType
  | UiGetInstanceType
  | UiResolveUrls;

type LoginType = {
  type: "login";
  accessToken: string;
};

type InfoType = {
  type: "info";
  origin: string;
  pluginId: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  usePlayer: boolean;
  instance: string;
  locale: string;
  playlists: PlaylistInfo[];
};

type SendInstance = {
  type: "sendinstance";
  instance: string;
};

export type MessageType = LoginType | InfoType | SendInstance;

export const enum StorageType {
  PipedInstances = "piped-instances",
  PipedCurrentInstance = "piped-current-instance",
  InvidiousInstances = "invidious-instances",
  InvidiousCurrentInstance = "invidious-current-instance",
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token: string;
}

export const getAuthUrl = (
  redirectUri: string,
  pluginId: string,
  clientId?: string
) => {
  const state = { pluginId: pluginId };
  const url = new URL(AUTH_URL);
  if (clientId) {
    url.searchParams.append("client_id", clientId);
  }
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("scope", AUTH_SCOPE);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("state", JSON.stringify(state));
  url.searchParams.append("include_granted_scopes", "true");
  url.searchParams.append("access_type", "offline");
  url.searchParams.append("prompt", "consent");
  return url;
};

export const getToken = async (
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
) => {
  const tokenUrl = TOKEN_URL;
  const params = new URLSearchParams();
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("grant_type", "authorization_code");

  if (clientId && clientSecret) {
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
  }
  const result = await ky.post<TokenResponse>(tokenUrl, {
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).json();
  return result;
};

export const getYoutubeVideoUrl = (apiId: string): string => {
  return `https://www.youtube.com/watch?v=${apiId}`;
};

export const getYoutubePlaylistUrl = (apiId: string) => {
  return `https://www.youtube.com/playlist?list=${apiId}`;
};

export const getYoutubeChannelUrl = (apiId: string) => {
  return `https://www.youtube.com/channel/${apiId}`;
};
