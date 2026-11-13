// WhatsApp hand-off: message composition (reference, file names, length cap) and the never-throw save step.
// Run with `npm test`.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { saveForHandoff, whatsappMessage } from "../src/lib/leads/whatsapp.ts";

const ref = (name) => ({ key: `k/${name}`, name, size: 10, mime: "application/pdf" });

describe("whatsappMessage", () => {
  it("returns the body unchanged when there is nothing to add", () => {
    assert.equal(whatsappMessage("Hello\nName: Sam"), "Hello\nName: Sam");
  });

  it("adds the reference and the saved file names", () => {
    const m = whatsappMessage("Hello", { reference: "AT-1042", uploaded: ["pack.pdf", "logo.png"] });
    assert.match(m, /Reference: AT-1042/);
    assert.match(m, /Files saved with this request: pack\.pdf, logo\.png/);
  });

  it("asks the visitor to attach files when they could not be saved", () => {
    assert.match(whatsappMessage("Hello", { attachLater: true }), /attach my files in this chat/);
  });

  it("keeps a very long message within a safe link length and keeps the reference", () => {
    const long = "Colourway line with detail\n".repeat(400);
    const m = whatsappMessage(long, { reference: "AT-7" });
    assert.ok(encodeURIComponent(m).length <= 3000, "link too long");
    assert.match(m, /Reference: AT-7/);
    assert.match(m, /saved under the reference/);
  });
});

describe("saveForHandoff", () => {
  it("reports the reference and uploaded files when everything works", async () => {
    const info = await saveForHandoff({
      pickedCount: 2,
      upload: async () => [ref("a.pdf"), ref("b.png")],
      save: async (files) => {
        assert.equal(files.length, 2);
        return { reference: "AT-1" };
      },
    });
    assert.deepEqual(info, { reference: "AT-1", uploaded: ["a.pdf", "b.png"], attachLater: false });
  });

  it("does not throw when uploads fail, and still saves the lead without files", async () => {
    const info = await saveForHandoff({
      pickedCount: 1,
      upload: async () => {
        throw new Error("blob down");
      },
      save: async (files) => {
        assert.equal(files.length, 0);
        return { reference: "AT-2" };
      },
    });
    assert.deepEqual(info, { reference: "AT-2", uploaded: [], attachLater: true });
  });

  it("does not throw when saving fails: the chat still opens and files are attached by hand", async () => {
    const info = await saveForHandoff({
      pickedCount: 1,
      upload: async () => [ref("a.pdf")],
      save: async () => {
        throw new Error("no database");
      },
    });
    assert.deepEqual(info, { reference: undefined, uploaded: [], attachLater: true });
  });

  it("needs no attach hint when no files were picked", async () => {
    const info = await saveForHandoff({ pickedCount: 0, upload: async () => [], save: async () => ({ reference: "AT-3" }) });
    assert.equal(info.attachLater, false);
  });
});
