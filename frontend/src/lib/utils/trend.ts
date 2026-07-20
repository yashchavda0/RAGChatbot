export interface ChatbotTrend {
  direction: "up" | "down" | "new" | "none";
  percent?: number;
}

export function computeTrend(
  thisWeek: number,
  priorWeek: number,
): ChatbotTrend {
  if (priorWeek === 0) {
    return thisWeek > 0 ? { direction: "new" } : { direction: "none" };
  }
  const percent = Math.round(((thisWeek - priorWeek) / priorWeek) * 100);
  if (percent === 0) return { direction: "none" };
  return { direction: percent > 0 ? "up" : "down", percent: Math.abs(percent) };
}
