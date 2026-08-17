interface OfflinePosDesktop {
  isElectron: boolean;
  platform: string;
  versions: { app: string; chrome: string; node: string };
}

interface Window {
  offlinepos?: OfflinePosDesktop;
}
