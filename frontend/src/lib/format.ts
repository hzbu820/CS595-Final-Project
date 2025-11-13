export const formatTimestamp = (value?: bigint | number) => {
  if (!value) return '—';
  const millis = typeof value === 'bigint' ? Number(value) * 1000 : value * 1000;
  return new Date(millis).toLocaleString();
};
