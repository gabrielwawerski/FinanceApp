export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatCurrency(amount, currency = 'PLN') {
  const num = parseFloat(amount) || 0;
  return (
    num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    ' ' +
    currency
  );
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, '0')}/${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}/${date.getFullYear()}`;
}
