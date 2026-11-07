import { format, parseISO } from 'date-fns';

const toDate = (value) => (typeof value === 'string' ? parseISO(value) : value);

export const formatNumber = (n) => (n ?? 0).toLocaleString('en-IN');

export const formatDate = (value, pattern = 'dd MMM yyyy') => {
  if (!value) return '—';
  return format(toDate(value), pattern);
};

/** Today's date as yyyy-mm-dd for <input type="date"> defaults. */
export const todayISO = () => format(new Date(), 'yyyy-MM-dd');
