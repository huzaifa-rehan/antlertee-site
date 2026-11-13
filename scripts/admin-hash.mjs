// Prints an ADMIN_PASSWORD_HASH for the admin login (scrypt), so the plain password is never stored anywhere.
//
//   npm run admin:hash              prompts for the password (input hidden)
//   echo "pw" | npm run admin:hash  reads it from stdin
//
// Same format as src/server/auth/session.ts hashPassword(): scrypt:N:r:p:salt:hash
import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";

const N = 16384;
const r = 8;
const p = 1;

function hash(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 32, { N, r, p });
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join(":");
}

async function readPassword() {
  if (!process.stdin.isTTY) {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    return data.replace(/\r?\n$/, "");
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // Hide what is typed.
  rl._writeToOutput = (s) => {
    if (s.includes("Password")) process.stdout.write(s);
  };
  const pw = await new Promise((resolve) => rl.question("Password (min 12 characters): ", resolve));
  rl.close();
  process.stdout.write("\n");
  return pw;
}

const pw = await readPassword();
if (pw.length < 12) {
  console.error("Use at least 12 characters.");
  process.exit(1);
}
console.log(hash(pw));
