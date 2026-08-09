/* Shared logic for the exhibition: the ordered walk through the collection,
   capture-information rows, and attribution lines. */

import { getCollection, type CollectionEntry } from "astro:content";
import { catOrder, objectTypeOf } from "../data/site";

export type Exhibit = CollectionEntry<"astrophotography">;

/** Entries whose original source file is unavailable or cannot be decoded. */
export const unavailableImageIds = new Set(["ngc4303", "ngc6420-2"]);

/** The exhibition order: grouped by object type (taxonomy order), then by id
    (numeric-aware, so NGC 628 hangs before NGC 6888). This is also the order
    used by prev/next navigation. */
export const getExhibits = async (): Promise<Exhibit[]> => {
  const all = await getCollection("astrophotography", ({ data }) => data.status !== "draft");
  return all.sort((a, b) => {
    const co = catOrder(objectTypeOf(a)) - catOrder(objectTypeOf(b));
    if (co !== 0) return co;
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });
};

type Capture = NonNullable<Exhibit["data"]["astrophoto"]>;

/** The capture placard rows for one astrophoto block. */
export const captureRows = (a: Capture): [string, string][] =>
  (
    [
      ["Photographer", a.photographer],
      ["Observing location", a.location],
      ["Observation date", a.date],
      ["Exposure", a.exposure],
      ["Telescope", a.telescope],
      ["Camera", a.camera],
      ["Field of view", a.fov],
      ["Image processing", a.processing],
      ["Processing method", a.processingMethod],
    ] as [string, string | undefined][]
  ).filter((r): r is [string, string] => Boolean(r[1]));

/** The astrophysics placard rows. */
export const physicsRows = (e: Exhibit): [string, string][] => {
  const px = e.data.astrophysics ?? {};
  return (
    [
      ["Object type", px.objectType],
      ["Constellation", px.constellation],
      ["Distance", px.distance],
      ["Angular size", px.angularSize],
      ["Physical size", px.physicalSize],
      ["Apparent magnitude", px.magnitude],
    ] as [string, string | undefined][]
  ).filter((r): r is [string, string] => Boolean(r[1]));
};

/** The person shown on a slide (no verb), for dot labels. */
export const nameOf = (a: Capture, fallback?: string): string | undefined =>
  a.photographer ?? a.processing ?? fallback ?? undefined;

/** Full attribution line, distinguishes who captured vs who only processed,
    so a processing-only contributor isn't mislabelled. */
export const attributionOf = (a: Capture, fallback?: string): string | undefined => {
  const cap = a.photographer;
  const proc = a.processing;
  if (cap && proc)
    return cap === proc
      ? `Captured & processed by: ${cap}`
      : `Captured by: ${cap} · Processed by: ${proc}`;
  if (cap) return `Captured by: ${cap}`;
  if (proc) return `Processed by: ${proc}`;
  return fallback ? `By: ${fallback}` : undefined;
};

/** Slides for the detail hero: primary image first, then extra captures. */
export const slidesOf = (e: Exhibit) => {
  const d = e.data;
  const build = (image: typeof d.image, alt: string, a: Capture, fallback?: string) => ({
    image,
    alt,
    name: nameOf(a, fallback),
    attribution: attributionOf(a, fallback),
    capture: captureRows(a),
  });
  return [
    build(d.image, d.imageAlt ?? d.title, d.astrophoto ?? {}, d.credit ?? undefined),
    ...(d.slides ?? []).map((s) => build(s.image, s.alt ?? d.imageAlt ?? d.title, s.astrophoto ?? {}, s.credit ?? undefined)),
  ];
};
