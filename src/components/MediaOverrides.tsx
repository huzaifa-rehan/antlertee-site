"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { MediaOverride, MediaOverrides } from "@/lib/media";

const MediaOverridesContext = createContext<MediaOverrides>({});

/** Fed once by the root layout (one cached server read), so <Picture> sees replacements in server and client components. */
export function MediaOverridesProvider({ value, children }: { value: MediaOverrides; children: ReactNode }) {
  return <MediaOverridesContext.Provider value={value}>{children}</MediaOverridesContext.Provider>;
}

export function useMediaOverride(id: string): MediaOverride | undefined {
  return useContext(MediaOverridesContext)[id];
}
