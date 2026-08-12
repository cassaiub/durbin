import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith(".html")) files.push(target);
  }
};
if (!fs.existsSync(dist)) throw new Error("dist/ is missing; run npm run build first");
walk(dist);

const text = (value = "") => value.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
const failures = [];
const warnings = [];
const titles = new Map();
let redirects = 0;

for (const file of files.sort()) {
  const html = fs.readFileSync(file, "utf8");
  const route = `/${path.relative(dist, file).replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "").replace(/\/$/, "")}`.replace("//", "/");
  const isRedirect = /<meta\s+http-equiv="refresh"\s+content="[^"]+"/i.test(html)
    && /<meta\s+name="robots"\s+content="noindex"/i.test(html);
  if (isRedirect) {
    redirects += 1;
    continue;
  }
  const h1s = html.match(/<h1\b/gi) ?? [];
  if (h1s.length !== 1) failures.push(`${route}: expected one h1, found ${h1s.length}`);

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    // Astro minifies alt="" to the valid HTML boolean form `alt`.
    if (!/\salt(?:\s|=|>)/i.test(tag)) failures.push(`${route}: image is missing an alt attribute`);
  }

  const title = text(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
  if (!title) failures.push(`${route}: missing title`);
  else {
    if (!titles.has(title)) titles.set(title, []);
    titles.get(title).push(route || "/");
    if (title.length > 60) warnings.push(`${route}: title is ${title.length} characters (recommended maximum 60)`);
  }

  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? "";
  if (!description) failures.push(`${route}: missing meta description`);
  else if (description.length < 50 || description.length > 160) {
    warnings.push(`${route}: meta description is ${description.length} characters (recommended 50–160)`);
  }
}

for (const [title, routes] of titles) {
  if (routes.length > 1) warnings.push(`duplicate page title “${title}”: ${routes.join(", ")}`);
}

console.log(`HTML audit: ${files.length} files checked, including ${redirects} intentional redirects.`);
for (const warning of warnings) console.warn(`Warning: ${warning}`);
if (failures.length) {
  console.error(failures.map((failure) => `ERROR: ${failure}`).join("\n"));
  process.exitCode = 1;
}
