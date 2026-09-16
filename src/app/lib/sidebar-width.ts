export const DEFAULT_SIDEBAR_WIDTH = 256;
export const MIN_SIDEBAR_WIDTH = 192;
export const MAX_SIDEBAR_WIDTH = 448;
export const SIDEBAR_RESIZE_THRESHOLD = 4;

export function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));
}

export function nextSidebarWidth(startWidth: number, startX: number, clientX: number) {
  return clampSidebarWidth(startWidth + (clientX - startX));
}

export function isSidebarResizeDrag(startX: number, clientX: number) {
  return Math.abs(clientX - startX) >= SIDEBAR_RESIZE_THRESHOLD;
}
