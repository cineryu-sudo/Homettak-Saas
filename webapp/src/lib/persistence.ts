"use client";

import { useEffect, useState } from "react";

export const STORAGE_KEYS = {
  orders: "homettak_orders_v1",
  technicians: "homettak_technicians_v1",
} as const;

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    return parseJson<T>(window.localStorage.getItem(key), initialValue);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}
