/**
 * Utilitaires d'accessibilité pour le système de layout EcoDeli
 * Conformité WCAG 2.1 AA
 */

// Gestionnaire de focus pour la navigation clavier
export class FocusManager {
  private static instance: FocusManager;
  private focusStack: HTMLElement[] = [];
  private trapEnabled = false;

  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  // Piéger le focus dans un élément (pour les modales, menus)
  trapFocus(element: HTMLElement) {
    if (typeof window === "undefined") return;

    this.trapEnabled = true;
    this.focusStack.push(element);

    const focusableElements = this.getFocusableElements(element);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!this.trapEnabled) return;

      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }

      if (e.key === "Escape") {
        this.releaseFocus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    firstElement.focus();

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      this.releaseFocus();
    };
  }

  // Libérer le piège de focus
  releaseFocus() {
    this.trapEnabled = false;
    const previousElement = this.focusStack.pop();

    if (this.focusStack.length > 0) {
      const currentTrap = this.focusStack[this.focusStack.length - 1];
      this.trapFocus(currentTrap);
    }
  }

  // Obtenir les éléments focusables
  private getFocusableElements(element: HTMLElement): HTMLElement[] {
    const selector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
      "[contenteditable]",
    ].join(", ");

    return Array.from(element.querySelectorAll(selector)) as HTMLElement[];
  }

  // Focus sur le premier élément focusable
  focusFirst(element: HTMLElement) {
    const focusableElements = this.getFocusableElements(element);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  // Focus sur le dernier élément focusable
  focusLast(element: HTMLElement) {
    const focusableElements = this.getFocusableElements(element);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }
}

// Annonceur d'écran pour les changements dynamiques
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer;
  private announcer: HTMLElement | null = null;

  static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer();
    }
    return ScreenReaderAnnouncer.instance;
  }

  constructor() {
    if (typeof window !== "undefined") {
      this.createAnnouncer();
    }
  }

  private createAnnouncer() {
    this.announcer = document.createElement("div");
    this.announcer.setAttribute("aria-live", "polite");
    this.announcer.setAttribute("aria-atomic", "true");
    this.announcer.className = "sr-only";
    this.announcer.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.announcer);
  }

  // Annoncer un message
  announce(message: string, priority: "polite" | "assertive" = "polite") {
    if (!this.announcer) return;

    this.announcer.setAttribute("aria-live", priority);
    this.announcer.textContent = message;

    // Effacer après annonce
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = "";
      }
    }, 1000);
  }

  // Annoncer un changement de page
  announcePageChange(title: string) {
    this.announce(`Navigation vers ${title}`, "polite");
  }

  // Annoncer une erreur
  announceError(error: string) {
    this.announce(`Erreur : ${error}`, "assertive");
  }

  // Annoncer un succès
  announceSuccess(message: string) {
    this.announce(`Succès : ${message}`, "polite");
  }
}

// Gestionnaire de raccourcis clavier
export class KeyboardShortcuts {
  private static instance: KeyboardShortcuts;
  private shortcuts: Map<string, () => void> = new Map();

  static getInstance(): KeyboardShortcuts {
    if (!KeyboardShortcuts.instance) {
      KeyboardShortcuts.instance = new KeyboardShortcuts();
    }
    return KeyboardShortcuts.instance;
  }

  constructor() {
    if (typeof window !== "undefined") {
      this.setupGlobalListeners();
    }
  }

  private setupGlobalListeners() {
    document.addEventListener("keydown", (e) => {
      const key = this.getKeyString(e);
      const callback = this.shortcuts.get(key);

      if (callback && !this.isInInput(e.target as Element)) {
        e.preventDefault();
        callback();
      }
    });
  }

  private getKeyString(e: KeyboardEvent): string {
    const parts = [];
    if (e.ctrlKey) parts.push("ctrl");
    if (e.altKey) parts.push("alt");
    if (e.shiftKey) parts.push("shift");
    if (e.metaKey) parts.push("meta");
    parts.push(e.key.toLowerCase());
    return parts.join("+");
  }

  private isInInput(target: Element): boolean {
    const inputElements = ["input", "textarea", "select"];
    return (
      inputElements.includes(target.tagName.toLowerCase()) ||
      target.getAttribute("contenteditable") === "true"
    );
  }

  // Enregistrer un raccourci
  register(key: string, callback: () => void) {
    this.shortcuts.set(key, callback);
  }

  // Supprimer un raccourci
  unregister(key: string) {
    this.shortcuts.delete(key);
  }

  // Raccourcis par défaut pour EcoDeli
  setupDefaultShortcuts() {
    // Navigation
    this.register("alt+h", () => (window.location.href = "/"));
    this.register("alt+d", () => (window.location.href = "/client"));
    this.register("alt+s", () =>
      document.querySelector<HTMLInputElement>("[data-search]")?.focus(),
    );

    // Accessibilité
    this.register("alt+1", () => this.skipToContent());
    this.register("alt+2", () => this.skipToNavigation());
    this.register("alt+3", () => this.skipToFooter());

    // Interface
    this.register("ctrl+k", () =>
      document.querySelector<HTMLInputElement>("[data-search]")?.focus(),
    );
    this.register("ctrl+/", () => this.showShortcutsHelp());
  }

  private skipToContent() {
    const main = document.querySelector("main");
    if (main) {
      main.focus();
      main.scrollIntoView();
    }
  }

