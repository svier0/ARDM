import Electrobun, { ApplicationMenu, BrowserView, BrowserWindow, Updater, type RPCSchema } from "electrobun/bun";
import Redis from "ioredis";
import { createTunnel } from "tunnel-ssh";
import * as fs from "fs";
import * as zlib from "zlib";
import * as path from "path";
import * as os from "os";

const WINDOW_STATE_FILE = path.join(
  process.env.APPDATA || os.homedir(),
  "ARDM",
  "window_state.json"
);

// 鈹€鈹€ Types 鈹€鈹€

type ConnectionEntry = {
  client: Redis;
  config: Record<string, any>;
  sshServer?: any;
  sshConnection?: any;
};

type SSHOptions = {
  host: string;
  port: number;
  username: string;
  password?: string;
  privatekey?: string;
  privatekeybookmark?: string;
  passphrase?: string;
  timeout?: number;
};

type TLSConfig = {
  ca?: string;
  cabookmark?: string;
  key?: string;
  keybookmark?: string;
  cert?: string;
  certbookmark?: string;
  servername?: string;
};

type RedisConfig = {
  host: string;
  port: number;
  auth?: string;
  db?: number;
  connectionName?: string;
  username?: string;
  sslOptions?: TLSConfig;
  connectionReadOnly?: boolean;
  sentinelOptions?: { masterName: string; nodePassword?: string };
  cluster?: boolean;
  natMap?: Record<string, { host: string; port: number }>;
};

type WindowState = {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized?: boolean;
};

// 鈹€鈹€ RPC Schema 鈹€鈹€

export type ARDMRPC = {
  bun: RPCSchema<{
    requests: {
      "redis.connect": {
        params: { config: RedisConfig };
        result: { connectionId: string };
      };
      "redis.connectSSH": {
        params: {
          sshOptions: SSHOptions;
          host: string;
          port: number;
          auth?: string;
          config: RedisConfig;
        };
        result: { connectionId: string };
      };
      "redis.disconnect": {
        params: { connectionId: string };
        result: void;
      };
      "redis.call": {
        params: { connectionId: string; command: string; args: any[] };
        result: any;
      };
      "redis.callBuffer": {
        params: { connectionId: string; command: string; args: any[] };
        result: any;
      };
      "redis.getStatus": {
        params: { connectionId: string };
        result: string;
      };
      "redis.scan": {
        params: {
          connectionId: string;
          cursor: string;
          pattern: string;
          count: number;
          db?: number;
        };
        result: { cursor: string; keys: any[] };
      };
      "redis.hscan": {
        params: {
          connectionId: string;
          key: string;
          cursor: string;
          pattern: string;
          count: number;
        };
        result: { cursor: string; fields: any[] };
      };
      "redis.multi": {
        params: {
          connectionId: string;
          commands: Array<{ command: string; args: any[] }>;
        };
        result: any[];
      };
      "redis.duplicate": {
        params: { connectionId: string; db?: number };
        result: { connectionId: string };
      };
      "redis.nodes": {
        params: { connectionId: string; role: string };
        result: any[];
      };
      "zlib.decompress": {
        params: { data: number[]; type: string };
        result: string | false;
      };
      "clipboard.writeText": {
        params: { text: string };
        result: void;
      };
      "clipboard.readText": {
        params: {};
        result: string;
      };
      "file.readFile": {
        params: { filePath: string };
        result: string | undefined;
      };
      "file.writeFile": {
        params: { filePath: string; data: string };
        result: void;
      };
      "getMainArgs": {
        params: {};
        result: { argv: string[] };
      };
      "window.minimize": {
        params: {};
        result: void;
      };
      "window.toggleMaximize": {
        params: {};
        result: void;
      };
      "app.getTempPath": {
        params: {};
        result: { path: string };
      };
      "theme.get": {
        params: {};
        result: { theme: string };
      };
      "theme.set": {
        params: { theme: string };
        result: void;
      };
      "fonts.getAll": {
        params: {};
        result: { fonts: string[] };
      };
      "dialog.showOpenDialog": {
        params: { options: any };
        result: { canceled: boolean; filePaths: string[] };
      };
      "updater.checkForUpdate": {
        params: {};
        result: {
          version: string;
          hash: string;
          updateAvailable: boolean;
          updateReady: boolean;
          error: string;
        };
      };
      "updater.downloadUpdate": {
        params: {};
        result: void;
      };
      "updater.applyUpdate": {
        params: {};
        result: void;
      };
      "updater.getLocalInfo": {
        params: {};
        result: {
          version: string;
          hash: string;
          baseUrl: string;
          channel: string;
          name: string;
          identifier: string;
        };
      };
    };
    messages: {
      "redis.ready": { params: { connectionId: string } };
      "redis.error": { params: { connectionId: string; error: string } };
      "theme.changed": { params: { theme: string } };
      "closingWindow": { params: {} };
      "menu.action": { params: { action: string } };
    };
  }>;
  webview: RPCSchema<{
    requests: {};
    messages: {};
  }>;
};

