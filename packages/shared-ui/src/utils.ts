// Utility functions shared between the dashboard (frontend) and the
// standalone embeddable widget (packages/widget).

/**
 * Combines class names conditionally (like clsx/twMerge).
 */
export type ClassValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ClassValue[];

export function cn(...classes: ClassValue[]): string {
  const out: string[] = [];
  const walk = (value: ClassValue) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
    } else {
      out.push(String(value));
    }
  };
  classes.forEach(walk);
  return out.join(" ");
}

const VISITOR_SESSION_PREFIX = 'rag_widget_visitor_session_';

/**
 * Returns a session id unique to this browser + chatbot, persisted in
 * localStorage so it survives reloads. Without this, every visitor to a
 * given chatbot's widget would share one hardcoded session id, and the
 * backend would merge all of their conversations into a single thread.
 */
export function getOrCreateVisitorSessionId(chatbotId: string): string {
  const key = `${VISITOR_SESSION_PREFIX}${chatbotId}`;
  if (typeof window === 'undefined') {
    return `widget-${chatbotId}`;
  }
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return `widget-${chatbotId}`;
  }
}

/** Generates and persists a brand new visitor session id, replacing any existing one. */
export function rotateVisitorSessionId(chatbotId: string): string {
  const key = `${VISITOR_SESSION_PREFIX}${chatbotId}`;
  const created = crypto.randomUUID();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, created);
    } catch {
      // ignore — session just won't survive a reload
    }
  }
  return created;
}

/**
 * Formats a timestamp to a readable string.
 */
export function formatTimestamp(date: string | number | Date): string {
  const d = new Date(date);
  return d.toLocaleString();
}

/**
 * Formats execution time in ms to a human-readable string.
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Converts a hex color (#RGB or #RRGGBB) to an "H S% L%" triplet string,
 * matching the format the design system's CSS custom properties expect
 * (e.g. `--primary: 243 75% 59%`).
 */
export function hexToHslTriplet(hex: string): string {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h *= 60;

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
