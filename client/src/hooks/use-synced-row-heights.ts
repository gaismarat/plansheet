import { useCallback, useEffect, useRef, useState } from "react";

export function useSyncedRowHeights() {
  const [heights, setHeights] = useState<Map<string, number>>(new Map());
  const leftRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    observerRef.current = new ResizeObserver((entries) => {
      const newHeights = new Map(heights);
      let hasChanges = false;

      entries.forEach((entry) => {
        const el = entry.target as HTMLTableRowElement;
        const key = el.dataset.rowKey;
        if (key) {
          const height = entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight;
          if (newHeights.get(key) !== height) {
            newHeights.set(key, height);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        setHeights(newHeights);
      }
    });

    leftRefs.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const registerLeftRow = useCallback((key: string, el: HTMLTableRowElement | null) => {
    if (el) {
      el.dataset.rowKey = key;
      leftRefs.current.set(key, el);
      observerRef.current?.observe(el);
    } else {
      const existingEl = leftRefs.current.get(key);
      if (existingEl) {
        observerRef.current?.unobserve(existingEl);
        leftRefs.current.delete(key);
      }
    }
  }, []);

  const getRowHeight = useCallback((key: string): number | undefined => {
    return heights.get(key);
  }, [heights]);

  return { registerLeftRow, getRowHeight, heights };
}
