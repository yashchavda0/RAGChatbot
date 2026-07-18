// Shared constants for UI and logic

export const CHATBOT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TRAINING: 'training',
  ERROR: 'error',
};

export const DATE_RANGE_OPTIONS: import('@/types/analytics').DateRangeOption[] = [
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'Last 12 months', value: '12m', days: 365 },
];
