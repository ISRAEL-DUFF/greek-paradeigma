import { describe, it, expect } from "vitest";
import { parseAccentSlots, applyAccent, assembleAccented, ACCENT_CYCLE } from "./accent.js";
import { ALL_PARADIGMS } from "./content/index.js";

describe("accent slots (M5) — over the entire shipped corpus", () => {
  it("round-trips every form: parse → re-apply its own accents → identical", () => {
    const failures = [];
    for (const p of ALL_PARADIGMS)
      for (const c of p.cells) {
        const segs = parseAccentSlots(c.form);
        const truth = segs.filter((s) => s.isSlot).map((s) => s.accent);
        const rebuilt = assembleAccented(segs, truth);
        if (rebuilt !== c.form.normalize("NFC"))
          failures.push(`${p.id}:${c.id} ${c.form} -> ${rebuilt}`);
      }
    expect(failures).toEqual([]);
  });

  it("never loses a breathing or an iota subscript when stripping accents", () => {
    const failures = [];
    for (const p of ALL_PARADIGMS)
      for (const c of p.cells) {
        const bare = parseAccentSlots(c.form)
          .map((s) => s.text)
          .join("");
        const count = (s, re) => (s.normalize("NFD").match(re) || []).length;
        if (count(bare, /[̓̔]/g) !== count(c.form, /[̓̔]/g))
          failures.push(`breathing lost: ${p.id}:${c.id} ${c.form}`);
        if (count(bare, /ͅ/g) !== count(c.form, /ͅ/g))
          failures.push(`iota subscript lost: ${p.id}:${c.id} ${c.form}`);
      }
    expect(failures).toEqual([]);
  });

  it("strips every accent from the bare display text", () => {
    const failures = [];
    for (const p of ALL_PARADIGMS)
      for (const c of p.cells) {
        const bare = parseAccentSlots(c.form)
          .map((s) => s.text)
          .join("");
        if (/[̀́͂]/.test(bare.normalize("NFD")))
          failures.push(`${p.id}:${c.id} ${c.form} -> ${bare}`);
      }
    expect(failures).toEqual([]);
  });

  it("treats real diphthongs as one slot", () => {
    const slots = (f) => parseAccentSlots(f).filter((s) => s.isSlot).map((s) => s.text);
    expect(slots("παιδεύω")).toEqual(["αι", "ευ", "ω"]);
    expect(slots("αὐτοί")).toEqual(["αὐ", "οι"]);
    expect(slots("ποιοῦσι(ν)")).toEqual(["οι", "ου", "ι"]);
    expect(slots("λύοι")).toEqual(["υ", "οι"]);
  });

  it("does not fuse vowel pairs that are not diphthongs", () => {
    const slots = (f) => parseAccentSlots(f).filter((s) => s.isSlot).map((s) => s.text);
    expect(slots("ἔλυον")).toEqual(["ἐ", "υ", "ο"]); // υ+ο is not a diphthong
    expect(slots("ἐλύθημεν")).toEqual(["ἐ", "υ", "η", "ε"]);
  });

  it("puts the mark on the second vowel of a diphthong", () => {
    expect(applyAccent("αι", "acute")).toBe("αί");
    expect(applyAccent("ου", "circumflex")).toBe("οῦ");
  });

  it("keeps breathing before the accent and subscript after", () => {
    expect(applyAccent("ἐ", "acute")).toBe("ἔ");
    expect(applyAccent("ᾳ", "circumflex")).toBe("ᾷ");
    expect(applyAccent("ἁ", "circumflex")).toBe("ἇ");
  });

  it("cycles none → acute → circumflex", () => {
    expect(ACCENT_CYCLE).toEqual(["none", "acute", "circumflex"]);
    expect(applyAccent("ω", "none")).toBe("ω");
  });
});
