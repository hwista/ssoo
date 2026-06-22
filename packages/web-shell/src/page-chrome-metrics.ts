export const SSOO_PAGE_CHROME_METRICS = {
  breadcrumbHeightPx: 24,
  headerMinHeightPx: 54,
  stackPaddingPx: 16,
  stackGapPx: 16,
} as const;

export const SSOO_PAGE_CHROME_CLASSES = {
  stack: 'flex h-full flex-col gap-4 p-4',
  breadcrumb: 'flex h-6 min-h-6 items-center overflow-x-auto text-body-sm text-[color:#4b5563] scrollbar-none',
  header: 'flex min-h-[54px] items-center justify-between rounded-lg border border-ssoo-content-border bg-white px-4 py-2 text-ssoo-primary',
} as const;
