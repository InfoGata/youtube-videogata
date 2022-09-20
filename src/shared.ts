import axios from "axios";
const AUTH_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/auth";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const REDIRECT_PATH = "/login_popup.html";

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

export type UiMessageType =
  | UiCheckLoginType
  | UiLoginType
  | UiLogoutType
  | UiSetKeysType
  | UiUsePlayerType
  | UiEndVideoType
  | UiGetInstanceType;

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
};

type SendInstance = {
  type: "sendinstance";
  instance: string;
};

export type MessageType = LoginType | InfoType | SendInstance;

export const enum StorageType {
  Instances = "instances",
  CurrentInstance = "current-instance",
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
  clientId?: string,
  clientSecret?: string
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
  const result = await axios.post<TokenResponse>(tokenUrl, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return result.data;
};