// 鈹€鈹€ hgetall transformer 鈹€鈹€

Redis.Command.setReplyTransformer("hgetall", (result: any) => {
  const arr: any[] = [];
  for (let i = 0; i < result.length; i += 2) {
    arr.push([result[i], result[i + 1]]);
  }
  return arr;
});

// 鈹€鈹€ Connection Manager 鈹€鈹€

class RedisConnectionManager {
  private connections = new Map<string, ConnectionEntry>();
  private connectionIdCounter = 0;

  private nextId(): string {
    return `conn_${++this.connectionIdCounter}`;
  }

  private readFileContent(filePath?: string): Buffer | undefined {
    if (!filePath) return undefined;
    try {
      return fs.readFileSync(filePath);
    } catch {
      return undefined;
    }
  }

  private getRedisOptions(config: RedisConfig): Record<string, any> {
    const tls = config.sslOptions
      ? {
          ca: this.readFileContent(config.sslOptions.ca),
          key: this.readFileContent(config.sslOptions.key),
          cert: this.readFileContent(config.sslOptions.cert),
          servername: config.sslOptions.servername || undefined,
          checkServerIdentity: () => undefined,
          rejectUnauthorized: false,
        }
      : undefined;

    return {
      host: config.host,
      port: config.port,
      family: 0,
      connectTimeout: 30000,
      retryStrategy: (times: number) => {
        const maxRetries = 3;
        if (times >= maxRetries) return false;
        return Math.min(times * 200, 1000);
      },
      enableReadyCheck: false,
      connectionName: config.connectionName || null,
      password: config.auth || undefined,
      db: config.db ?? undefined,
      username: config.username || undefined,
      tls,
      connectionReadOnly: config.connectionReadOnly || undefined,
      stringNumbers: true,
    };
  }

  async createConnection(
    config: RedisConfig
  ): Promise<{ connectionId: string }> {
    const connectionId = this.nextId();
    const options = this.getRedisOptions(config);
    let client: Redis;

    if (config.sentinelOptions) {
      client = new Redis({
        sentinels: [{ host: config.host, port: config.port }],
        sentinelPassword: config.auth || undefined,
        password: config.sentinelOptions.nodePassword,
        name: config.sentinelOptions.masterName,
        connectTimeout: 30000,
        retryStrategy: (times: number) => {
          if (times >= 3) return false;
          return Math.min(times * 200, 1000);
        },
        enableReadyCheck: false,
        connectionName: config.connectionName || null,
        db: config.db ?? undefined,
        username: config.username || undefined,
        tls: options.tls,
      });
    } else if (config.cluster) {
      const clusterOptions = {
        enableReadyCheck: false,
        slotsRefreshTimeout: 30000,
        redisOptions: options,
        natMap: config.natMap || {},
      };
      client = new (Redis as any).Cluster(
        [{ port: config.port, host: config.host }],
        clusterOptions
      ) as unknown as Redis;
    } else {
      client = new Redis(options);
    }

    this.connections.set(connectionId, { client, config });

    client.on("ready", () => {
      this.sendReady(connectionId);
    });

    client.on("error", (err: Error) => {
      this.sendError(connectionId, err.message);
    });

    return { connectionId };
  }

