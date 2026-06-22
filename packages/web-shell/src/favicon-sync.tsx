'use client';

import { useEffect } from 'react';
import type { SsooAppKey } from './app-identity';
import {
  buildSsooAppIconHref,
  getSsooAppDefaultIconColor,
  normalizeSsooIconAccentColor,
  SSOO_APP_ICON_CONTENT_TYPE,
  SSOO_APP_ICON_SIZES,
} from './app-icon';

export interface SsooFaviconSyncProps {
  appKey: SsooAppKey;
  colorVariable?: string;
}

const DEFAULT_COLOR_VARIABLE = '--ssoo-primary';

function formatHexChannel(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
}

function parseRgbChannel(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    const percentage = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(percentage) ? (percentage / 100) * 255 : null;
  }

  const channel = Number.parseFloat(trimmed);
  return Number.isFinite(channel) ? channel : null;
}

function rgbToHex(value: string): string | null {
  const match = value.trim().match(/^rgba?\((.+)\)$/i);
  if (!match?.[1]) return null;

  const channels = match[1]
    .split(/[,\s/]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(parseRgbChannel);

  if (channels.length !== 3 || channels.some((channel) => channel === null)) {
    return null;
  }

  const [red, green, blue] = channels as [number, number, number];
  return `#${formatHexChannel(red)}${formatHexChannel(green)}${formatHexChannel(blue)}`;
}

function cssColorToHex(value: string): string | null {
  const normalized = normalizeSsooIconAccentColor(value);
  if (normalized) return normalized;

  const rgb = rgbToHex(value);
  if (rgb) return rgb;

  const probe = document.createElement('span');
  probe.style.color = value;
  if (!probe.style.color) return null;

  probe.style.position = 'absolute';
  probe.style.pointerEvents = 'none';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const computedColor = window.getComputedStyle(probe).color;
  probe.remove();

  return rgbToHex(computedColor);
}

function readThemeAccentColor(colorVariable: string, fallback: string): string {
  const owner = document.body ?? document.documentElement;
  const rawValue = window.getComputedStyle(owner).getPropertyValue(colorVariable).trim();
  return cssColorToHex(rawValue) ?? fallback;
}

function upsertIconLink(rel: 'icon' | 'shortcut icon', href: string): void {
  const selector = `link[rel="${rel}"][data-ssoo-managed-favicon="true"], link[rel="${rel}"]`;
  let link = document.head.querySelector<HTMLLinkElement>(selector);

  if (!link) {
    link = document.createElement('link');
    document.head.appendChild(link);
  }

  link.setAttribute('data-ssoo-managed-favicon', 'true');
  link.setAttribute('rel', rel);
  link.setAttribute('href', href);
  link.setAttribute('type', SSOO_APP_ICON_CONTENT_TYPE);
  link.setAttribute('sizes', SSOO_APP_ICON_SIZES);
}

export function SsooFaviconSync({
  appKey,
  colorVariable = DEFAULT_COLOR_VARIABLE,
}: SsooFaviconSyncProps) {
  useEffect(() => {
    let currentAccentColor: string | null = null;
    let frameId: number | null = null;
    const fallbackAccentColor = getSsooAppDefaultIconColor(appKey);

    const sync = () => {
      const accentColor = readThemeAccentColor(colorVariable, fallbackAccentColor);
      if (accentColor === currentAccentColor) return;

      currentAccentColor = accentColor;
      const href = buildSsooAppIconHref({
        accentColor,
        version: `${appKey}-${accentColor.slice(1).toLowerCase()}`,
      });

      upsertIconLink('icon', href);
      upsertIconLink('shortcut icon', href);
    };

    const scheduleSync = () => {
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        sync();
      });
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.documentElement, {
      attributeFilter: ['class', 'style', 'data-ssoo-theme'],
      attributes: true,
    });
    observer.observe(document.body, {
      attributeFilter: ['class', 'style', 'data-ssoo-theme'],
      attributes: true,
    });
    observer.observe(document.head, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    colorSchemeQuery.addEventListener('change', scheduleSync);
    scheduleSync();

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      observer.disconnect();
      colorSchemeQuery.removeEventListener('change', scheduleSync);
    };
  }, [appKey, colorVariable]);

  return null;
}
