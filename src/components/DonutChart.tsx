export function DonutChart({
  percent,
  size = 56,
  color,
}: {
  percent: number;
  size?: number;
  color?: string;
}) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - clamped / 100);
  const ringColor = color || (percent >= 85 ? "#2E9E52" : percent >= 60 ? "#E86B2C" : "#D64545");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E2DA" strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={ringColor}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.35em"
        fontSize={size * 0.26}
        fontWeight="700"
        fill="#1A2332"
        fontFamily="'IBM Plex Mono', monospace"
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}
