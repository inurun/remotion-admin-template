import { cn } from "@/_shared/lib/utils";

type TelopProps = {
  text: string;
  fontSize: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  className?: string;
};

export function Telop({
  text,
  fontSize,
  fill,
  stroke,
  strokeWidth = fontSize * 0.08,
  fontFamily = "var(--font-rowdy), sans-serif",
  fontWeight = 800,
  className,
}: TelopProps) {
  const width = Math.max(1, text.length * fontSize * 0.72);
  const height = fontSize * 1.2;

  return (
    <div className={cn("pointer-events-none", className)}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} overflow="visible">
        <text
          x={0}
          y={fontSize * 0.92}
          fill={fill}
          stroke={stroke}
          strokeWidth={stroke ? strokeWidth : 0}
          strokeLinejoin="round"
          paintOrder="stroke fill"
          fontSize={fontSize}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
        >
          {text}
        </text>
      </svg>
    </div>
  );
}
