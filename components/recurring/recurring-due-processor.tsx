"use client";

import { useEffect, useRef } from "react";
import { useProcessDueRecurringMutation } from "@/features/recurring/use-recurring-data";

/**
 * Runs once when the expenses dashboard loads: inserts expenses for any
 * active recurring rules whose next_date is on or before today, then
 * advances next_date (client-side scheduler).
 */
export function RecurringDueProcessor() {
  const ran = useRef(false);
  const { mutateAsync } = useProcessDueRecurringMutation();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void mutateAsync().catch(() => {
      /* errors are benign if migrations missing; user can fix DB */
    });
  }, [mutateAsync]);

  return null;
}
