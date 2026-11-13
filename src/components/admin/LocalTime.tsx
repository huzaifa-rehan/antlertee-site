"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** A timestamp in the viewer's local time zone (server render shows UTC until hydration). */
export function LocalTime({ iso }: { iso: string }) {
  const local = useSyncExternalStore(
    subscribe,
    () => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    () => `${iso.slice(0, 16).replace("T", " ")} UTC`,
  );
  return <time dateTime={iso}>{local}</time>;
}
