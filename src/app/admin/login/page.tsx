import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { currentAdmin } from "@/server/auth/admin";
import { authConfig, ConfigError } from "@/server/config";

// Config and session are read per request (never baked in at build time).
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let configError = false;
  let devDefaults = false;
  try {
    devDefaults = authConfig().devDefaults;
    if (await currentAdmin()) redirect("/admin/leads/");
  } catch (err) {
    if (err instanceof ConfigError) configError = true;
    else throw err;
  }
  return (
    <div className="adm-wrap">
      <div className="adm-login">
        <h1 className="adm-h1">
          Admin<span className="dot">.</span>
        </h1>
        {configError ? (
          <p role="alert">The admin is not set up yet: ADMIN_PASSWORD_HASH and SESSION_SECRET must be set on the server (see docs/go-live.md).</p>
        ) : (
          <>
            {devDefaults && <p className="adm-dev">Development mode: using the dev-only login from .env.example.</p>}
            <LoginForm />
          </>
        )}
      </div>
    </div>
  );
}
