import path from "node:path"
import { build } from "esbuild"

const siteRoot = path.resolve(import.meta.dirname, "..")

await build({
  entryPoints: [path.join(siteRoot, "quartz/components/scripts/galaxyHome3d.ts")],
  outfile: path.join(siteRoot, "quartz/static/galaxy-home-3d.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome109", "edge115", "firefox102", "safari15.6"],
  minify: true,
  legalComments: "none",
  sourcemap: false,
  treeShaking: true,
})

console.log("[galaxy] Three.js homepage bundle generated")
