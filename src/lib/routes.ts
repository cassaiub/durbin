/* Shared getStaticPaths builders. */

import { getCollection } from "astro:content";
import { inUpdatesFeed } from "../data/site";
import { getExhibits } from "./exhibits";

/** Exhibition detail paths: entry + its position and neighbours in the walk. */
export const exhibitPaths = async () => {
  const exhibits = await getExhibits();
  return exhibits.map((entry, i) => ({
    params: { slug: entry.id },
    props: {
      entry,
      index: i,
      prev: i > 0 ? exhibits[i - 1] : null,
      next: i < exhibits.length - 1 ? exhibits[i + 1] : null,
    },
  }));
};

/** News detail paths. */
export const newsPaths = async () => {
  const posts = await getCollection("news", ({ data }) => inUpdatesFeed(data));
  return posts.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
};

/** Event detail paths. */
export const eventPaths = async () => {
  const events = await getCollection("events", ({ data }) => data.status !== "draft");
  return events.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
};
