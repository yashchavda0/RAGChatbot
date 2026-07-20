import {
  MessageCircle,
  Headset,
  ShoppingCart,
  Briefcase,
  GraduationCap,
  HeartPulse,
  Code2,
  Globe,
  BookOpen,
  Megaphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const CHATBOT_ICONS: Record<string, LucideIcon> = {
  chat: MessageCircle,
  support: Headset,
  sales: ShoppingCart,
  business: Briefcase,
  education: GraduationCap,
  health: HeartPulse,
  code: Code2,
  global: Globe,
  docs: BookOpen,
  marketing: Megaphone,
  creative: Sparkles,
};

export type ChatbotIconKey = keyof typeof CHATBOT_ICONS;

const AVATAR_COLORS = [
  "#5B5EFF",
  "#FF9500",
  "#34C759",
  "#FF3B30",
  "#AF52DE",
  "#00C7BE",
];

export function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
