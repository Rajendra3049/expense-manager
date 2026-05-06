"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  intent?: "default" | "danger";
};

type ConfirmState = ConfirmOptions & {
  open: boolean;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const DEFAULT_STATE: ConfirmState = {
  open: false,
  title: "",
  description: "",
  confirmText: "Confirm",
  cancelText: "Cancel",
  intent: "default",
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>(DEFAULT_STATE);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const close = useCallback(
    (value: boolean) => {
      resolver?.(value);
      setResolver(null);
      setState(DEFAULT_STATE);
    },
    [resolver],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
      setState({
        open: true,
        title: options.title,
        description: options.description ?? "",
        confirmText: options.confirmText ?? "Confirm",
        cancelText: options.cancelText ?? "Cancel",
        intent: options.intent ?? "default",
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state.open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => close(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-description"
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="confirm-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {state.title}
            </h2>
            {state.description ? (
              <p
                id="confirm-description"
                className="mt-2 text-sm text-zinc-600 dark:text-zinc-300"
              >
                {state.description}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => close(false)}
              >
                {state.cancelText}
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${
                  state.intent === "danger"
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                }`}
                onClick={() => close(true)}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx.confirm;
}
