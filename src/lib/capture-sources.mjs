/* How and where each exhibition photograph was captured: an instrument tag
   (Unistellar, iTelescope, or a digital camera) and place tags (a district of
   Bangladesh, or the iTelescope facility). Both are derived from the existing
   free-text `astrophoto.telescope`, `camera`, and `location` fields, so the
   frontmatter stays field-compatible with cassa-site.

   Plain ESM rather than TypeScript because scripts/content-audit.mjs imports
   it too. The audit fails when a capture names an instrument or place this
   file cannot classify, so a new observing site is added here once instead of
   silently going untagged. */

/** The instrument groups, in display order. `tag` is the singular form used
    on a single image. */
export const INSTRUMENTS = [
  { slug: "unistellar", label: "Unistellar", tag: "Unistellar" },
  { slug: "itelescope", label: "iTelescope", tag: "iTelescope" },
  { slug: "camera", label: "Digital cameras", tag: "Digital camera" },
];

/** Place tags, in display order. Bangladesh sites are matched against the
    location text; iTelescope sites by telescope number, because the recorded
    coordinates for remote sessions are unreliable. */
export const PLACES = [
  { slug: "bandarban", label: "Bandarban", region: "Bangladesh", match: /\bbandarban\b|\blama\b/i },
  { slug: "chapai-nawabganj", label: "Chapai Nawabganj", region: "Bangladesh", match: /\bchapai\s*nawabganj\b/i },
  { slug: "chattogram", label: "Chattogram", region: "Bangladesh", match: /\bchattogram\b|\bchittagong\b/i },
  { slug: "dhaka", label: "Dhaka", region: "Bangladesh", match: /\bdhaka\b/i },
  { slug: "jessore", label: "Jessore", region: "Bangladesh", match: /\bjessore\b|\bjashore\b/i },
  { slug: "kishoreganj", label: "Kishoreganj", region: "Bangladesh", match: /\bkishoreganj\b/i },
  { slug: "noakhali", label: "Noakhali", region: "Bangladesh", match: /\bnoakhali\b/i },
  { slug: "pabna", label: "Pabna", region: "Bangladesh", match: /\bpabna\b/i },
  { slug: "saint-martins-island", label: "Saint Martin's Island", region: "Bangladesh", match: /\bs(ain)?t\.?\s*martin/i },
  // iTelescope's Utah Desert Remote Observatory, Beryl Junction, Utah (MPC
  // U94), per iTelescope's T05 and T68 support pages.
  {
    slug: "utah-desert-remote-observatory",
    label: "Utah Desert Remote Observatory",
    short: "Utah, USA",
    region: "iTelescope, USA",
    itelescope: [5, 68],
    lat: 37.7378,
    lon: -113.6975,
  },
];

/** @typedef {{ location?: string; telescope?: string; camera?: string }} Capture */
/** @typedef {(typeof PLACES)[number]} Place */
/** @typedef {{ instrument: string | null; places: Place[]; unmatched: string[] }} CaptureSource */

/** Every capture of an entry: the primary one, then each slide's.
    @param {{ astrophoto?: Capture; slides?: { astrophoto?: Capture }[] }} data
    @returns {Capture[]} */
export const capturesOf = (data) => [data.astrophoto ?? {}, ...(data.slides ?? []).map((s) => s.astrophoto ?? {})];

/** The instrument group slug for one capture, or null when unrecognised.
    @param {Capture} capture */
export const instrumentOf = ({ telescope = "", camera = "" }) => {
  if (/itelescope/i.test(telescope)) return "itelescope";
  if (/unistellar/i.test(telescope)) return "unistellar";
  if (/\b(sony\s*(α|a)\d|nikon\s*d\d|canon\s*eos)/i.test(camera)) return "camera";
  return null;
};

/** The place tags for one capture, plus any location text that matched no
    place. A multi-site composite lists its sites separated by "|".
    @param {Capture} capture
    @returns {{ places: Place[]; unmatched: string[] }} */
export const placesOf = (capture) => {
  const found = new Set();
  const unmatched = [];
  if (instrumentOf(capture) === "itelescope") {
    const code = Number(capture.telescope?.match(/\bT\s*-?\s*(\d+)\b/i)?.[1]);
    const place = PLACES.find((p) => p.itelescope?.includes(code));
    if (place) found.add(place);
    else unmatched.push(capture.telescope ?? "");
  } else {
    for (const part of (capture.location ?? "").split("|").map((s) => s.trim()).filter(Boolean)) {
      const place = PLACES.find((p) => p.match?.test(part));
      if (place) found.add(place);
      else unmatched.push(part);
    }
  }
  return { places: PLACES.filter((p) => found.has(p)), unmatched };
};

/** Instrument and place tags for a whole entry: the union over all of its
    captures, plus the per-capture breakdown in slide order.
    @param {{ astrophoto?: Capture; slides?: { astrophoto?: Capture }[] }} data
    @returns {{ instruments: typeof INSTRUMENTS; places: Place[]; slides: CaptureSource[] }} */
export const sourcesOf = (data) => {
  const slides = capturesOf(data).map((capture) => ({ instrument: instrumentOf(capture), ...placesOf(capture) }));
  return {
    instruments: INSTRUMENTS.filter((i) => slides.some((s) => s.instrument === i.slug)),
    places: PLACES.filter((p) => slides.some((s) => s.places.includes(p))),
    slides,
  };
};

/** Whether one capture of the entry matches both the instrument and the place
    (either may be omitted). Matching per capture keeps a multi-instrument
    entry from pairing one slide's instrument with another slide's place.
    @param {ReturnType<typeof sourcesOf>} sources
    @param {string} [instrument]
    @param {string} [place] */
export const hasCapture = (sources, instrument, place) =>
  sources.slides.some((s) => (!instrument || s.instrument === instrument) && (!place || s.places.some((p) => p.slug === place)));

/** "instrument:place" pairs for client-side filtering, one per capture site.
    @param {ReturnType<typeof sourcesOf>} sources */
export const capturePairs = (sources) =>
  sources.slides.flatMap((s) => (s.places.length ? s.places.map((p) => `${s.instrument}:${p.slug}`) : [`${s.instrument}:`]));

/** The clickable tags shown for one capture in the object viewer.
    @param {CaptureSource} source */
export const tagsOf = (source) => [
  ...INSTRUMENTS.filter((i) => i.slug === source.instrument).map((i) => ({ kind: "instrument", slug: i.slug, label: i.tag })),
  ...source.places.map((p) => ({ kind: "place", slug: p.slug, label: p.label })),
];

/** A compact tile line for one capture: "Unistellar · Pabna", with "+2" for
    multi-site composites.
    @param {CaptureSource} source */
export const sourceLine = (source) => {
  const [first, ...rest] = source.places;
  const place = first ? `${first.short ?? first.label}${rest.length ? ` +${rest.length}` : ""}` : "";
  return [INSTRUMENTS.find((i) => i.slug === source.instrument)?.tag, place].filter(Boolean).join(" · ");
};