  private skipToNavigation() {
    const nav = document.querySelector("nav");
    if (nav) {
      nav.focus();
      nav.scrollIntoView();
    }
  }

  private skipToFooter() {
    const footer = document.querySelector("footer");
    if (footer) {
      footer.focus();
      footer.scrollIntoView();
    }
  }

  private showShortcutsHelp() {
    // TODO: Ouvrir modal d'aide raccourcis
    console.log("Raccourcis disponibles:", Array.from(this.shortcuts.keys()));
  }
}

// Détection et adaptation des préférences utilisateur
export class AccessibilityPreferences {
  private static instance: AccessibilityPreferences;

  static getInstance(): AccessibilityPreferences {
    if (!AccessibilityPreferences.instance) {
      AccessibilityPreferences.instance = new AccessibilityPreferences();
    }
    return AccessibilityPreferences.instance;
  }

  // Détecter les préférences système
  getSystemPreferences() {
    if (typeof window === "undefined") return {};

    return {
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
      highContrast: window.matchMedia("(prefers-contrast: high)").matches,
      colorScheme: window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light",
      forcedColors: window.matchMedia("(forced-colors: active)").matches,
    };
  }

  // Appliquer les préférences d'accessibilité
  applyPreferences() {
    const prefs = this.getSystemPreferences();

    // Réduire les animations
    if (prefs.reducedMotion) {
      document.documentElement.classList.add("reduce-motion");
    }

    // Contraste élevé
    if (prefs.highContrast) {
      document.documentElement.classList.add("high-contrast");
    }

    // Couleurs forcées (Windows High Contrast)
    if (prefs.forcedColors) {
      document.documentElement.classList.add("forced-colors");
    }
  }

  // Écouter les changements de préférences
  watchPreferences() {
    if (typeof window === "undefined") return;

    const queries = [
      { query: "(prefers-reduced-motion: reduce)", class: "reduce-motion" },
      { query: "(prefers-contrast: high)", class: "high-contrast" },
      { query: "(forced-colors: active)", class: "forced-colors" },
    ];

    queries.forEach(({ query, class: className }) => {
      const mediaQuery = window.matchMedia(query);

      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle(className, e.matches);
      };

      mediaQuery.addEventListener("change", handler);

      // État initial
      document.documentElement.classList.toggle(className, mediaQuery.matches);
    });
  }
}

// Utilitaires ARIA
export const ariaUtils = {
  // Générer un ID unique pour les labels
  generateId: (prefix: string = "ecodeli") => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Associer un label à un input
  associateLabel: (inputId: string, labelId: string) => {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);

    if (input && label) {
      input.setAttribute("aria-labelledby", labelId);
      label.setAttribute("for", inputId);
    }
  },

  // Marquer comme requis
  markRequired: (elementId: string, required: boolean = true) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.setAttribute("aria-required", required.toString());
      if (required) {
        element.setAttribute("required", "");
      } else {
        element.removeAttribute("required");
      }
    }
  },

  // Décrire un élément
  describe: (elementId: string, descriptionId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      const existing = element.getAttribute("aria-describedby");
      const newValue = existing
        ? `${existing} ${descriptionId}`
        : descriptionId;
      element.setAttribute("aria-describedby", newValue);
    }
  },
};

// Hooks React pour l'accessibilité
export function useAccessibility() {
  const focusManager = FocusManager.getInstance();
  const announcer = ScreenReaderAnnouncer.getInstance();
  const shortcuts = KeyboardShortcuts.getInstance();
  const preferences = AccessibilityPreferences.getInstance();

  return {
    // Focus management
    trapFocus: focusManager.trapFocus.bind(focusManager),
    releaseFocus: focusManager.releaseFocus.bind(focusManager),
    focusFirst: focusManager.focusFirst.bind(focusManager),
    focusLast: focusManager.focusLast.bind(focusManager),

    // Screen reader
    announce: announcer.announce.bind(announcer),
    announcePageChange: announcer.announcePageChange.bind(announcer),
    announceError: announcer.announceError.bind(announcer),
    announceSuccess: announcer.announceSuccess.bind(announcer),

    // Keyboard shortcuts
    registerShortcut: shortcuts.register.bind(shortcuts),
    unregisterShortcut: shortcuts.unregister.bind(shortcuts),

    // Preferences
    getPreferences: preferences.getSystemPreferences.bind(preferences),
    applyPreferences: preferences.applyPreferences.bind(preferences),

    // ARIA utilities
    aria: ariaUtils,
  };
}

// CSS pour les préférences d'accessibilité
export const accessibilityCSS = `
  /* Réduction du mouvement */
  .reduce-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Contraste élevé */
  .high-contrast {
    filter: contrast(150%);
  }
  
  /* Couleurs forcées (Windows High Contrast) */
  .forced-colors {
    forced-color-adjust: none;
  }
  
  /* Skip links */
  .skip-link {
    position: absolute;
    top: -40px;
    left: 6px;
    z-index: 1000;
    padding: 8px;
    background: #000;
    color: #fff;
    text-decoration: none;
    border-radius: 0 0 4px 4px;
  }
  
  .skip-link:focus {
    top: 0;
  }
  
  /* Focus visible amélioré */
  :focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  /* Screen reader only */
  .sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }
`;
