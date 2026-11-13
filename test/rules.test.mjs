// Validators: lead payload, file allow-list, size caps, filename sanitising, storage-key / prefix checks.
// Run with `npm test` (Node's built-in test runner; .ts imported via Node's type stripping).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  checkFile,
  checkSelection,
  cleanText,
  isLeadFileKey,
  isMediaUploadKey,
  isUploadPathname,
  leadReference,
  sanitizeFilename,
  validateLead,
} from "../src/lib/leads/rules.ts";

const UUID = "3f9a21c4-5b6d-4e7f-8a9b-0c1d2e3f4a5b";
const key = (name) => `leads/incoming/${UUID}/${name}`;
const base = { kind: "techpack", name: "Ayesha Khan", email: "ayesha@brand.com", whatsapp: "", website: "" };

describe("checkFile", () => {
  it("accepts allowed types and returns the canonical MIME", () => {
    assert.deepEqual(checkFile("pack.pdf", "application/pdf", 1000), { ok: true, ext: "pdf", mime: "application/pdf" });
    assert.equal(checkFile("photo.JPG", "image/jpeg", 10).ok, true);
    assert.equal(checkFile("sizes.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 10).ok, true);
    assert.equal(checkFile("brief.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 10).ok, true);
  });
  it("accepts design files with an empty or generic MIME (browsers often send none)", () => {
    assert.equal(checkFile("logo.ai", "", 10).ok, true);
    assert.equal(checkFile("mock.psd", "application/octet-stream", 10).ok, true);
    assert.equal(checkFile("art.eps", "", 10).ok, true);
    assert.equal(checkFile("IMG_1.heic", "", 10).ok, true);
  });
  it("rejects SVG, archives, executables and unknown types", () => {
    for (const [n, m] of [
      ["logo.svg", "image/svg+xml"],
      ["files.zip", "application/zip"],
      ["setup.exe", "application/x-msdownload"],
      ["page.html", "text/html"],
      ["noext", "application/pdf"],
    ]) {
      assert.equal(checkFile(n, m, 10).ok, false, n);
    }
  });
  it("rejects a MIME that does not match the extension", () => {
    assert.equal(checkFile("evil.pdf", "text/html", 10).ok, false);
    assert.equal(checkFile("photo.png", "application/octet-stream", 10).ok, false);
    assert.equal(checkFile("doc.pdf", "", 10).ok, false);
  });
  it("enforces the per-file size cap and rejects empty files", () => {
    assert.equal(checkFile("big.pdf", "application/pdf", MAX_FILE_BYTES).ok, true);
    const tooBig = checkFile("big.pdf", "application/pdf", MAX_FILE_BYTES + 1);
    assert.equal(tooBig.ok, false);
    assert.match(tooBig.error, /too large .*up to 25 MB/);
    assert.equal(checkFile("empty.pdf", "application/pdf", 0).ok, false);
  });
});

describe("checkSelection", () => {
  it("caps the number of files and the total size", () => {
    assert.equal(checkSelection(Array.from({ length: MAX_FILES }, () => ({ size: 1 }))), null);
    assert.match(checkSelection(Array.from({ length: MAX_FILES + 1 }, () => ({ size: 1 }))), /up to 8 files/);
    assert.match(checkSelection([{ size: MAX_TOTAL_BYTES }, { size: 1 }]), /in total/);
  });
});

describe("sanitizeFilename", () => {
  it("strips paths, special characters and accents, keeps the extension", () => {
    assert.equal(sanitizeFilename("../../etc/passwd"), "passwd");
    assert.equal(sanitizeFilename("C:\\Users\\me\\Tech Pack (final) v2.PDF"), "Tech-Pack-final-v2.pdf");
    assert.equal(sanitizeFilename("Café Ñandú.png"), "Cafe-Nandu.png");
    assert.equal(sanitizeFilename("<b>alert(1)<b>.pdf"), "b-alert-1-b.pdf");
    assert.equal(sanitizeFilename("<script>alert(1)</script>.pdf"), "script.pdf", "slash treated as a path");
    assert.equal(sanitizeFilename("....pdf"), "file.pdf");
    assert.equal(sanitizeFilename(""), "file");
  });
  it("limits length", () => {
    const out = sanitizeFilename(`${"a".repeat(300)}.xlsx`);
    assert.ok(out.length <= 80, String(out.length));
    assert.ok(out.endsWith(".xlsx"));
  });
  it("always produces a name the key check accepts", () => {
    for (const n of ["x.pdf", "Ünïcødé 名前.jpg", "-.-.pdf", "a b c.ai", `${"z".repeat(200)}.psd`]) {
      assert.equal(isLeadFileKey(key(sanitizeFilename(n))), true, n);
    }
  });
});

describe("storage keys", () => {
  it("accepts only our lead prefix with a uuid folder", () => {
    assert.equal(isLeadFileKey(key("pack.pdf")), true);
    assert.equal(isLeadFileKey(key("pack-AbC123xYz.pdf")), true, "Blob random suffix");
    assert.equal(isLeadFileKey(`media/incoming/${UUID}/pack.pdf`), false);
    assert.equal(isLeadFileKey(`leads/incoming/not-a-uuid/pack.pdf`), false);
    assert.equal(isLeadFileKey(`leads/incoming/${UUID}/../secret.pdf`), false);
    assert.equal(isLeadFileKey(`leads/incoming/${UUID}/sub/pack.pdf`), false);
    assert.equal(isLeadFileKey(`https://evil.example/leads/incoming/${UUID}/a.pdf`), false);
    assert.equal(isLeadFileKey(`leads/incoming/${UUID}/.hidden`), false);
    assert.equal(isLeadFileKey(42), false);
  });
  it("checks admin media areas separately", () => {
    assert.equal(isMediaUploadKey(`media/incoming/${UUID}/hero.jpg`, "incoming"), true);
    assert.equal(isMediaUploadKey(`media/incoming/${UUID}/hero.jpg`, "library"), false);
    assert.equal(isMediaUploadKey(`media/library/${UUID}/clip.mp4`, "library"), true);
    assert.equal(isMediaUploadKey(`leads/incoming/${UUID}/x.pdf`, "library"), false);
  });
  it("checks client-upload pathnames against the requested prefix", () => {
    assert.equal(isUploadPathname(key("a.pdf"), "leads/incoming"), true);
    assert.equal(isUploadPathname(key("a.pdf"), "media/library"), false);
    assert.equal(isUploadPathname(`leads/incoming/${UUID}/../../x.pdf`, "leads/incoming"), false);
  });
});

describe("validateLead", () => {
  it("accepts a minimal tech pack lead and cleans the values", () => {
    const r = validateLead({ ...base, name: "  Ayesha\u0000 Khan  ", brand: "Brand", message: "Line 1\r\nLine 2" });
    assert.equal(r.ok, true);
    assert.equal(r.value.name, "Ayesha  Khan");
    assert.equal(r.value.message, "Line 1\nLine 2");
    assert.deepEqual(r.value.files, []);
  });
  it("requires a name and one way to reply, and checks formats", () => {
    assert.deepEqual(Object.keys(validateLead({ ...base, name: "A" }).errors), ["name"]);
    const noContact = validateLead({ ...base, email: "", whatsapp: "" });
    assert.ok(noContact.errors.email && noContact.errors.whatsapp);
    assert.ok(validateLead({ ...base, email: "not-an-email" }).errors.email);
    assert.ok(validateLead({ ...base, email: "", whatsapp: "12ab" }).errors.whatsapp);
    assert.equal(validateLead({ ...base, email: "", whatsapp: "+44 7700 900123" }).ok, true);
  });
  it("quotes need a message of at least 10 characters", () => {
    assert.ok(validateLead({ ...base, kind: "quote", message: "short" }).errors.message);
    assert.equal(validateLead({ ...base, kind: "quote", message: "500 hoodies in black" }).ok, true);
  });
  it("rejects unknown kinds, non-objects and over-long fields", () => {
    assert.equal(validateLead(null).ok, false);
    assert.equal(validateLead([]).ok, false);
    assert.ok(validateLead({ ...base, kind: "spam" }).errors.kind);
    assert.ok(validateLead({ ...base, name: "x".repeat(121) }).errors.name);
    assert.ok(validateLead({ ...base, message: "x".repeat(5001) }).errors.message);
  });
  it("rejects a filled honeypot", () => {
    const r = validateLead({ ...base, website: "http://spam.example" });
    assert.equal(r.ok, false);
    assert.ok(r.errors.form);
  });
  it("validates extra fields", () => {
    assert.equal(validateLead({ ...base, fields: { product: "Hoodie", quantity: "120", deadline: "2027-01-31" } }).ok, true);
    assert.ok(validateLead({ ...base, fields: { quantity: "lots" } }).errors.quantity);
    assert.ok(validateLead({ ...base, fields: { "bad key": "x" } }).errors.fields);
    assert.ok(validateLead({ ...base, fields: { nested: { a: 1 } } }).errors.fields);
    assert.ok(validateLead({ ...base, fields: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, "v"])) }).errors.fields);
  });
  it("caps the tech pack JSON", () => {
    assert.equal(validateLead({ ...base, techPack: { garment: "hoodie" } }).ok, true);
    assert.ok(validateLead({ ...base, techPack: "nope" }).errors.techPack);
    assert.ok(validateLead({ ...base, techPack: { notes: "x".repeat(50_000) } }).errors.techPack);
  });
  it("validates the file list: keys, types, count, duplicates, total size", () => {
    const f = (name, mime = "application/pdf", size = 1000) => ({ key: key(sanitizeFilename(name)), name, size, mime });
    const ok = validateLead({ ...base, files: [f("pack.pdf"), f("front.png", "image/png")] });
    assert.equal(ok.ok, true);
    assert.equal(ok.value.files.length, 2);
    assert.ok(validateLead({ ...base, files: [{ ...f("pack.pdf"), key: "leads/other/pack.pdf" }] }).errors.files);
    assert.ok(validateLead({ ...base, files: [f("logo.svg", "image/svg+xml")] }).errors.files);
    assert.ok(validateLead({ ...base, files: [f("a.pdf"), f("a.pdf")] }).errors.files);
    assert.ok(validateLead({ ...base, files: Array.from({ length: 9 }, (_, i) => f(`p${i}.pdf`)) }).errors.files);
    assert.ok(validateLead({ ...base, files: [f("big.pdf", "application/pdf", MAX_FILE_BYTES + 1)] }).errors.files);
    const three = [1, 2, 3].map((i) => f(`p${i}.pdf`, "application/pdf", MAX_FILE_BYTES));
    assert.match(validateLead({ ...base, files: three }).errors.files, /in total/);
    assert.ok(validateLead({ ...base, files: "x" }).errors.files);
  });
  it("only keeps a safe source path", () => {
    assert.equal(validateLead({ ...base, sourcePath: "/process/" }).value.sourcePath, "/process/");
    assert.equal(validateLead({ ...base, sourcePath: "https://evil.example" }).value.sourcePath, "");
    assert.equal(validateLead({ ...base, sourcePath: "/<script>" }).value.sourcePath, "");
  });
});

describe("helpers", () => {
  it("cleanText strips control characters and caps length", () => {
    assert.equal(cleanText("a\u0007b", 10), "a b");
    assert.equal(cleanText("a\nb\u0000", 10, true), "a\nb");
    assert.equal(cleanText("abcdef", 3), "abc");
    assert.equal(cleanText(42, 3), "");
  });
  it("leadReference is short and stable", () => {
    assert.equal(leadReference(UUID), "ACS-3F9A21");
  });
});
