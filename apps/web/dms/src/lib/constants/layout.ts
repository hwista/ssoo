export const BREAKPOINTS = {
  mobile: 768,
  desktop: 768,
} as const;

export const LAYOUT_SIZES = {
  sidebar: {
    expandedWidth: 340,
    collapsedWidth: 56,
  },
  header: {
    height: 60,
  },
  tabBar: {
    height: 36,
    containerHeight: 53,
    tabMinWidth: 120,
    tabMaxWidth: 200,
  },
  rightPanel: {
    inset: 16,
    overlayWidth: 504,
  },
} as const;
