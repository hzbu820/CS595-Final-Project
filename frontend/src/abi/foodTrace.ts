import foodTraceJson from './FoodTrace.json';

export const foodTraceAbi = foodTraceJson as typeof foodTraceJson;

export const ROLE_LABELS = {
  [-1]: 'Unregistered',
  0: 'Producer',
  1: 'Transporter',
  2: 'Retailer',
  3: 'Regulator',
} as const;

export type RoleId = keyof typeof ROLE_LABELS;

export const getRoleLabel = (role?: number | bigint | null) => {
  if (role === undefined || role === null) return ROLE_LABELS[-1];
  const numeric = Number(role);
  // @ts-ignore
  return ROLE_LABELS[numeric] ?? ROLE_LABELS[-1];
};
