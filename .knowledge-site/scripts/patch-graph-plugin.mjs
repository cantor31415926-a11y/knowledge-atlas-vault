import { readFile, writeFile } from "node:fs/promises"

const graphBundle = new URL(
  "../node_modules/@quartz-community/graph/dist/components/index.js",
  import.meta.url,
)
const defaultExtent = ".scaleExtent([.25,4])"
const atlasExtent = ".scaleExtent([.18,8])"
const source = await readFile(graphBundle, "utf8")

if (!source.includes(atlasExtent)) {
  if (!source.includes(defaultExtent)) {
    throw new Error("Unable to locate the graph zoom extent in @quartz-community/graph")
  }
  await writeFile(graphBundle, source.replace(defaultExtent, atlasExtent))
}

console.log("[graph] zoom extent=0.18..8")
