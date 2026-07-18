// Utility functions used across the frontend.
//
// cn/formatTimestamp/formatExecutionTime/hexToHslTriplet now live in
// @ragchatbot/shared-ui (shared with packages/widget) — re-exported here so
// existing `@/lib/utils` imports keep working unchanged.
export { cn, formatTimestamp, formatExecutionTime, hexToHslTriplet } from '@ragchatbot/shared-ui/utils';
export type { ClassValue } from '@ragchatbot/shared-ui/utils';

/**
 * Formats duration in ms to a human-readable string.
 * Alias for formatExecutionTime for consistency with naming.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Copy text to clipboard with fallback for non-secure contexts.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!text) return;

  if (typeof window === "undefined") {
    throw new Error("Clipboard is only available in browser context");
  }

  if (navigator?.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const success = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!success) {
    throw new Error("Copy command failed");
  }
}
