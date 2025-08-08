export const application = {
  networkRequest: function (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> {
    // Convert Request object to URL string if needed
    if (input instanceof Request) {
      input = input.url;
    }
    return globalThis.fetch(input, init);
  },
  isNetworkRequestCorsDisabled: async function (): Promise<boolean> {
    return true;
  },
  getCorsProxy: async function (): Promise<string | undefined> {
    return "";
  },
  getTheme: async function (): Promise<string> {
    return "light";
  },
};
