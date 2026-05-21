"use client";

import { useEffect, useState } from "react";

/** Giá trị cập nhật sau `delayMs` kể từ lần `value` đổi cuối — dùng cho filter/search. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
