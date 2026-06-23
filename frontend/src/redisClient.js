import vue from '@/main.js';
import { writeCMD } from '@/commands.js';

async function awaitBunRpc() {
  while (!window.__bunRpc) {
    await new Promise((r) => setTimeout(r, 10));
  }
  return window.__bunRpc;
}

function convertBuffers(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj instanceof Uint8Array) {
    return typeof Buffer !== 'undefined' ? Buffer.from(obj) : obj;
  }
  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return typeof Buffer !== 'undefined' ? Buffer.from(obj.data) : new Uint8Array(obj.data);
  }
  if (Array.isArray(obj)) {
    return obj.map(convertBuffers);
  }
  return obj;
}

function createRPCProxy(connectionId, config, rpc) {
  const state = {
    _connectionId: connectionId,
    _config: config,
    status: 'connecting',
    options: {
      connectionName: config.connectionName,
      connectionReadOnly: config.connectionReadOnly,
      db: config.db,
    },
    condition: { select: config.db || 0 },
    readyInited: false,
    withoutLogging: false,
    _events: {},
  };

  rpc._onEvent(connectionId, 'ready', () => {
    state.status = 'ready';
  });

  rpc._onEvent(connectionId, 'error', (err) => {
    state.status = 'error';
  });

  const exec = async (command, args) => {
    if (state.options.connectionReadOnly && writeCMD[command.toUpperCase()]) {
      throw new Error('You are in readonly mode! Unable to execute write command!');
    }

    const start = performance.now();
    const response = await rpc.call(connectionId, command, args);
    const cost = performance.now() - start;

    if (!state.withoutLogging) {
      vue.$bus.$emit('commandLog', {
        time: new Date(),
        connectionName: state.options.connectionName,
        command: { name: command.toUpperCase(), args },
        cost,
      });
    }
    state.withoutLogging = false;

    return response;
  };

  const proxy = new Proxy(state, {
    get(target, prop) {
      if (prop === 'then') return undefined;
      if (prop === '_connectionId') return target._connectionId;
      if (prop in target) {
        const val = target[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      }

      // on/removeListener
      if (prop === 'on') {
        return function (event, handler) {
          if (!target._events[event]) target._events[event] = [];
          target._events[event].push(handler);
          rpc._onEvent(connectionId, event, handler);
          return proxy;
        };
      }
      if (prop === 'removeListener' || prop === 'off') {
        return function (event, handler) {
          const handlers = target._events[event];
          if (handlers) {
            const idx = handlers.indexOf(handler);
            if (idx >= 0) handlers.splice(idx, 1);
          }
          rpc._offEvent(connectionId, event, handler);
          return proxy;
        };
      }

      // quit
      if (prop === 'quit') {
        return () => rpc.disconnect(connectionId);
      }

      // duplicate
      if (prop === 'duplicate') {
        return async () => {
          const newId = await rpc.duplicate(connectionId);
          return createRPCProxy(newId, target._config, rpc);
        };
      }

      // nodes (cluster)
      if (prop === 'nodes') {
        return (role) => rpc.nodes(connectionId, role);
      }

      // call(command, args)
      if (prop === 'call') {
        return (command, args) => exec(command, args);
      }

      // callBuffer(command, ...args)
      if (prop === 'callBuffer') {
        return async (...args) => {
          const result = await rpc.callBuffer(connectionId, args[0], args.slice(1));
          return convertBuffers(result);
        };
      }

      // multi
      if (prop === 'multi') {
        return (cmds) => createMultiProxy(connectionId, cmds, rpc);
      }

      // BufferStream variants (must check before endsWith('Buffer'))
      if (typeof prop === 'string' && prop.endsWith('BufferStream')) {
        const baseCmd = prop.slice(0, -12); // remove 'BufferStream'
        if (baseCmd === 'scan') {
          return (opts) => createScanStream(connectionId, opts, rpc);
        }
        if (baseCmd === 'hscan') {
          return (key, opts) => createHScanStream(connectionId, key, opts, rpc);
        }
        return undefined;
      }

      // Buffer command variants
      if (typeof prop === 'string' && prop.endsWith('Buffer')) {
        const baseCmd = prop.slice(0, -6);
        if (baseCmd === 'scan') {
          return async (...args) => {
            const result = await rpc.scan(connectionId, args[0], args[2] || '*', args[4] || 200);
            return [result.cursor, convertBuffers(result.keys)];
          };
        }
        return async (...args) => {
          const result = await rpc.callBuffer(connectionId, baseCmd, args);
          return convertBuffers(result);
        };
      }

      // select
      if (prop === 'select') {
        return async (db) => {
          target.condition.select = db;
          target.options.db = db;
          return exec('select', [db]);
        };
      }

      // Generic method -> Redis command
      if (typeof prop === 'string') {
        return (...args) => exec(prop, args);
      }

      return undefined;
    },

    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });

  return proxy;
}

function createMultiProxy(connectionId, commands, rpc) {
  const queue = [];
  const proxy = {
    callBuffer(command, ...args) {
      queue.push({ command, args });
      return proxy;
    },
    async execBuffer() {
      const results = await rpc.multi(connectionId, queue);
      return results ? convertBuffers(results) : [];
    },
  };
  if (commands) {
    commands.forEach((cmd) => proxy.callBuffer(cmd[0], ...cmd.slice(1)));
  }
  return proxy;
}

function createScanStream(connectionId, options, rpc) {
  const Readable = require('stream').Readable;
  const match = (options && options.match) || '*';
  const count = (options && options.count) || 200;

  const stream = new Readable({ objectMode: true });
  let cursor = '0';
  let reading = false;

  stream._read = function () {
    if (reading || cursor === null) return;
    reading = true;
    rpc.scan(connectionId, cursor, match, count).then((result) => {
      const keys = convertBuffers(result.keys);
      if (result.cursor === '0') {
        cursor = null;
      } else {
        cursor = result.cursor;
      }
      reading = false;
      if (keys.length > 0) stream.push(keys);
      if (cursor === null) stream.push(null);
    }).catch((err) => {
      reading = false;
      stream.destroy(err);
    });
  };

  return stream;
}

function createHScanStream(connectionId, key, options, rpc) {
  const Readable = require('stream').Readable;
  const match = (options && options.match) || '*';
  const count = (options && options.count) || 200;

  const stream = new Readable({ objectMode: true });
  let cursor = '0';
  let reading = false;

  stream._read = function () {
    if (reading || cursor === null) return;
    reading = true;
    rpc.hscan(connectionId, key, cursor, match, count).then((result) => {
      const fields = convertBuffers(result.fields);
      if (result.cursor === '0') {
        cursor = null;
      } else {
        cursor = result.cursor;
      }
      reading = false;
      if (fields.length > 0) stream.push(fields);
      if (cursor === null) stream.push(null);
    }).catch((err) => {
      reading = false;
      stream.destroy(err);
    });
  };

  return stream;
}

export default {
  async createConnection(host, port, auth, config, promise = true, forceStandalone = false, removeDb = false) {
    const rpc = await awaitBunRpc();
    const connectConfig = Object.assign({}, config, { host, port, auth });
    if (removeDb) delete connectConfig.db;

    const clientPromise = rpc.connect(connectConfig).then((connectionId) => {
      return createRPCProxy(connectionId, connectConfig, rpc);
    });

    if (promise) return clientPromise;
    return clientPromise;
  },

  async createSSHConnection(sshOptions, host, port, auth, config) {
    const rpc = await awaitBunRpc();
    return rpc.connectSSH(sshOptions, host, port, auth, config).then((connectionId) => {
      return createRPCProxy(connectionId, config, rpc);
    });
  },
};