  async createSSHConnection(
    sshOptions: SSHOptions,
    host: string,
    port: number,
    auth: string | undefined,
    config: RedisConfig
  ): Promise<{ connectionId: string }> {
    const privateKeyBuf = this.readFileContent(sshOptions.privatekey);
    const tunnelOpts = { autoClose: false };
    const serverOpts = {};
    const sshOpts = {
      host: sshOptions.host,
      port: sshOptions.port,
      username: sshOptions.username,
      password: sshOptions.password || undefined,
      privateKey: privateKeyBuf || undefined,
      passphrase: sshOptions.passphrase || undefined,
      readyTimeout: (sshOptions.timeout ?? 30) * 1000,
      keepaliveInterval: 10000,
    };
    const forwardOpts = { dstAddr: host, dstPort: port };

    const [server, connection] = await createTunnel(
      tunnelOpts,
      serverOpts,
      sshOpts,
      forwardOpts
    );

    const listenAddr = server.address() as { address: string; port: number };
    const localConfig: RedisConfig = {
      ...config,
      host: listenAddr.address,
      port: listenAddr.port,
      auth,
    };

    // sentinel via SSH
    if (config.sentinelOptions) {
      const tempClient = new Redis(localConfig);
      await new Promise<void>((resolve, reject) => {
        tempClient.on("ready", async () => {
          try {
            const reply = await tempClient.call(
              "sentinel",
              "get-master-addr-by-name",
              config.sentinelOptions!.masterName
            );
            if (!reply) {
              reject(
                new Error(
                  `Master name "${config.sentinelOptions!.masterName}" not exists!`
                )
              );
              return;
            }
            const tunnels = await this.createClusterSSHTunnels(
              sshOpts,
              tunnelOpts,
              serverOpts,
              [{ host: reply[0] as string, port: reply[1] as number }]
            );
            const sentinelConfig: RedisConfig = {
              ...config,
              host: tunnels[0].localHost,
              port: tunnels[0].localPort,
              auth: config.sentinelOptions!.nodePassword,
            };
            const result = await this.createConnection(sentinelConfig);
            this.connections.get(result.connectionId)!.sshServer = server;
            this.connections.get(result.connectionId)!.sshConnection =
              connection;
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        tempClient.on("error", reject);
      });
      tempClient.quit();
      const entry = this.connections.get(
        [...this.connections.keys()].pop()!
      )!;
      return { connectionId: [...this.connections.keys()].pop()! };
    }

    // cluster via SSH
    if (config.cluster) {
      const tempClient = new Redis(localConfig);
      const nodes = await new Promise<{ host: string; port: number }[]>(
        (resolve, reject) => {
          tempClient.on("ready", async () => {
            try {
              const reply = (await tempClient.call(
                "cluster",
                "nodes"
              )) as string;
              const parsed = this.parseClusterNodes(reply);
              resolve(parsed);
            } catch (e) {
              reject(e);
            }
          });
          tempClient.on("error", reject);
        }
      );
      tempClient.quit();

      const tunnels = await this.createClusterSSHTunnels(
        sshOpts,
        tunnelOpts,
        serverOpts,
        nodes
      );
      const natMap: Record<string, { host: string; port: number }> = {};
      for (const t of tunnels) {
        natMap[`${t.dstHost}:${t.dstPort}`] = {
          host: t.localHost,
          port: t.localPort,
        };
      }
      const clusterConfig: RedisConfig = {
        ...config,
        host: tunnels[0].localHost,
        port: tunnels[0].localPort,
        auth,
        natMap,
      };
      const result = await this.createConnection(clusterConfig);
      this.connections.get(result.connectionId)!.sshServer = server;
      this.connections.get(result.connectionId)!.sshConnection = connection;
      return result;
    }

    // standalone via SSH
    const result = await this.createConnection(localConfig);
    this.connections.get(result.connectionId)!.sshServer = server;
    this.connections.get(result.connectionId)!.sshConnection = connection;
    return result;
  }

  private parseClusterNodes(
    nodes: string
  ): { host: string; port: number }[] {
    const result: { host: string; port: number }[] = [];
    for (const line of nodes.split("\n")) {
      if (!line) continue;
      const parts = line.trim().split(" ");
      if (parts[2]?.includes("master")) {
        const dsn = parts[1].split("@")[0];
        const lastColon = dsn.lastIndexOf(":");
        result.push({
          host: dsn.substring(0, lastColon),
          port: parseInt(dsn.substring(lastColon + 1)),
        });
      }
    }
    return result;
  }

  private async createClusterSSHTunnels(
    sshOpts: Record<string, any>,
    tunnelOpts: Record<string, any>,
    serverOpts: Record<string, any>,
    nodes: { host: string; port: number }[]
  ): Promise<
    { localHost: string; localPort: number; dstHost: string; dstPort: number }[]
  > {
    const promises = nodes.map(async (node) => {
      const sshCopy = { ...sshOpts };
      if (sshCopy.privateKey && Buffer.isBuffer(sshCopy.privateKey)) {
        sshCopy.privateKey = Buffer.from(sshCopy.privateKey);
      }
      const [s, c] = await createTunnel(tunnelOpts, serverOpts, sshCopy, {
        dstAddr: node.host,
        dstPort: node.port,
      });
      const addr = s.address() as { address: string; port: number };
      return {
        localHost: addr.address,
        localPort: addr.port,
        dstHost: node.host,
        dstPort: node.port,
      };
    });
    return Promise.all(promises);
  }

  async disconnect(connectionId: string): Promise<void> {
    const entry = this.connections.get(connectionId);
    if (!entry) return;
    try {
      entry.client.quit();
    } catch {}
    if (entry.sshConnection) {
      try {
        entry.sshConnection.end();
      } catch {}
    }
    if (entry.sshServer) {
      try {
        entry.sshServer.close();
      } catch {}
    }
    this.connections.delete(connectionId);
  }

  async call(
    connectionId: string,
    command: string,
    args: any[]
  ): Promise<any> {
    const entry = this.connections.get(connectionId);
    if (!entry) throw new Error(`Connection ${connectionId} not found`);
    return entry.client.call(command, args);
  }

  async callBuffer(
    connectionId: string,
    command: string,
    args: any[]
  ): Promise<any> {
    const entry = this.connections.get(connectionId);
    if (!entry) throw new Error(`Connection ${connectionId} not found`);
    const result = await (entry.client as any).callBuffer(command, ...args);
    return result;
  }

  getStatus(connectionId: string): string {
    const entry = this.connections.get(connectionId);
    if (!entry) return "not_found";
    return entry.client.status;
  }

  async duplicate(
    connectionId: string
  ): Promise<{ connectionId: string }> {
    const entry = this.connections.get(connectionId);
    if (!entry) throw new Error(`Connection ${connectionId} not found`);
    const newId = this.nextId();
    const newClient = entry.client.duplicate();
    this.connections.set(newId, { client: newClient, config: entry.config });
    return { connectionId: newId };
  }

  async nodes(connectionId: string, role: string): Promise<any[]> {
    const entry = this.connections.get(connectionId);
    if (!entry) throw new Error(`Connection ${connectionId} not found`);
    const cluster = entry.client as any;
    if (typeof cluster.nodes === "function") {
      return cluster.nodes(role);
    }
    return [];
  }

  private sendReady(connectionId: string) {
    try {
      rpc.send("redis.ready", { connectionId });
    } catch {}
  }

  private sendError(connectionId: string, error: string) {
    try {
      rpc.send("redis.error", { connectionId, error });
    } catch {}
  }

  getEntry(connectionId: string): ConnectionEntry | undefined {
    return this.connections.get(connectionId);
  }
}

// 鈹€鈹€ Window State Manager 鈹€鈹€

class WindowStateManager {
  private filePath: string;
  state: WindowState;

  constructor(filePath: string, defaultState: WindowState) {
    this.filePath = filePath;
    this.state = this.load(defaultState);
  }

  private load(defaultState: WindowState): WindowState {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = fs.readFileSync(this.filePath, "utf-8");
      return { ...defaultState, ...JSON.parse(data) };
    } catch {
      return { ...defaultState };
    }
  }

  save(partial: Partial<WindowState>): void {
    Object.assign(this.state, partial);
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
    } catch {}
  }
}

// 鈹€鈹€ Helpers 鈹€鈹€

function zlibDecompress(data: number[], type: string): string | false {
  const buf = Buffer.from(data);
  const fnMap: Record<string, (b: Buffer) => Buffer> = {
    unzip: zlib.unzipSync,
    gzip: zlib.gunzipSync,
    deflate: zlib.inflateSync,
    brotli: zlib.brotliDecompressSync,
    deflateRaw: zlib.inflateRawSync,
  };
  const fn = fnMap[type];
  if (!fn) return false;
  try {
    const decompressed = fn(buf);
    if (Buffer.isBuffer(decompressed) && decompressed.length) {
      return decompressed.toString();
    }
  } catch {}
  return false;
}

function readFileSync(filePath: string): string | undefined {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return undefined;
  }
}

