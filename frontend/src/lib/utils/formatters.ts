// Formatting utilities for analytics and UI

export function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatRelativeTime(date: string | number | Date): string {
  const now = Date.now();
  const d = new Date(date).getTime();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
  return `${Math.floor(diff / 86400000)} days ago`;
}

export function formatNumber(n: number): string {
  if (n === undefined || n === null) return '0';
  return new Intl.NumberFormat().format(n);
}

export function formatCompactNumber(n: number): string {
  if (n === undefined || n === null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatChartDate(date: string | number | Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
