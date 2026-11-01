/* Site-wide facts and the exhibition taxonomy. */

export const SITE = {
  name: "Durbin",
  url: "https://durbin.cc",
  email: "durbin.cassa@iub.edu.bd",
  facebook: "https://www.facebook.com/durbin.cassa",
  founded: "2023-03-09",
  founder: "Dr. Lamiya Mowla",
  license: {
    name: "CC BY-NC-SA 4.0",
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en",
  },
} as const;

/* The open call featured on the home page (a band under the hero and a pill
   in it) and in the main menu. Set to null when the call closes: all three go,
   the call's own page stays. Cosmic HerStory curator call, Asad 2026-11-01. */
export const OPEN_CALL: {
  path: string;
  applyUrl: string;
  navLabel: string;
  kicker: string;
  title: string;
  line: string;
} | null = {
  path: "/cosmic-herstory-curator",
  applyUrl: "https://inside.cassa.bd/forms/vacancy/2026-11-01-a",
  navLabel: "Open call",
  kicker: "Open call · Rolling, apply early",
  title: "Curate Cosmic HerStory",
  line: "An exhibition on women in astronomy, organised by Durbin and CASSA at IUB, 26 November – 5 December 2026. We are looking for its curator.",
};

/* The primary nav, in order. */
export const NAV = [
  { path: "/about", label: "About" },
  { path: "/people", label: "People" },
  { path: "/instruments/telescope", label: "Instruments" },
  { path: "/exhibition", label: "Exhibition" },
  { path: "/news", label: "News" },
  { path: "/events", label: "Events" },
] as const;

/* ---- The exhibition's authoritative broad object-type taxonomy, in display
   order. It is intentionally separate from the detailed, scientist-supplied
   `astrophysics.objectType` description and from curation flags. ---- */
export const EXHIBITION_OBJECT_TYPES = [
  "Galaxies",
  "Nebulae",
  "Globular clusters",
  "Stars and systems",
  "Galaxy groups and clusters",
  "Solar System",
  "Comets",
  "Intergalactic medium",
] as const;

export const CURATION_FLAGS = ["Durbin"] as const;

export type ExhibitionObjectType = (typeof EXHIBITION_OBJECT_TYPES)[number];

type WithTaxonomy = { data: { objectType: ExhibitionObjectType; featured?: boolean } };
export const objectTypeOf = (e: WithTaxonomy): ExhibitionObjectType => e.data.objectType;
export const catOrder = (c: ExhibitionObjectType): number => EXHIBITION_OBJECT_TYPES.indexOf(c);
export const isFeatured = (e: WithTaxonomy): boolean => e.data.featured === true;

/* ---- Everything in this repo is Durbin's, so the updates feed takes every
   non-draft news post and event. ---- */
export const inUpdatesFeed = (data: { status?: string }): boolean => data.status !== "draft";
