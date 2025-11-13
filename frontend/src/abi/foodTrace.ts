import foodTraceJson from './FoodTrace.json';

export const foodTraceAbi = foodTraceJson as typeof foodTraceJson;

export const ROLE_LABELS = {
  0: 'Unregistered',
  1: 'Producer',
  2: 'Transporter',
  3: 'Retailer',
  4: 'Regulator',
} as const;

export type RoleId = keyof typeof ROLE_LABELS;

export const getRoleLabel = (role?: number | bigint | null) => {
  if (role === undefined || role === null) return ROLE_LABELS[0];
  const numeric = Number(role);
  return ROLE_LABELS[numeric as RoleId] ?? ROLE_LABELS[0];
};
