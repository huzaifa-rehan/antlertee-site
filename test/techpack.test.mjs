// Tech pack builder: the even split that turns one rough total into per-size quantities.
// Run with `npm test`.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitEvenly } from "../src/components/techpack/quantity.ts";

const sum = (rows) => Object.values(rows).reduce((a, row) => a + Object.values(row).reduce((b, v) => b + (Number(v) || 0), 0), 0);

describe("splitEvenly", () => {
  it("spreads a total across sizes and keeps the total exact", () => {
    const rows = splitEvenly(300, ["c1"], ["S", "M", "L", "XL"]);
    assert.deepEqual(rows.c1, { S: "75", M: "75", L: "75", XL: "75" });
  });

  it("gives leftover pieces to the first sizes", () => {
    const rows = splitEvenly(10, ["c1"], ["S", "M", "L"]);
    assert.deepEqual(rows.c1, { S: "4", M: "3", L: "3" });
    assert.equal(sum(rows), 10);
  });

  it("splits across colours first, then sizes", () => {
    const rows = splitEvenly(61, ["a", "b"], ["S", "M"]);
    assert.equal(sum(rows), 61);
    assert.equal(sum({ a: rows.a }), 31);
    assert.equal(sum({ b: rows.b }), 30);
  });

  it("leaves empty cells when there are fewer pieces than sizes", () => {
    const rows = splitEvenly(2, ["c1"], ["S", "M", "L", "XL"]);
    assert.deepEqual(rows.c1, { S: "1", M: "1", L: "", XL: "" });
  });

  it("is safe with zero, negative, fractional or missing input", () => {
    assert.equal(sum(splitEvenly(0, ["c1"], ["S"])), 0);
    assert.equal(sum(splitEvenly(-5, ["c1"], ["S"])), 0);
    assert.equal(sum(splitEvenly(7.9, ["c1"], ["S"])), 7);
    assert.equal(sum(splitEvenly(Number.NaN, ["c1"], ["S"])), 0);
    assert.deepEqual(splitEvenly(50, [], ["S"]), {});
    assert.deepEqual(splitEvenly(50, ["c1"], []), {});
  });
});
