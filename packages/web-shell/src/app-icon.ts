import type { SsooAppKey } from './app-identity';
import {
  getSsooAppDefaultThemeKey,
  getSsooThemePreset,
  type SsooThemePresetKey,
} from './theme';

export const SSOO_APP_ICON_PATH = '/ssot-icon.svg';
export const SSOO_APP_ICON_CONTENT_TYPE = 'image/svg+xml';
export const SSOO_APP_ICON_SIZES = 'any';
export const SSOO_APP_ICON_COLOR_PARAM = 'accent';

export type SsooAppIconMode = 'light' | 'dark';

export interface SsooAppIconDescriptor {
  url: string;
  type: string;
  sizes: string;
}

export interface SsooAppIconHrefOptions {
  accentColor?: string | null;
  mode?: SsooAppIconMode;
  themeKey?: SsooThemePresetKey;
  version?: string | null;
}

export interface SsooAppIconSvgOptions {
  accentColor: string;
}

export const SSOO_APP_ICON_DESCRIPTOR: SsooAppIconDescriptor = {
  url: SSOO_APP_ICON_PATH,
  type: SSOO_APP_ICON_CONTENT_TYPE,
  sizes: SSOO_APP_ICON_SIZES,
};

function isSsooThemePresetKey(value: string | null): value is SsooThemePresetKey {
  return value !== null && value in {
    admin: true,
    amber: true,
    crm: true,
    dms: true,
    forest: true,
    pms: true,
    rose: true,
    sns: true,
  };
}

function isSsooAppIconMode(value: string | null): value is SsooAppIconMode {
  return value === 'light' || value === 'dark';
}

function expandShortHex(value: string): string {
  return value
    .split('')
    .map((char) => `${char}${char}`)
    .join('');
}

export function normalizeSsooIconAccentColor(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim();
  const match = normalized.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match?.[1]) return null;

  const hex = match[1].length === 3 ? expandShortHex(match[1]) : match[1];
  return `#${hex.toUpperCase()}`;
}

function parseHexColor(value: string): { red: number; green: number; blue: number } {
  const hex = value.slice(1);
  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function getRelativeLuminance(value: string): number {
  const { red, green, blue } = parseHexColor(value);

  const channels = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  const [r, g, b] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastingForegroundColor(backgroundColor: string): string {
  return getRelativeLuminance(backgroundColor) > 0.48 ? '#111827' : '#FFFFFF';
}

export function getSsooAppDefaultIconColor(
  appKey: SsooAppKey,
  mode: SsooAppIconMode = 'light',
): string {
  const themeKey = getSsooAppDefaultThemeKey(appKey);
  const preset = getSsooThemePreset(themeKey);
  return preset[mode].ssooPrimary;
}

function getThemeIconColor(themeKey: SsooThemePresetKey, mode: SsooAppIconMode): string {
  const preset = getSsooThemePreset(themeKey);
  return preset[mode].ssooPrimary;
}

function getRequestSearchParams(request: Request | undefined): URLSearchParams {
  if (!request?.url) return new URLSearchParams();

  try {
    return new URL(request.url).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export function resolveSsooAppIconAccentColor(
  appKey: SsooAppKey,
  request?: Request,
): string {
  const searchParams = getRequestSearchParams(request);
  const requestedMode = searchParams.get('mode');
  const mode = isSsooAppIconMode(requestedMode) ? requestedMode : 'light';
  const requestedAccent = normalizeSsooIconAccentColor(searchParams.get(SSOO_APP_ICON_COLOR_PARAM));

  if (requestedAccent) {
    return requestedAccent;
  }

  const requestedTheme = searchParams.get('theme');
  if (isSsooThemePresetKey(requestedTheme)) {
    return getThemeIconColor(requestedTheme, mode);
  }

  return getSsooAppDefaultIconColor(appKey, mode);
}

export function buildSsooAppIconHref({
  accentColor,
  mode,
  themeKey,
  version,
}: SsooAppIconHrefOptions = {}): string {
  const searchParams = new URLSearchParams();
  const normalizedAccent = normalizeSsooIconAccentColor(accentColor);

  if (normalizedAccent) {
    searchParams.set(SSOO_APP_ICON_COLOR_PARAM, normalizedAccent);
  } else if (themeKey) {
    searchParams.set('theme', themeKey);
  }

  if (mode) {
    searchParams.set('mode', mode);
  }

  if (version) {
    searchParams.set('v', version);
  }

  const query = searchParams.toString();
  return query ? `${SSOO_APP_ICON_PATH}?${query}` : SSOO_APP_ICON_PATH;
}

export function buildSsooAppIconSvg({ accentColor }: SsooAppIconSvgOptions): string {
  const backgroundColor = normalizeSsooIconAccentColor(accentColor) ?? '#111827';
  const foregroundColor = getContrastingForegroundColor(backgroundColor);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" data-ssoo-app-icon="ssot" data-ssoo-icon-accent="${backgroundColor}">
  <rect width="32" height="32" rx="7" fill="${backgroundColor}"/>
  <path d="M23.2 8.6c-1.9-1-4.1-1.5-6.6-1.5-4.7 0-7.7 2.1-7.7 5.5 0 3.1 2.1 4.4 6.9 5.2 3 .5 3.9.9 3.9 2.2 0 1.2-1.1 1.9-3.2 1.9-2.2 0-4.2-.6-6.1-1.8l-1.7 3.2c2.1 1.4 4.7 2.1 7.7 2.1 4.8 0 7.9-2.1 7.9-5.6 0-3.2-2.1-4.6-6.8-5.3-3.1-.5-4-1-4-2.2 0-1.1 1.1-1.8 3-1.8 2 0 3.7.5 5.2 1.4l1.5-3.3Z" fill="${foregroundColor}"/>
  <path d="M8.5 27.2h15" stroke="${foregroundColor}" stroke-width="2" stroke-linecap="round" opacity=".72"/>
</svg>`;
}

export const SSOO_APP_ICON_SVG = buildSsooAppIconSvg({
  accentColor: getSsooAppDefaultIconColor('pms'),
});

export function getSsooAppIconResponse(appKey: SsooAppKey, request?: Request): Response {
  const accentColor = resolveSsooAppIconAccentColor(appKey, request);
  const isCustomAccent = getRequestSearchParams(request).has(SSOO_APP_ICON_COLOR_PARAM);

  return new Response(buildSsooAppIconSvg({ accentColor }), {
    headers: {
      'Cache-Control': isCustomAccent
        ? 'private, max-age=0, must-revalidate'
        : 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Type': SSOO_APP_ICON_CONTENT_TYPE,
    },
  });
}
