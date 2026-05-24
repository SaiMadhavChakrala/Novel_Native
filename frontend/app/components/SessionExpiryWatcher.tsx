"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface SessionExpiryWatcherProps {
  expiresAt: string | null;
}

export default function SessionExpiryWatcher({ expiresAt }: SessionExpiryWatcherProps) {
  const router = useRouter();

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const refreshIfExpired = () => {
      if (Date.now() >= new Date(expiresAt).getTime()) {
        router.refresh();
      }
    };

    const delayMs = Math.max(new Date(expiresAt).getTime() - Date.now(), 0);
    const timeoutId = window.setTimeout(refreshIfExpired, delayMs + 1000);

    window.addEventListener("focus", refreshIfExpired);
    document.addEventListener("visibilitychange", refreshIfExpired);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", refreshIfExpired);
      document.removeEventListener("visibilitychange", refreshIfExpired);
    };
  }, [expiresAt, router]);

  return null;
}
