import fs from "node:fs/promises"
import path from "node:path"

const siteRoot = path.resolve(import.meta.dirname, "..")
const outputRoot = path.join(siteRoot, "public")
const mode = process.env.SITE_MODE || "public"

const commonHeaders = [
  "/*",
  "  X-Content-Type-Options: nosniff",
  "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
]

if (mode === "private") {
  commonHeaders.push(
    "  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet",
    "  Cache-Control: no-store, max-age=0",
    "  Pragma: no-cache",
    "  Referrer-Policy: no-referrer",
  )

  for (const relativePath of ["sitemap.xml", "index.xml", "rss.xml", "static/og-image.png"]) {
    await fs.rm(path.join(outputRoot, relativePath), { force: true })
  }

  await fs.writeFile(path.join(outputRoot, "robots.txt"), "User-agent: *\nDisallow: /\n")
} else {
  commonHeaders.push("  Referrer-Policy: strict-origin-when-cross-origin")
}

await fs.writeFile(path.join(outputRoot, "_headers"), commonHeaders.join("\n") + "\n")
console.log("[finalize] security headers written for " + mode + " mode")