// 鈹€鈹€ Font enumeration 鈹€鈹€

let fontCache: string[] | null = null;

function getSystemFonts(): string[] {
  if (fontCache) return fontCache;
  try {
    const { execSync } = require("child_process");
    const output = execSync(
      `powershell -NoProfile -Command "$fonts = New-Object -ComObject Shell.Application; $ns = $fonts.Namespace(0x14); $ns.Items() | ForEach-Object { $_.Name }"`,
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }
    ).toString();
    const fonts = output
      .split("\r\n")
      .filter(Boolean)
      .map((f: string) => f.replace(/\.[^/.]+$/, ""))
      .filter((f: string) => f.length > 0);
    fontCache = [...new Set(fonts)].sort();
    return fontCache;
  } catch {
    return [];
  }
}

// 鈹€鈹€ Clipboard helpers 鈹€鈹€

let clipboardCache = "";

function clipboardWriteText(text: string): void {
  clipboardCache = text;
  try {
    const { execSync } = require("child_process");
    if (process.platform === "win32") {
      const tmpFile = path.join(
        process.env.TEMP || "/tmp",
        `ardm_clip_${Date.now()}.txt`
      );
      fs.writeFileSync(tmpFile, text, "utf-16le");
      execSync(
        `powershell -NoProfile -Command "Get-Content '${tmpFile}' -Encoding UTF8 | Set-Clipboard"`,
        { stdio: "ignore" }
      );
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
    } else if (process.platform === "darwin") {
      execSync("pbcopy", { input: text, stdio: ["pipe", "ignore", "ignore"] });
    } else {
      execSync("xclip -selection clipboard", {
        input: text,
        stdio: ["pipe", "ignore", "ignore"],
      });
    }
  } catch {}
}

