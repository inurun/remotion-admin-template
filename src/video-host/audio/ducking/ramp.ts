import { clamp } from "remeda";

/** Linear from `y0` at `x0` to `y1` at `x1`, held flat outside that range. */
export function ramp(x: number, [x0, x1]: [number, number], [y0, y1]: [number, number]): number {
  if (x1 <= x0) {
    return x < x1 ? y0 : y1;
  }
  return y0 + (y1 - y0) * clamp((x - x0) / (x1 - x0), { min: 0, max: 1 });
}
