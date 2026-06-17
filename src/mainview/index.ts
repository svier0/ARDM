import Electrobun, { Electroview } from "electrobun/view";

// ── RPC Setup ──

const rpc = Electroview.defineRPC<any>({
  maxRequestTime: 30000,
  handlers: {
    requests: {},
    messages: {
      "redis.ready": ({ connectionId }: { connectionId: string }) => {
        const handlers = eventHandlers.get(connectionId)?.get("ready");
        if (handlers) {
          for (const h of handlers) h();
        }
      },
      "redis.error": ({
        connectionId,
        error,
      }: {
        connectionId: string;
        error: string;
      }) => {
        const handlers = eventHandlers.get(connectionId)?.get("error");
        if (handlers) {
          for (const h of handlers) h(new Error(error));
        }
      },
      "theme.changed": ({ theme }: { theme: string }) => {
        (window as any).__bunRpcTheme = theme;
        document.dispatchEvent(
          new CustomEvent("theme-changed", { detail: { theme } })
        );
      },
      "closingWindow": () => {
        window.dispatchEvent(new Event("beforeunload"));
      },
      "menu.action": ({ action }: { action: string }) => {
        switch (action) {
          case "reload":
            location.reload();
            break;
          case "about":
            alert("Another Redis Desktop Manager\nVersion 1.0.0");
            break;
          case "check-update":
            alert("检查更新功能将在后续版本中实现");
            break;
          default:
            window.dispatchEvent(new CustomEvent("menu-action", { detail: { action } }));
        }
      },
    },
  },
});

// ── Event Handler Registry ──

const eventHandlers = new Map<
  string,
  Map<string, Array<(...args: any[]) => void>>
>();

function onEvent(
  connectionId: string,
  event: string,
  handler: (...args: any[]) => void
) {
  if (!eventHandlers.has(connectionId)) {
    eventHandlers.set(connectionId, new Map());
  }
  const evMap = eventHandlers.get(connectionId)!;
  if (!evMap.has(event)) {
    evMap.set(event, []);
  }
  evMap.get(event)!.push(handler);
}

function offEvent(
  connectionId: string,
  event: string,
  handler: (...args: any[]) => void
) {
  const evMap = eventHandlers.get(connectionId);
  if (!evMap) return;
  const handlers = evMap.get(event);
  if (!handlers) return;
  const idx = handlers.indexOf(handler);
  if (idx >= 0) handlers.splice(idx, 1);
}

// ── BunRPC Client API ──

