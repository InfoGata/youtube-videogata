import { createEffect, createSignal } from "solid-js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "./components/ui/accordion";
import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import { Input } from "./components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";
import en from "./locales/en.json";
import {
  getAuthUrl,
  getToken,
  localeStringToLocale,
  MessageType,
  REDIRECT_PATH,
  UiMessageType,
} from "./shared";

const sendUiMessage = (message: UiMessageType) => {
  parent.postMessage(message, "*");
};

const App = () => {
  const [accessToken, setAccessToken] = createSignal("");
  const [playlists, setPlaylists] = createSignal<PlaylistInfo[]>([]);
  const [playlistId, setPlaylistId] = createSignal("");
  const [pluginId, setPluginId] = createSignal("");
  const [redirectUri, setRedirectUri] = createSignal("");
  const [useOwnKeys, setUseOwnKeys] = createSignal(false);
  const [apiKey, setApiKey] = createSignal("");
  const [clientId, setClientId] = createSignal("");
  const [clientSecret, setClientSecret] = createSignal("");
  const [usePlayer, setUsePlayer] = createSignal(true);
  const [instance, setInstance] = createSignal("");
  const [locale, setLocale] = createSignal<{}>(en);
  const [videoUrls, setVideoUrls] = createSignal("");

  createEffect(() => {
    const onNewWindowMessage = (event: MessageEvent<MessageType>) => {
      switch (event.data.type) {
        case "login":
          if (event.data.accessToken) {
            setAccessToken(event.data.accessToken);
          }
          break;
        case "info":
          setRedirectUri(event.data.origin + REDIRECT_PATH);
          setPluginId(event.data.pluginId);
          setApiKey(event.data.apiKey);
          setClientId(event.data.clientId);
          setClientSecret(event.data.clientSecret);
          setUsePlayer(event.data.usePlayer);
          setInstance(event.data.instance);
          setLocale(localeStringToLocale(event.data.locale));
          setPlaylists(event.data.playlists);
          if (event.data.clientId) {
            setUseOwnKeys(true);
          }
          break;
        case "sendinstance":
          setInstance(event.data.instance);
          break;
        default:
          const _exhaustive: never = event.data;
          break;
      }
    };
    window.addEventListener("message", onNewWindowMessage);
    sendUiMessage({ type: "check-login" });
    return () => window.removeEventListener("message", onNewWindowMessage);
  });

  const onLogin = () => {
    const url = getAuthUrl(redirectUri(), pluginId(), clientId());
    const newWindow = window.open(url);

    const onMessage = async (returnUrl: string) => {
      const url = new URL(returnUrl);
      const code = url.searchParams.get("code");
      if (code) {
        const response = await getToken(
          code,
          redirectUri(),
          clientId(),
          clientSecret()
        );
        if (response.access_token) {
          sendUiMessage({
            type: "login",
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
          });
          setAccessToken(response.access_token);
        }
      }
      if (newWindow) {
        newWindow.close();
      }
    };

    window.onmessage = (event: MessageEvent) => {
      if (event.source === newWindow) {
        onMessage(event.data.url);
      } else {
        if (event.data.type === "deeplink") {
          onMessage(event.data.url);
        }
      }
    };
  };

  const onLogout = () => {
    setAccessToken("");
    sendUiMessage({ type: "logout" });
  };

  const onSaveKeys = () => {
    setUseOwnKeys(!!clientId);
    sendUiMessage({
      type: "set-keys",
      clientId: clientId(),
      clientSecret: clientSecret(),
      apiKey: apiKey(),
    });
  };

  const onClearKeys = () => {
    setApiKey("");
    setClientId("");
    setClientSecret("");
    setUseOwnKeys(false);
    sendUiMessage({
      type: "set-keys",
      clientId: "",
      clientSecret: "",
      apiKey: "",
    });
  };

  const getInstance = () => {
    sendUiMessage({ type: "getinstnace" });
  };

  const saveVideoUrl = () => {
    if (playlistId()) {
      sendUiMessage({
        type: "resolve-urls",
        videoUrls: videoUrls(),
        playlistId: playlistId(),
      });
    }
  };

  return (
    <div class="flex">
      <div class="flex flex-col gap-2">
        {accessToken() ? (
          <div>
            <Button onClick={onLogout}>Logout</Button>
          </div>
        ) : (
          <div>
            <Accordion multiple collapsible>
              <AccordionItem value="item-1">
                Advanced Configuration
                <AccordionContent>
                  <Button onClick={onLogin} disabled={!useOwnKeys}>
                    Login
                  </Button>
                  <p>Supplying your own keys</p>
                  <p>
                    {redirectUri()} needs be added to 'Authorized Javascript
                    URIs'
                  </p>
                  <div>
                    <Input
                      placeholder="Api Key"
                      value={apiKey()}
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        setApiKey(value);
                      }}
                    />
                    <Input
                      placeholder="Client ID"
                      value={clientId()}
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        setClientId(value);
                      }}
                    />
                    <Input
                      type="password"
                      placeholder="Client Secret"
                      value={clientSecret()}
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        setClientSecret(value);
                      }}
                    />
                  </div>
                  <div class="flex gap-2">
                    <Button onClick={onSaveKeys}>Save</Button>
                    <Button onClick={onClearKeys} color="error">
                      Clear
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
        <div class="w-full">
          <Input value={instance()} disabled />
        </div>
        <Button onClick={getInstance}>Get Different Instance</Button>
        <div class="flex items-top space-x-2">
          <Checkbox id="player" checked={usePlayer()} onChange={setUsePlayer} />
          <div class="grid gap1.5 leading-none">Use Youtube Player</div>
        </div>
        <div></div>
        <p>Add videos by Url (One Url per line)</p>
        <Textarea
          value={videoUrls()}
          onChange={(e) => {
            const value = e.currentTarget.value;
            setVideoUrls(value);
          }}
          rows={2}
        />
        <Select
          value={playlistId}
          onChange={setPlaylistId}
          placeholder="Placeholder"
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue()}</SelectItem>
          )}
          options={playlists().map((p) => p.id)}
        >
          <SelectTrigger>
            <SelectValue<string>>
              {(state) => state.selectedOption()}
            </SelectValue>
          </SelectTrigger>
        </Select>
        <Button onClick={saveVideoUrl}>Save</Button>
      </div>
    </div>
  );
};

export default App;
