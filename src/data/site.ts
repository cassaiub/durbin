/* Site-wide facts and the exhibition taxonomy. */

export const SITE = {
  name: "Durbin",
  url: "https://durbin.cassa.bd",
  email: "durbin.cassa@iub.edu.bd",
  facebook: "https://www.facebook.com/durbin.cassa",
  founded: "2023-03-09",
  founder: "Dr. Lamiya Mowla",
  parent: { name: "CASSA", url: "https://cassa.bd", durbinPage: "https://cassa.bd/durbin" },
  license: {
    name: "CC BY-NC-SA 4.0",
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en",
  },
} as const;

/* The primary nav, in order. */
export const NAV = [
  { path: "/people", label: "People" },
  { path: "/exhibition", label: "Exhibition" },
  { path: "/news-and-events", label: "News & Events" },
  { path: "/about", label: "About Us" },
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
