import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { TutorialConfig, TutorialStepConfig, OverlayConfig } from "@/hooks/shared/use-tutorial";

export interface TutorialStore {
  // State
  isOverlayVisible: boolean;
  currentTarget: string | null;
  overlayConfig: OverlayConfig | null;
  highlightedElement: HTMLElement | null;
  isAnimating: boolean;
  
  // Tutorial navigation
  canGoNext: boolean;
  canGoPrevious: boolean;
  canSkip: boolean;
  canClose: boolean;
  
  // UI State
  overlayStyle: React.CSSProperties;
  targetPosition: { top: number; left: number; width: number; height: number } | null;
  
  // Actions
  showOverlay: (config: OverlayConfig, targetElement?: string) => void;
  hideOverlay: () => void;
  updateOverlayConfig: (config: Partial<OverlayConfig>) => void;
  setHighlightedElement: (element: HTMLElement | null) => void;
  setTargetPosition: (position: { top: number; left: number; width: number; height: number } | null) => void;
  setNavigationState: (state: {
    canGoNext?: boolean;
    canGoPrevious?: boolean;
    canSkip?: boolean;
    canClose?: boolean;
  }) => void;
  
  // Animation
  startAnimation: () => void;
  endAnimation: () => void;
  
  // Utility
  reset: () => void;
}

const defaultOverlayConfig: OverlayConfig = {
  showBackdrop: true,
  allowClickOutside: false,
  highlightTarget: true,
  animation: "fade",
};

export const useTutorialStore = create<TutorialStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isOverlayVisible: false,
        currentTarget: null,
        overlayConfig: null,
        highlightedElement: null,
        isAnimating: false,
        canGoNext: true,
        canGoPrevious: true,
        canSkip: false,
        canClose: false,
        overlayStyle: {},
        targetPosition: null,

        // Actions
        showOverlay: (config: OverlayConfig, targetElement?: string) => {
          const finalConfig = { ...defaultOverlayConfig, ...config };
          
          set({
            isOverlayVisible: true,
            currentTarget: targetElement || null,
            overlayConfig: finalConfig,
            overlayStyle: {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              backgroundColor: finalConfig.showBackdrop 
                ? "rgba(0, 0, 0, 0.5)" 
                : "transparent",
              pointerEvents: finalConfig.allowClickOutside ? "none" : "auto",
              ...finalConfig.customStyles,
            },
          });

          // If targeting a specific element, scroll to it and highlight
          if (targetElement) {
            setTimeout(() => {
              const element = document.querySelector(targetElement) as HTMLElement;
              if (element) {
                get().setHighlightedElement(element);
                get().scrollToTarget(element);
                get().calculateTargetPosition(element);
              }
            }, 100);
          }
        },

        hideOverlay: () => {
          const { overlayConfig } = get();
          const animationDuration = overlayConfig?.animation === "fade" ? 300 : 200;
          
          set({ isAnimating: true });
          
          setTimeout(() => {
            set({
              isOverlayVisible: false,
              currentTarget: null,
              overlayConfig: null,
              highlightedElement: null,
              targetPosition: null,
              isAnimating: false,
            });
          }, animationDuration);
        },

        updateOverlayConfig: (newConfig: Partial<OverlayConfig>) => {
          const { overlayConfig } = get();
          if (!overlayConfig) return;

          const updatedConfig = { ...overlayConfig, ...newConfig };
          set({
            overlayConfig: updatedConfig,
            overlayStyle: {
              ...get().overlayStyle,
              backgroundColor: updatedConfig.showBackdrop 
                ? "rgba(0, 0, 0, 0.5)" 
                : "transparent",
              pointerEvents: updatedConfig.allowClickOutside ? "none" : "auto",
              ...updatedConfig.customStyles,
            },
          });
        },

        setHighlightedElement: (element: HTMLElement | null) => {
          const { highlightedElement } = get();
          
          // Remove previous highlight
          if (highlightedElement) {
            highlightedElement.style.removeProperty("box-shadow");
            highlightedElement.style.removeProperty("z-index");
            highlightedElement.style.removeProperty("position");
          }

          // Add new highlight
          if (element) {
            const originalPosition = getComputedStyle(element).position;
            
            element.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.8), 0 0 20px rgba(59, 130, 246, 0.3)";
            element.style.zIndex = "10000";
            
            if (originalPosition === "static") {
              element.style.position = "relative";
            }
          }

          set({ highlightedElement: element });
        },

        setTargetPosition: (position) => {
          set({ targetPosition: position });
        },

        setNavigationState: (navigationState) => {
          set({
            canGoNext: navigationState.canGoNext ?? get().canGoNext,
            canGoPrevious: navigationState.canGoPrevious ?? get().canGoPrevious,
            canSkip: navigationState.canSkip ?? get().canSkip,
            canClose: navigationState.canClose ?? get().canClose,
          });
        },

        startAnimation: () => {
          set({ isAnimating: true });
        },

        endAnimation: () => {
          set({ isAnimating: false });
        },

        reset: () => {
          const { highlightedElement } = get();
          
          // Clean up highlighted element
          if (highlightedElement) {
            highlightedElement.style.removeProperty("box-shadow");
            highlightedElement.style.removeProperty("z-index");
            highlightedElement.style.removeProperty("position");
          }
          
          set({
            isOverlayVisible: false,
            currentTarget: null,
            overlayConfig: null,
            highlightedElement: null,
            isAnimating: false,
            canGoNext: true,
            canGoPrevious: true,
            canSkip: false,
            canClose: false,
            overlayStyle: {},
            targetPosition: null,
          });
        },

        // Helper methods (not in state)
        scrollToTarget: (element: HTMLElement) => {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        },

        calculateTargetPosition: (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          const position = {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          };
          get().setTargetPosition(position);
        },
      }),
      {
        name: "tutorial-store",
        // Only persist essential state
        partialize: (state) => ({
          // Don't persist overlay state, DOM references, or positions
          canGoNext: state.canGoNext,
          canGoPrevious: state.canGoPrevious,
          canSkip: state.canSkip,
          canClose: state.canClose,
        }),
      }
    ),
    {
      name: "tutorial-store",
    }
  )
);

// Helper hooks for common use cases
export const useTutorialOverlay = () => {
  const store = useTutorialStore();
  return {
    isVisible: store.isOverlayVisible,
    show: store.showOverlay,
    hide: store.hideOverlay,
    config: store.overlayConfig,
    style: store.overlayStyle,
    isAnimating: store.isAnimating,
  };
};

export const useTutorialNavigation = () => {
  const store = useTutorialStore();
  return {
    canGoNext: store.canGoNext,
    canGoPrevious: store.canGoPrevious,
    canSkip: store.canSkip,
    canClose: store.canClose,
    setNavigationState: store.setNavigationState,
  };
};

export const useTutorialHighlight = () => {
  const store = useTutorialStore();
  return {
    highlightedElement: store.highlightedElement,
    targetPosition: store.targetPosition,
    setHighlightedElement: store.setHighlightedElement,
    setTargetPosition: store.setTargetPosition,
  };
};