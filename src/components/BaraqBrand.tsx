/** A typographic signature independent of the customer's logo. */
export function BaraqBrand({ compact = false, watermark = false }: { compact?: boolean; watermark?: boolean }) {
  return <span className={watermark ? 'baraq-watermark' : 'baraq-brand'} dir="ltr" aria-hidden={watermark || undefined} aria-label={watermark ? undefined : 'برق BARAQ'}>
    <span className="baraq-monogram">B<span>Q</span></span>
    {!compact && <span className="baraq-wordmark">BARAQ</span>}
  </span>;
}
