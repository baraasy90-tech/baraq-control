/** Custom letter outlines keep the identity independent of installed fonts. */
export function BaraqBrand({ compact = false, watermark = false }: { compact?: boolean; watermark?: boolean }) {
  return <span className={watermark ? 'baraq-watermark' : 'baraq-brand'} dir="ltr" aria-hidden={watermark || undefined} aria-label={watermark ? undefined : 'برق BARAQ'}>
    <svg className="baraq-monogram" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <path d="M8 7H26C34 7 38 11 38 16S34 24 26 24H8V41H28M26 24C34 24 39 28 39 35" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M25 30L39 43" stroke="var(--baraq-brand-accent, #e86b2c)" strokeWidth="3.4" />
    </svg>
    {!compact && <svg className="baraq-wordmark" viewBox="0 0 204 34" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
        <path d="M3 4H16C27 4 27 16 16 16H3M3 4V30H16C29 30 29 16 16 16" />
        <path d="M39 30L51 4L63 30" />
        <path d="M79 30V4H91C104 4 104 17 91 17H79M90 17L103 30" />
        <path d="M117 30L129 4L141 30" />
        <path d="M192 17C192 0 165 0 165 17S192 34 192 17Z" />
      </g>
      <path d="M183 23L194 33" stroke="var(--baraq-brand-accent, #e86b2c)" strokeWidth="1.8" />
    </svg>}
  </span>;
}
