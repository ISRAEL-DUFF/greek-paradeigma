/* M5 — accent finishing move (build plan). Vowel-slot parsing and accent
   application over NFD-decomposed Greek. Accents (acute/circumflex) are a
   separate score channel; breathings and iota subscripts are preserved and
   never asked about in v1. */

const VOWELS = new Set(["α", "ε", "η", "ι", "ο", "υ", "ω"]);
const ACCENTS = { acute: "́", circumflex: "͂" };
const ACCENT_MARKS = /[̀́͂]/g; // grave, acute, circumflex
const BREATHINGS = /[̓̔]/; // smooth, rough
const YPOGEGRAMMENI = "ͅ";

/* Diphthongs by base-vowel pair (marks stripped). */
const DIPHTHONGS = new Set(["αι", "ει", "οι", "υι", "αυ", "ευ", "ου", "ηυ", "ωυ"]);

const baseOf = (nfdChar) => nfdChar[0];
const isVowelChar = (nfdChar) => VOWELS.has(baseOf(nfdChar));

/** Split an NFD string into per-base-character chunks (base + its marks). */
function chars(nfd) {
  const out = [];
  for (const ch of nfd) {
    if (ch.normalize("NFD").length === 1 && /\p{M}/u.test(ch)) {
      out[out.length - 1] += ch;
    } else {
      out.push(ch);
    }
  }
  return out;
}

/**
 * Parse a surface form into segments for the accent stage.
 * Returns [{text, isSlot, accent}] where slots are vowel clusters (diphthong-
 * aware), `text` is the BARE cluster (accents stripped, breathings and iota
 * subscript kept), and `accent` is the true answer: "none"|"acute"|"circumflex".
 */
export function parseAccentSlots(form) {
  const cs = chars(form.normalize("NFD"));
  const segments = [];
  let i = 0;
  const push = (seg) => {
    const last = segments[segments.length - 1];
    if (!seg.isSlot && last && !last.isSlot) last.text += seg.text;
    else segments.push(seg);
  };
  while (i < cs.length) {
    if (!isVowelChar(cs[i])) {
      push({ text: cs[i], isSlot: false });
      i++;
      continue;
    }
    // vowel run: greedily take a diphthong pair, else a single vowel.
    // A second vowel bearing a breathing/accent-on-first-of-pair issue does not
    // arise: breathings sit on the second vowel of an initial diphthong, which
    // stays inside the cluster.
    let cluster = [cs[i]];
    if (
      i + 1 < cs.length &&
      isVowelChar(cs[i + 1]) &&
      DIPHTHONGS.has(baseOf(cs[i]) + baseOf(cs[i + 1]))
    ) {
      cluster.push(cs[i + 1]);
      i += 2;
    } else {
      i += 1;
    }
    const raw = cluster.join("");
    const accent = raw.includes(ACCENTS.circumflex)
      ? "circumflex"
      : raw.includes(ACCENTS.acute)
        ? "acute"
        : "none";
    push({ text: raw.replace(ACCENT_MARKS, ""), isSlot: true, accent });
  }
  // NFC-normalize the display text of every segment
  return segments.map((s) => ({ ...s, text: s.text.normalize("NFC") }));
}

/**
 * Apply an accent choice to a bare cluster: the mark lands on the LAST vowel of
 * the cluster (second element of a diphthong), after any breathing, before an
 * iota subscript. Returns the NFC cluster.
 */
export function applyAccent(bareCluster, choice) {
  if (choice === "none") return bareCluster;
  const mark = ACCENTS[choice];
  const cs = chars(bareCluster.normalize("NFD"));
  const idx = cs.length - 1; // accent the final vowel char of the cluster
  const ch = cs[idx];
  const base = ch[0];
  let marks = ch.slice(1);
  let breathing = "";
  const b = marks.match(BREATHINGS);
  if (b) {
    breathing = b[0];
    marks = marks.replace(BREATHINGS, "");
  }
  const sub = marks.includes(YPOGEGRAMMENI) ? YPOGEGRAMMENI : "";
  marks = marks.replace(YPOGEGRAMMENI, "");
  /* A diaeresis must come BEFORE the accent (ι+̈+́ composes to ΐ; ι+́+̈ does
     not compose at all). First form to need this: νηΐ, the dative of ναῦς. */
  const DIAERESIS = "̈";
  let diaeresis = "";
  if (marks.includes(DIAERESIS)) {
    diaeresis = DIAERESIS;
    marks = marks.replace(DIAERESIS, "");
  }
  cs[idx] = (base + breathing + diaeresis + mark + sub + marks).normalize("NFC");
  return cs.join("").normalize("NFC");
}

/** Rebuild the full form from segments + player choices; compare to truth. */
export function assembleAccented(segments, choices) {
  let slot = 0;
  let out = "";
  for (const seg of segments) {
    if (seg.isSlot) {
      out += applyAccent(seg.text, choices[slot]);
      slot++;
    } else {
      out += seg.text;
    }
  }
  return out.normalize("NFC");
}

export const ACCENT_CYCLE = ["none", "acute", "circumflex"];
export const ACCENT_GLYPH = { none: "◌", acute: "´", circumflex: "῀" };
