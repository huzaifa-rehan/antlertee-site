// Newsletter sign-up: what counts as an email address.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeEmail } from "../src/lib/newsletter.ts";

describe("normalizeEmail", () => {
  it("trims and lower-cases a normal address", () => {
    assert.equal(normalizeEmail("  Sam@Brand.COM "), "sam@brand.com");
  });
  it("rejects things that are not addresses", () => {
    for (const bad of ["", "sam", "sam@", "@brand.com", "sam@brand", "sam @brand.com", "sam@brand.c", null, undefined, 42]) {
      assert.equal(normalizeEmail(bad), null, String(bad));
    }
  });
  it("rejects absurdly long input", () => {
    assert.equal(normalizeEmail(`${"a".repeat(250)}@brand.com`), null);
  });
});
