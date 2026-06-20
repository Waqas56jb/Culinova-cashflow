// Currency / number / date formatting helpers shared across the app.

export function convert(amountSAR, displayCurrency, rates) {
  if (!displayCurrency || displayCurrency === 'SAR') return amountSAR;
  const r = rates?.[displayCurrency];
  return r ? amountSAR / r : amountSAR;
}

export function money(value, currency = 'SAR', lng = 'en') {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat(lng === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

export function num(value, digits = 0) {
  return (Number(value) || 0).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pct(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

export function fmtDate(value, lng = 'en') {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString(lng === 'ar' ? 'ar-SA' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const statusPill = {
  Green: 'pill pill-green',
  Yellow: 'pill pill-yellow',
  Red: 'pill pill-red',
  Critical: 'pill pill-critical',
  // priorities / generic
  Confirmed: 'pill pill-green',
  High: 'pill pill-red',
  Medium: 'pill pill-yellow',
  Low: 'pill pill-green',
};