function createBunRPC() {
  return {
    // ── Redis ──

    async connect(config: any): Promise<string> {
      const { connectionId } = await rpc.request("redis.connect", { config });
      return connectionId;
    },

    async connectSSH(
      sshOptions: any,
      host: string,
      port: number,
      auth: string | undefined,
      config: any
    ): Promise<string> {
      const { connectionId } = await rpc.request("redis.connectSSH", {
        sshOptions,
        host,
        port,
        auth,
        config,
      });
      return connectionId;
    },

    async disconnect(connectionId: string): Promise<void> {
      await rpc.request("redis.disconnect", { connectionId });
    },

    async call(
      connectionId: string,
      command: string,
      args: any[]
    ): Promise<any> {
      return rpc.request("redis.call", { connectionId, command, args });
    },

    async callBuffer(
      connectionId: string,
      command: string,
      args: any[]
    ): Promise<any> {
      return rpc.request("redis.callBuffer", { connectionId, command, args });
    },

    async getStatus(connectionId: string): Promise<string> {
      return rpc.request("redis.getStatus", { connectionId });
    },

    async duplicate(connectionId: string): Promise<string> {
      const { connectionId: newId } = await rpc.request("redis.duplicate", {
        connectionId,
      });
      return newId;
    },

    async nodes(connectionId: string, role: string): Promise<any[]> {
      return rpc.request("redis.nodes", { connectionId, role });
    },

    async scan(
      connectionId: string,
      cursor: string,
      pattern: string,
      count: number,
      db?: number
    ): Promise<{ cursor: string; keys: any[] }> {
      return rpc.request("redis.scan", {
        connectionId,
        cursor,
        pattern,
        count,
        db,
      });
    },

    async hscan(
      connectionId: string,
      key: string,
      cursor: string,
      pattern: string,
      count: number
    ): Promise<{ cursor: string; fields: any[] }> {
      return rpc.request("redis.hscan", {
        connectionId,
        key,
        cursor,
        pattern,
        count,
      });
    },

    async multi(
      connectionId: string,
      commands: Array<{ command: string; args: any[] }>
    ): Promise<any[]> {
      return rpc.request("redis.multi", { connectionId, commands });
    },

    // ── zlib ──

    async decompress(data: number[], type: string): Promise<string | false> {
      return rpc.request("zlib.decompress", { data, type });
    },

    // ── Clipboard ──

    async clipboardWriteText(text: string): Promise<void> {
      await rpc.request("clipboard.writeText", { text });
    },

    async clipboardReadText(): Promise<string> {
      return rpc.request("clipboard.readText", {});
    },

    // ── File ──

    async readFile(filePath: string): Promise<string | undefined> {
      return rpc.request("file.readFile", { filePath });
    },

    async writeFile(filePath: string, data: string): Promise<void> {
      await rpc.request("file.writeFile", { filePath, data });
    },

    // ── Dialog ──

    async showOpenDialog(options: any): Promise<{
      canceled: boolean;
      filePaths: string[];
    }> {
      return rpc.request("dialog.showOpenDialog", { options });
    },

    // ── Args ──

    async getMainArgs(): Promise<{ argv: string[] }> {
      return rpc.request("getMainArgs", {});
    },

    // ── Window Control ──

    async minimizeWindow(): Promise<void> {
      await rpc.request("window.minimize", {});
    },

    async toggleMaximize(): Promise<void> {
      await rpc.request("window.toggleMaximize", {});
    },

    // ── App ──

    async getTempPath(): Promise<string> {
      const { path } = await rpc.request("app.getTempPath", {});
      return path;
    },

    // ── Theme ──

    async getTheme(): Promise<string> {
      const { theme } = await rpc.request("theme.get", {});
      return theme;
    },

    async setTheme(theme: string): Promise<void> {
      await rpc.request("theme.set", { theme });
    },

    // ── Fonts ──

    async getAllFonts(): Promise<string[]> {
      const { fonts } = await rpc.request("fonts.getAll", {});
      return fonts;
    },

    // ── Updater ──

    async checkForUpdate(): Promise<{
      version: string;
      hash: string;
      updateAvailable: boolean;
      updateReady: boolean;
      error: string;
    }> {
      return rpc.request("updater.checkForUpdate", {});
    },

    async downloadUpdate(): Promise<void> {
      await rpc.request("updater.downloadUpdate", {});
    },

    async applyUpdate(): Promise<void> {
      await rpc.request("updater.applyUpdate", {});
    },

    async getLocalInfo(): Promise<{
      version: string;
      hash: string;
      baseUrl: string;
      channel: string;
      name: string;
      identifier: string;
    }> {
      return rpc.request("updater.getLocalInfo", {});
    },

    // ── Event helpers for proxy clients ──

    _onEvent: onEvent,
    _offEvent: offEvent,
  };
}

const bunRpc = createBunRPC();

// Expose globally for the Vue webpack bundle
(window as any).__bunRpc = bunRpc;
(window as any).__bunRpcReady = true;

(async () => {
  try {
    const { theme } = await rpc.request("theme.get", {});
    (window as any).__bunRpcTheme = theme;
  } catch {}
})();

// If there was a promise waiting, resolve it
if ((window as any).__bunRpcResolve) {
  (window as any).__bunRpcResolve(bunRpc);
}

console.log("ARDM view initialized with bunRPC bridge");
