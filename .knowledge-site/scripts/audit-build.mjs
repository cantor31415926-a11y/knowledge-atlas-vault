import fs from "node:fs/promises"
import path from "node:path"

const siteRoot = path.resolve(import.meta.dirname, "..")
const outputRoot = path.join(siteRoot, "public")
const manifest = JSON.parse(await fs.readFile(path.join(siteRoot, ".stage-manifest.json"), "utf8"))

async function listFiles(root, current = "") {
  const entries = await fs.readdir(path.join(root, current), { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relativePath = path.join(current, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(root, relativePath)))
    else if (entry.isFile()) files.push(relativePath)
  }
  return files
}

function fail(message) {
  throw new Error("[privacy-audit] " + message)
}

const outputFiles = await listFiles(outputRoot)
const forbiddenExtensions = outputFiles.filter((file) => /\.(?:canvas|base)$/i.test(file))
if (forbiddenExtensions.length > 0) {
  fail("Canvas/Base files reached the deployment output: " + forbiddenExtensions.join(", "))
}

if (!outputFiles.includes("_headers")) fail("Cloudflare _headers file is missing")

const contentIndexPath = path.join(outputRoot, "static", "contentIndex.json")
const contentIndex = JSON.parse(await fs.readFile(contentIndexPath, "utf8"))
const indexedSourcePaths = new Set(
  Object.values(contentIndex)
    .map((entry) => entry.filePath)
    .filter(Boolean)
    .map((filePath) => filePath.split(path.sep).join("/")),
)
const missingSelectedNotes = manifest.selectedPaths.filter(
  (relativePath) => !indexedSourcePaths.has(relativePath),
)
if (missingSelectedNotes.length > 0) {
  fail(
    "Selected notes are missing from the search/graph index: " +
      missingSelectedNotes.slice(0, 5).join(", "),
  )
}

if (manifest.mode === "public") {
  if (manifest.selectedPaths.some((file) => !file.toLocaleLowerCase().endsWith(".md"))) {
    fail("The public selection contains a non-Markdown source")
  }

  const publicTextFiles = outputFiles.filter((file) =>
    /\.(?:html|json|xml|txt|js|css)$/i.test(file),
  )
  const combinedOutput = (
    await Promise.all(
      publicTextFiles.map((file) => fs.readFile(path.join(outputRoot, file), "utf8")),
    )
  ).join("\n")
  const normalizedOutput = combinedOutput.replace(/\s+/g, " ")

  const privatePathLeaks = manifest.privatePaths.filter((privatePath) => {
    const withoutExtension = privatePath.replace(/\.md$/i, "")
    return (
      combinedOutput.includes(privatePath) ||
      combinedOutput.includes(withoutExtension) ||
      combinedOutput.includes(encodeURI(withoutExtension))
    )
  })
  if (privatePathLeaks.length > 0) {
    fail("Private note paths leaked into public output: " + privatePathLeaks.slice(0, 5).join(", "))
  }

  const privateBodyLeak = manifest.privateFragments.find((fragment) =>
    normalizedOutput.includes(fragment.replace(/\s+/g, " ")),
  )
  if (privateBodyLeak) fail("A private body fragment leaked into public output")

  const unreferencedAssetNames = manifest.allAssetPaths
    .filter((asset) => !manifest.referencedAssetPaths.includes(asset))
    .map((asset) => path.basename(asset))
    .filter((basename) => outputFiles.some((file) => path.basename(file) === basename))
  if (unreferencedAssetNames.length > 0) {
    fail(
      "Unreferenced Vault attachments reached public output: " + unreferencedAssetNames.join(", "),
    )
  }
} else {
  const headers = await fs.readFile(path.join(outputRoot, "_headers"), "utf8")
  for (const required of ["noindex", "no-store", "no-referrer"]) {
    if (!headers.includes(required)) fail("Private headers are missing " + required)
  }
  for (const forbidden of ["sitemap.xml", "index.xml", "rss.xml"]) {
    if (outputFiles.includes(forbidden)) fail("Private build still contains " + forbidden)
  }
  const robots = await fs.readFile(path.join(outputRoot, "robots.txt"), "utf8")
  if (!robots.includes("Disallow: /")) fail("Private robots.txt does not block crawling")
  const privateIndexHtml = await fs.readFile(path.join(outputRoot, "index.html"), "utf8")
  if (/property="og:|name="twitter:/.test(privateIndexHtml)) {
    fail("Private HTML still contains social preview metadata")
  }
}

console.log(
  "[privacy-audit] passed mode=" +
    manifest.mode +
    " source=" +
    manifest.sourceNoteCount +
    " selected=" +
    manifest.selectedNoteCount +
    " output-files=" +
    outputFiles.length,
)
