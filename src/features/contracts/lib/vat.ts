export interface VatBreakdown {
  valueExcludingVat: number;
  vatAmount: number;
  valueIncludingVat: number;
}

export function computeVat(totalValue: number, vatInclusive: boolean, vatRate: number): VatBreakdown {
  const rate = vatRate / 100;
  if (vatInclusive) {
    const valueExcludingVat = totalValue / (1 + rate);
    return { valueExcludingVat, vatAmount: totalValue - valueExcludingVat, valueIncludingVat: totalValue };
  }
  const vatAmount = totalValue * rate;
  return { valueExcludingVat: totalValue, vatAmount, valueIncludingVat: totalValue + vatAmount };
}
