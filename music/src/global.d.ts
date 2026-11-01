interface ElectronIpcRenderer {
  send: (channel: string, ...args: unknown[]) => void;
  on: (channel: string, listener: (...args: unknown[]) => void) => void;
  off: (channel: string, listener: (...args: unknown[]) => void) => void;
}

interface Window {
  ipcRenderer?: ElectronIpcRenderer;
  webkitAudioContext?: typeof AudioContext;
}
