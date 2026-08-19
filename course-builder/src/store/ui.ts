import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  previewMode: boolean;
  propertiesPanelOpen: boolean;
  darkMode: boolean;
  configModalOpen: boolean;
  certificateModalOpen: boolean;
  mobilePaletteOpen: boolean;
  mobilePropertiesOpen: boolean;

  togglePreview: () => void;
  setPreviewMode: (on: boolean) => void;
  togglePropertiesPanel: () => void;
  toggleDarkMode: () => void;
  openConfigModal: () => void;
  closeConfigModal: () => void;
  openCertificateModal: () => void;
  closeCertificateModal: () => void;
  toggleMobilePalette: () => void;
  closeMobilePalette: () => void;
  toggleMobileProperties: () => void;
  closeMobileProperties: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      previewMode: false,
      propertiesPanelOpen: true,
      darkMode:
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark"),
      configModalOpen: false,
      certificateModalOpen: false,
      mobilePaletteOpen: false,
      mobilePropertiesOpen: false,

      togglePreview: () => set((s) => ({ previewMode: !s.previewMode })),
      setPreviewMode: (on) => set({ previewMode: on }),
      togglePropertiesPanel: () =>
        set((s) => ({ propertiesPanelOpen: !s.propertiesPanelOpen })),
      toggleDarkMode: () =>
        set((s) => {
          const next = !s.darkMode;
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", next);
          }
          return { darkMode: next };
        }),
      openConfigModal: () => set({ configModalOpen: true }),
      closeConfigModal: () => set({ configModalOpen: false }),
      openCertificateModal: () => set({ certificateModalOpen: true }),
      closeCertificateModal: () => set({ certificateModalOpen: false }),
      toggleMobilePalette: () =>
        set((s) => ({ mobilePaletteOpen: !s.mobilePaletteOpen, mobilePropertiesOpen: false })),
      closeMobilePalette: () => set({ mobilePaletteOpen: false }),
      toggleMobileProperties: () =>
        set((s) => ({ mobilePropertiesOpen: !s.mobilePropertiesOpen, mobilePaletteOpen: false })),
      closeMobileProperties: () => set({ mobilePropertiesOpen: false }),
    }),
    {
      name: "course-builder:ui",
      partialize: (state) => ({
        darkMode: state.darkMode,
        propertiesPanelOpen: state.propertiesPanelOpen,
      }),
    },
  ),
);
