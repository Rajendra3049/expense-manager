"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * Lightweight "YouTube-style" top progress bar driven by route transitions.
 *
 * Usage:
 *   const { start } = useNavProgress();
 *   start();          // call right before `router.push(...)`
 *   router.push(...)
 *
 * The bar auto-completes on the next `pathname` change. A safety timeout
 * also clears the bar if the navigation never resolves (e.g. cancelled).
 */

type NavProgressContextValue = {
  start: () => void;
  done: () => void;
};

const NavProgressContext = createContext<NavProgressContextValue | null>(null);

const TICK_INTERVAL_MS = 220;
const FADE_OUT_MS = 220;
const SAFETY_TIMEOUT_MS = 8000;

export function NavProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const previousPathnameRef = useRef(pathname);

  const clearTimers = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);

  const done = useCallback(() => {
    if (!activeRef.current) {
      return;
    }
    activeRef.current = false;
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    setProgress(100);
    fadeTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
      fadeTimeoutRef.current = null;
    }, FADE_OUT_MS);
  }, []);

  const start = useCallback(() => {
    clearTimers();
    activeRef.current = true;
    setVisible(true);
    setProgress(15);
    tickIntervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        // Ease toward 90 — never reach it without explicit `done()`.
        return Math.min(90, p + (90 - p) * 0.18);
      });
    }, TICK_INTERVAL_MS);
    safetyTimeoutRef.current = setTimeout(() => {
      done();
    }, SAFETY_TIMEOUT_MS);
  }, [clearTimers, done]);

  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      done();
    }
  }, [pathname, done]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return (
    <NavProgressContext.Provider value={{ start, done }}>
      <div
        aria-hidden={!visible}
        className={`pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 transition-opacity ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className="h-full bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_0_8px_rgba(16,185,129,0.55)] transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {children}
    </NavProgressContext.Provider>
  );
}

export function useNavProgress(): NavProgressContextValue {
  const ctx = useContext(NavProgressContext);
  if (!ctx) {
    throw new Error("useNavProgress must be used within NavProgressProvider");
  }
  return ctx;
}
