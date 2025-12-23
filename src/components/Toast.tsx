import { useEffect, useState } from "react";

interface Toast {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

let toastIdCounter = 0;
const toasts: Toast[] = [];
const listeners: Array<() => void> = [];

export function showToast(message: string, type: "error" | "success" | "info" = "error") {
  const id = `toast-${toastIdCounter++}`;
  toasts.push({ id, message, type });
  listeners.forEach((listener) => listener());
  
  setTimeout(() => {
    const index = toasts.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.splice(index, 1);
      listeners.forEach((listener) => listener());
    }
  }, 5000);
}

export function ToastContainer() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => {
      forceUpdate((n) => n + 1);
    };
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-xl shadow-lg border min-w-[300px] max-w-[500px] flex items-start gap-3 animate-fade-in ${
            toast.type === "error"
              ? "bg-red-500/10 border-red-500/20"
              : toast.type === "success"
              ? "bg-green-500/10 border-green-500/20"
              : "bg-blue-500/10 border-blue-500/20"
          }`}
        >
          <div
            className={`mt-0.5 ${
              toast.type === "error"
                ? "text-red-400"
                : toast.type === "success"
                ? "text-green-400"
                : "text-blue-400"
            }`}
          >
            {toast.type === "error" ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : toast.type === "success" ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <p
            className={`font-medium flex-1 ${
              toast.type === "error"
                ? "text-red-300"
                : toast.type === "success"
                ? "text-green-300"
                : "text-blue-300"
            }`}
          >
            {toast.message}
          </p>
        </div>
      ))}
    </div>
  );
}

