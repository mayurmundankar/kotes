"use client";

import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMsg(text);
    setShow(true);
    timer.current = setTimeout(() => setShow(false), 1800);
  }, []);

  const node = (
    <div className={`toast${show ? " show" : ""}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
  return [toast, node] as const;
}
