// Stub for Electron API - runs in WebView2 without Node.js
export const ipcRenderer = {
  invoke: async () => {},
  on: () => {},
  send: () => {},
};

export const remote = {
  app: { getPath: () => '', startAccessingSecurityScopedResource: () => {} },
  dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
};

export const clipboard = {
  readText: () => '',
  writeText: () => {},
  read: () => '',
  write: () => {},
};

export const shell = {
  openExternal: () => {},
};

export const webFrame = {
  setZoomFactor: () => {},
  getZoomFactor: () => 1,
};

export const nativeTheme = {
  shouldUseDarkColors: false,
  on: () => {},
};
