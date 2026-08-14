import { useEffect, useRef } from "react";

const STICK_BOTTOM_THRESHOLD_PX = 48;

export function useJobLogPanel(logs: string[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      stickToBottomRef.current = distanceFromBottom <= STICK_BOTTOM_THRESHOLD_PX;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stickToBottomRef.current) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [logs]);

  return {
    containerRef,
  };
}
