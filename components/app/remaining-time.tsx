"use client";

import { useEffect, useState } from "react";
import { remainingLabel } from "@/lib/app/bounty";

export function RemainingTime({
  expiresAt,
}: {
  expiresAt: string | null | undefined;
}) {
  const [label, setLabel] = useState(() => remainingLabel(expiresAt));

  useEffect(() => {
    const tick = () => setLabel(remainingLabel(expiresAt));
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return <span className="tabular-nums">{label}</span>;
}
