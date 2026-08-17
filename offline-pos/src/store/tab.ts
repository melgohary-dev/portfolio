import { create } from "zustand";

const TAB_ID_KEY = "offlinepos:tab-id";

function makeTabId(): string {
  try {
    const existing = sessionStorage.getItem(TAB_ID_KEY);
    if (existing) return existing;
    const id = `tab_${crypto.randomUUID().slice(0, 8)}`;
    sessionStorage.setItem(TAB_ID_KEY, id);
    return id;
  } catch {
    return `tab_${Math.random().toString(36).slice(2, 10)}`;
  }
}

interface TabState {
  /** Stable per-tab id (sessionStorage survives reloads within a tab). */
  tabId: string;
  /** How many tabs are currently open on this app (from the heartbeat registry). */
  tabsLive: number;
  /** Timestamp of the last update received from another tab. */
  lastRemoteAt: number | null;
  /** Last event name received from another tab. */
  lastRemoteEvent: string | null;
  setTabsLive: (tabsLive: number) => void;
  setLastRemote: (info: { event: string; at: number }) => void;
}

/**
 * Live multi-tab state: how many tabs have the app open right now, and the
 * most recent update that arrived from one of them. This is what powers the
 * "N tabs live · updated 2s ago" card in the sidebar.
 */
export const useTabStore = create<TabState>((set) => ({
  tabId: makeTabId(),
  tabsLive: 1,
  lastRemoteAt: null,
  lastRemoteEvent: null,
  setTabsLive: (tabsLive) => set({ tabsLive }),
  setLastRemote: ({ event, at }) =>
    set({ lastRemoteEvent: event, lastRemoteAt: at }),
}));
