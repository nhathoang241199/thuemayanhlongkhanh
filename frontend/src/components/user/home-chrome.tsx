"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type HomeChrome = {
  revealed: boolean;
  reveal: () => void;
  reset: () => void;
};

const HomeChromeContext = createContext<HomeChrome | null>(null);

export function HomeChromeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  const reveal = useCallback(() => setRevealed(true), []);
  const reset = useCallback(() => setRevealed(false), []);
  const value = useMemo(
    () => ({ revealed, reveal, reset }),
    [revealed, reveal, reset],
  );

  return (
    <HomeChromeContext.Provider value={value}>
      {children}
    </HomeChromeContext.Provider>
  );
}

export function useHomeChrome(): HomeChrome {
  const value = useContext(HomeChromeContext);
  if (!value) {
    throw new Error("useHomeChrome must be used within HomeChromeProvider");
  }
  return value;
}
