export const SSOO_SHELL_METRICS = {
  sidebar: {
    expandedWidth: 340,
    collapsedWidth: 56,
  },
  header: {
    height: 60,
  },
  tabBar: {
    itemHeight: 36,
    containerHeight: 53,
    itemMinWidth: 120,
    itemMaxWidth: 200,
  },
  overlay: {
    inset: 16,
    panelWidth: 504,
  },
  breakpoint: {
    mobile: 768,
    desktop: 768,
  },
} as const;

export type SsooShellMetrics = typeof SSOO_SHELL_METRICS;
