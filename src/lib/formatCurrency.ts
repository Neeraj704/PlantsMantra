export const formatCurrency = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};

export const formatPrice = (price: number): string => {
  return formatCurrency(price);
};
