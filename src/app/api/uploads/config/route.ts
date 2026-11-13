import { json, serverError } from "@/server/http";
import { getStorage } from "@/server/storage";

export const dynamic = "force-dynamic";

/** Tells the browser how to upload: straight to Vercel Blob ("blob") or to this server ("local", development). */
export async function GET() {
  try {
    return json({ mode: getStorage().mode });
  } catch (err) {
    return serverError("uploads-config", err);
  }
}
