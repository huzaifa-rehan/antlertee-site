// Session signing / verification, CSRF tokens, password hashing and the rate-limit decision.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideRate, RATE_RULES } from "../src/server/ratelimit-core.ts";
import {
  checkPassword,
  csrfToken,
  hashIp,
  hashPassword,
  isPasswordHash,
  signSession,
  signingKey,
  verifyCsrf,
  verifySession,
} from "../src/server/auth/session.ts";

const SECRET = "test-secret-0123456789-abcdefghijklmnop";
const NOW = 1_800_000_000;

describe("sessions", () => {
  it("round-trips a valid token", () => {
    const { token, payload } = signSession(SECRET, NOW);
    assert.deepEqual(verifySession(SECRET, token, NOW + 10), payload);
  });
  it("rejects expired, future-dated, tampered and foreign tokens", () => {
    const { token } = signSession(SECRET, NOW, 60);
    assert.equal(verifySession(SECRET, token, NOW + 60), null, "expired");
    assert.equal(verifySession(SECRET, signSession(SECRET, NOW + 3600).token, NOW), null, "issued in the future");
    assert.equal(verifySession("other-secret", token, NOW), null, "wrong key");
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sid: "x", iat: NOW, exp: NOW + 99999 })).toString("base64url");
    assert.equal(verifySession(SECRET, `${forged}.${sig}`, NOW), null, "body swapped");
    assert.equal(verifySession(SECRET, `${body}.${sig.slice(0, -2)}xx`, NOW), null, "signature changed");
    for (const junk of [undefined, null, "", "a", "a.b.c", "x".repeat(600)]) assert.equal(verifySession(SECRET, junk, NOW), null);
  });
  it("binds CSRF tokens to the session", () => {
    const a = signSession(SECRET, NOW).payload;
    const b = signSession(SECRET, NOW).payload;
    assert.notEqual(a.sid, b.sid);
    assert.equal(verifyCsrf(SECRET, a.sid, csrfToken(SECRET, a.sid)), true);
    assert.equal(verifyCsrf(SECRET, a.sid, csrfToken(SECRET, b.sid)), false);
    assert.equal(verifyCsrf(SECRET, a.sid, ""), false);
    assert.equal(verifyCsrf(SECRET, a.sid, null), false);
  });
  it("changing the password changes the signing key (logs everyone out)", () => {
    const k1 = signingKey(SECRET, "hash-one");
    const k2 = signingKey(SECRET, "hash-two");
    assert.notEqual(k1, k2);
    const { token } = signSession(k1, NOW);
    assert.equal(verifySession(k2, token, NOW), null);
  });
});

describe("passwords", () => {
  it("hashes with scrypt and verifies in constant time", () => {
    const hash = hashPassword("correct horse battery");
    assert.equal(isPasswordHash(hash), true);
    assert.ok(!hash.includes("$"), "no $ (would be mangled by .env expansion)");
    assert.equal(checkPassword("correct horse battery", { hash }), true);
    assert.equal(checkPassword("correct horse batterY", { hash }), false);
    assert.equal(checkPassword("", { hash }), false);
  });
  it("supports a plain password and refuses when nothing is configured", () => {
    assert.equal(checkPassword("pw-123456789", { plain: "pw-123456789" }), true);
    assert.equal(checkPassword("pw-12345678", { plain: "pw-123456789" }), false);
    assert.equal(checkPassword("anything", {}), false);
    assert.equal(checkPassword("x", { hash: "not-a-hash" }), false);
    assert.equal(checkPassword("x".repeat(300), { plain: "x".repeat(300) }), false, "over-long input refused");
  });
  it("hashes IPs with a salt (never stores the raw value)", () => {
    const h = hashIp(SECRET, "203.0.113.7");
    assert.equal(h, hashIp(SECRET, "203.0.113.7"));
    assert.notEqual(h, hashIp("other", "203.0.113.7"));
    assert.ok(!h.includes("203"));
  });
});

describe("rate limit decision", () => {
  const rule = { limit: 3, windowMs: 60_000 };
  const now = 10_000_000;
  it("allows up to the limit within the window", () => {
    assert.deepEqual(decideRate([], now, rule), { allowed: true, remaining: 2, retryAfterSeconds: 0 });
    assert.equal(decideRate([now - 1000, now - 2000], now, rule).allowed, true);
  });
  it("blocks once the limit is reached and says when to retry", () => {
    const d = decideRate([now - 50_000, now - 20_000, now - 1_000], now, rule);
    assert.equal(d.allowed, false);
    assert.equal(d.remaining, 0);
    assert.equal(d.retryAfterSeconds, 10);
  });
  it("ignores events outside the window and in the future", () => {
    assert.equal(decideRate([now - 61_000, now - 70_000, now - 1_000, now + 5_000], now, rule).allowed, true);
  });
  it("lead rule is 5 per hour", () => {
    const times = [1, 2, 3, 4].map((i) => now - i * 60_000);
    assert.equal(decideRate(times, now, RATE_RULES.lead).allowed, true);
    assert.equal(decideRate([...times, now - 1], now, RATE_RULES.lead).allowed, false);
  });
});