function clipboardReadText(): string {
  try {
    const { execSync } = require("child_process");
    if (process.platform === "win32") {
      return execSync(
        'powershell -NoProfile -Command "Get-Clipboard"',
        { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
      ).toString().trim();
    } else if (process.platform === "darwin") {
      return execSync("pbpaste", {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).toString();
    } else {
      return execSync("xclip -selection clipboard -o", {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).toString();
    }
  } catch {
    return clipboardCache;
  }
}

// 鈹€鈹€ Dialog helper 鈹€鈹€

async function showOpenDialog(options: any): Promise<{ canceled: boolean; filePaths: string[] }> {
  try {
    const readline = await import("readline");
    const { stdin, stdout } = process;
    const rl = readline.createInterface({ input: stdin, output: stdout });
    return new Promise((resolve) => {
      rl.question(`File dialog requested (options: ${JSON.stringify(options)})\nEnter file path: `, (answer) => {
        rl.close();
        if (!answer.trim()) {
          resolve({ canceled: true, filePaths: [] });
        } else {
          resolve({ canceled: false, filePaths: [answer.trim()] });
        }
      });
    });
  } catch {
    return { canceled: true, filePaths: [] };
  }
}

// 鈹€鈹€ RPC Setup 鈹€鈹€

const manager = new RedisConnectionManager();
let currentTheme = "light";

const rpc = BrowserView.defineRPC<ARDMRPC>({
  maxRequestTime: 30000,
  handlers: {
    requests: {
      "redis.connect": async ({ config }) => {
        return manager.createConnection(config);
      },
      "redis.connectSSH": async ({
        sshOptions,
        host,
        port,
        auth,
        config,
      }) => {
        return manager.createSSHConnection(sshOptions, host, port, auth, config);
      },
      "redis.disconnect": async ({ connectionId }) => {
        await manager.disconnect(connectionId);
      },
      "redis.call": async ({ connectionId, command, args }) => {
        return manager.call(connectionId, command, args);
      },
      "redis.callBuffer": async ({ connectionId, command, args }) => {
        return manager.callBuffer(connectionId, command, args);
      },
      "redis.getStatus": async ({ connectionId }) => {
        return manager.getStatus(connectionId);
      },
      "redis.scan": async ({ connectionId, cursor, pattern, count, db }) => {
        const entry = manager.getEntry(connectionId);
        if (!entry) throw new Error(`Connection ${connectionId} not found`);
        if (db !== undefined) await entry.client.select(db);
        const client = entry.client as any;
        if (client.nodes) {
          const nodes = client.nodes("master");
          let allKeys: any[] = [];
          let resultCursor = "0";
          for (const node of nodes) {
            const result = await node.scanBuffer(
              cursor,
              "MATCH",
              pattern,
              "COUNT",
              count
            );
            resultCursor = result[0];
            allKeys = allKeys.concat(result[1]);
          }
          return { cursor: resultCursor, keys: allKeys };
        }
        const result = await (client as any).scanBuffer(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          count
        );
        return { cursor: result[0], keys: result[1] };
      },
      "redis.hscan": async ({
        connectionId,
        key,
        cursor,
        pattern,
        count,
      }) => {
        const entry = manager.getEntry(connectionId);
        if (!entry) throw new Error(`Connection ${connectionId} not found`);
        const client = entry.client as any;
        const result = await client.hscanBuffer(
          key,
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          count
        );
        return { cursor: result[0], fields: result[1] };
      },
      "redis.multi": async ({ connectionId, commands }) => {
        const entry = manager.getEntry(connectionId);
        if (!entry) throw new Error(`Connection ${connectionId} not found`);
        const multi = entry.client.multi();
        for (const cmd of commands) {
          multi.call(cmd.command, cmd.args);
        }
        return multi.exec();
      },
      "redis.duplicate": async ({ connectionId, db }) => {
        return manager.duplicate(connectionId);
      },
      "redis.nodes": async ({ connectionId, role }) => {
        return manager.nodes(connectionId, role);
      },
      "zlib.decompress": async ({ data, type }) => {
        return zlibDecompress(data, type);
      },
      "clipboard.writeText": async ({ text }) => {
        clipboardWriteText(text);
      },
      "clipboard.readText": async () => {
        return clipboardReadText();
      },
      "file.readFile": async ({ filePath }) => {
        return readFileSync(filePath);
      },
      "file.writeFile": async ({ filePath, data }) => {
        try {
          fs.writeFileSync(filePath, data, "utf-8");
        } catch {}
      },
      "getMainArgs": async () => {
        return { argv: process.argv };
      },
      "dialog.showOpenDialog": async ({ options }) => {
        return { canceled: true, filePaths: [] };
      },
      "window.minimize": async () => {
        win.minimize();
      },
      "window.toggleMaximize": async () => {
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
      },
      "app.getTempPath": async () => {
        return { path: os.tmpdir() };
      },
      "theme.get": async () => {
        return { theme: currentTheme };
      },
      "theme.set": async ({ theme }) => {
        currentTheme = theme;
        try {
          rpc.send("theme.changed", { theme });
        } catch {}
      },
      "fonts.getAll": async () => {
        return { fonts: getSystemFonts() };
      },
      "updater.checkForUpdate": async () => {
        try {
          return await Updater.checkForUpdate();
        } catch (e) {
          return {
            version: "",
            hash: "",
            updateAvailable: false,
            updateReady: false,
            error: String(e),
          };
        }
      },
      "updater.downloadUpdate": async () => {
        try {
          await Updater.downloadUpdate();
        } catch {}
      },
      "updater.applyUpdate": async () => {
        try {
          await Updater.applyUpdate();
        } catch {}
      },
      "updater.getLocalInfo": async () => {
        try {
          return await Updater.getLocalInfo();
        } catch (e) {
          return {
            version: "",
            hash: "",
            baseUrl: "",
            channel: "",
            name: "",
            identifier: "",
          };
        }
      },
    },
    messages: {},
  },
});

// 鈹€鈹€ Window Setup 鈹€鈹€

const windowState = new WindowStateManager(WINDOW_STATE_FILE, {
  width: 1200,
  height: 800,
  maximized: false,
});

const hasPosition =
  windowState.state.x !== undefined && windowState.state.y !== undefined;

const win = new BrowserWindow({
  title: "Another Redis Desktop Manager",
  url: "views://mainview/index.html",
  frame: {
    x: hasPosition ? windowState.state.x! : 0,
    y: hasPosition ? windowState.state.y! : 0,
    width: windowState.state.width,
    height: windowState.state.height,
    center: !hasPosition,
  },
  rpc,
});

if (windowState.state.maximized) {
  win.maximize();
}

ApplicationMenu.setApplicationMenu([
  { submenu: [{ label: "关于 ARDM", action: "about" }, { type: "separator" }, { label: "退出", role: "quit" }] },
  { label: "文件", submenu: [{ label: "新建连接", action: "new-connection", accelerator: "n" }, { label: "导入配置", action: "import-config" }, { label: "导出配置", action: "export-config" }, { type: "separator" }, { role: "close" }] },
  { label: "编辑", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
  { label: "视图", submenu: [{ label: "重新加载", action: "reload", accelerator: "r" }, { label: "开发者工具", action: "toggle-devtools", accelerator: "i" }, { type: "separator" }, { role: "toggleFullScreen" }] },
  { label: "帮助", submenu: [{ label: "检查更新", action: "check-update" }, { type: "separator" }, { label: "关于", action: "about" }] },
]);

Electrobun.events.on("application-menu-clicked", (e) => {
  rpc.send("menu.action", { action: e.data.action });
});

win.on("resize", () => {
  try {
    const frame = win.getFrame();
    windowState.save({
      width: frame.width,
      height: frame.height,
      maximized: win.isMaximized(),
    });
  } catch {}
});

win.on("move", () => {
  try {
    const pos = win.getPosition();
    windowState.save({
      x: pos.x,
      y: pos.y,
    });
  } catch {}
});

win.on("close", () => {
  try {
    rpc.send("closingWindow", {});
  } catch {}
  console.log("ARDM window closed");
});

console.log("ARDM main process started");
