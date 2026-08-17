// Post-build hook: rewrites dist/sw.js so the generated `PRECACHE_ASSETS`
// placeholder is replaced with the full list of hashed build files. This makes
// the production PWA precache its entire app shell on install, so the app
// loads fully offline after the first visit.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const dist = join(process.cwd(), "dist");
const swPath = join(dist, "sw.js");

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else {
      const rel = "/" + relative(dist, full).split(sep).join("/");
      if (rel === "/sw.js") continue;
      files.push(rel);
    }
  }
};
walk(dist);

const sw = readFileSync(swPath, "utf8");
const marker = /const PRECACHE_ASSETS = \[\]; \/\/ __PRECACHE_ASSETS__/;
if (!marker.test(sw)) {
  console.warn("sw.js precache marker not found — skipping injection");
  process.exit(0);
}

const next = sw.replace(
  marker,
  `const PRECACHE_ASSETS = ${JSON.stringify(files)}; // __PRECACHE_ASSETS__`,
);
writeFileSync(swPath, next);
console.log(`[sw-precache] injected ${files.length} assets into dist/sw.js`);
