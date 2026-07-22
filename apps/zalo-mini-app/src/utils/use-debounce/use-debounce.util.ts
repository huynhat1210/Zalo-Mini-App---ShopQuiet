import { useState, useEffect } from "react";
import { TDebounceDelay } from "./use-debounce.type";

export function useDebounce<T>(value: T, delay: TDebounceDelay): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
