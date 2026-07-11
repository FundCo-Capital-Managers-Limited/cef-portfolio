'use client';

// Recharts' default XAxis silently drops ticks that don't fit the available
// width instead of wrapping/shrinking them — with more than a handful of
// AssetCos, that meant some names just vanished from the axis. Angling the
// labels and forcing every tick to render (interval={0} on the XAxis using
// this) fixes that; long names are truncated here only for the axis label
// itself — the full name still shows in the tooltip via Recharts' default
// label formatting, which reads the untruncated data.
const MAX_LABEL_LENGTH = 14;

function truncate(value) {
  if (!value) return '';
  return value.length > MAX_LABEL_LENGTH ? `${value.slice(0, MAX_LABEL_LENGTH - 1)}…` : value;
}

export default function AngledAxisTick({ x, y, payload }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        dy={10}
        textAnchor="end"
        transform="rotate(-35)"
        fontSize={11}
        fill="#6b7280"
      >
        {truncate(payload.value)}
      </text>
    </g>
  );
}
