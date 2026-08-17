import { cn } from "@/lib/utils";

const WIDTH = 120;
const HEIGHT = 34;
const PAD = 3;

export function Sparkline({
  data,
  className,
}: {
  data: number[];
  className?: string;
}) {
  // Empty input would break min/max and the x-axis mapping; bail out early so
  // the caller never sees a NaN-filled polyline. The empty state is handled by
  // the surrounding card (dashboards render a placeholder value instead).
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  // Guard: when all values are equal, range is 0 — the polyline would be
  // degenerate. A unit floor keeps the shape visible as a flat line.
  const range = max - min || 1;

  // Map each data point to an (x,y) coordinate: x is uniformly spaced across
  // the SVG width; y is linearly interpolated between `min` and `max`, with
  // padding so the polyline doesn't touch the SVG edges.
  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * (WIDTH - PAD * 2) + PAD;
      const y = HEIGHT - PAD - ((value - min) / range) * (HEIGHT - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={cn("h-8 w-full", className)}
      aria-hidden="true"
    >
      <polyline
        points={points}
        className="fill-none stroke-current"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
