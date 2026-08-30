import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import YAML from "yaml"

const SITE_ROOT = path.resolve(import.meta.dirname, "..")
const DEFAULT_VAULT_ROOT = path.resolve(SITE_ROOT, "..")
const DEFAULT_OUTPUT_ROOT = path.join(SITE_ROOT, "content.generated")
const MANIFEST_PATH = path.join(SITE_ROOT, ".stage-manifest.json")

const EXCLUDED_PARTS = new Set([
  ".git",
  ".knowledge-site",
  ".obsidian",
  ".claude",
  ".claudian",
  ".trash",
])

const ATTACHMENT_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".jpeg",
  ".jpg",
  ".mp3",
  ".mp4",
  ".ogg",
  ".pdf",
  ".png",
  ".svg",
  ".wav",
  ".webm",
  ".webp",
])

function toPosix(value) {
  return value.split(path.sep).join("/")
}

function withoutMarkdownExtension(value) {
  return value.replace(/\.md$/i, "")
}

function normalizedId(value) {
  return withoutMarkdownExtension(toPosix(value))
    .replace(/^\.\//, "")
    .replace(/^\/+|\/+$/g, "")
    .normalize("NFC")
    .toLocaleLowerCase("zh-CN")
}

function isExcluded(relativePath) {
  return toPosix(relativePath)
    .split("/")
    .some((part) => part.startsWith(".") || EXCLUDED_PARTS.has(part))
}

async function listFiles(root, current = "") {
  const directory = path.join(root, current)
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const relativePath = path.join(current, entry.name)
    if (isExcluded(relativePath)) continue
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, relativePath)))
    } else if (entry.isFile()) {
      files.push(relativePath)
    }
  }

  return files
}

export function readFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return {}
  try {
    return YAML.parse(match[1]) ?? {}
  } catch {
    return {}
  }
}

function addIndexValue(index, key, value) {
  if (!index.has(key)) index.set(key, [])
  index.get(key).push(value)
}

export function buildIndexes(notes, assets = []) {
  const notesByExact = new Map()
  const notesByBasename = new Map()
  const assetsByExact = new Map()
  const assetsByBasename = new Map()

  for (const note of notes) {
    const exact = normalizedId(note.relativePath)
    notesByExact.set(exact, note)
    addIndexValue(notesByBasename, path.posix.basename(exact), note)
  }

  for (const asset of assets) {
    const exact =
      normalizedId(asset.relativePath) + path.extname(asset.relativePath).toLocaleLowerCase()
    assetsByExact.set(exact, asset)
    addIndexValue(
      assetsByBasename,
      path.posix.basename(toPosix(asset.relativePath)).normalize("NFC").toLocaleLowerCase("zh-CN"),
      asset,
    )
  }

  return { notesByExact, notesByBasename, assetsByExact, assetsByBasename }
}

function cleanTarget(rawTarget) {
  let target = rawTarget.trim().replace(/^<|>$/g, "")
  try {
    target = decodeURIComponent(target)
  } catch {
    // Keep malformed URLs unchanged so Quartz can report them as broken links.
  }
  return target.replace(/\\/g, "/")
}

function noteCandidates(rawTarget, sourceRelativePath, indexes) {
  const cleaned = cleanTarget(rawTarget)
  if (!cleaned) return []
  const target = withoutMarkdownExtension(cleaned)
  const sourceDirectory = path.posix.dirname(toPosix(sourceRelativePath))
  const exactCandidates = []

  if (target.startsWith("./") || target.startsWith("../")) {
    exactCandidates.push(normalizedId(path.posix.join(sourceDirectory, target)))
  } else {
    exactCandidates.push(normalizedId(target))
    exactCandidates.push(normalizedId(path.posix.join(sourceDirectory, target)))
  }

  for (const exact of exactCandidates) {
    const note = indexes.notesByExact.get(exact)
    if (note) return [note]
  }

  const basename = path.posix.basename(normalizedId(target))
  return indexes.notesByBasename.get(basename) ?? []
}

function assetCandidates(rawTarget, sourceRelativePath, indexes) {
  const cleaned = cleanTarget(rawTarget)
  if (!cleaned || !ATTACHMENT_EXTENSIONS.has(path.extname(cleaned).toLocaleLowerCase())) return []
  const sourceDirectory = path.posix.dirname(toPosix(sourceRelativePath))
  const exactCandidates = []

  if (cleaned.startsWith("./") || cleaned.startsWith("../")) {
    exactCandidates.push(
      normalizedId(path.posix.join(sourceDirectory, cleaned)) +
        path.extname(cleaned).toLocaleLowerCase(),
    )
  } else {
    exactCandidates.push(normalizedId(cleaned) + path.extname(cleaned).toLocaleLowerCase())
    exactCandidates.push(
      normalizedId(path.posix.join(sourceDirectory, cleaned)) +
        path.extname(cleaned).toLocaleLowerCase(),
    )
  }

  for (const exact of exactCandidates) {
    const asset = indexes.assetsByExact.get(exact)
    if (asset) return [asset]
  }

  const basename = path.posix.basename(cleaned).normalize("NFC").toLocaleLowerCase("zh-CN")
  return indexes.assetsByBasename.get(basename) ?? []
}

function targetKind(rawTarget, sourceRelativePath, indexes, selectedPaths) {
  const notes = noteCandidates(rawTarget, sourceRelativePath, indexes)
  if (notes.length === 0) return "unresolved"
  const hasSelected = notes.some((note) => selectedPaths.has(note.relativePath))
  return hasSelected ? "selected" : "private"
}

function splitWikiTarget(inner) {
  return inner.split("|", 1)[0].split("#", 1)[0].split("^", 1)[0].trim()
}

function markdownDestination(rawDestination) {
  const trimmed = rawDestination.trim()
  if (trimmed.startsWith("<")) {
    const close = trimmed.indexOf(">")
    return close >= 0 ? trimmed.slice(1, close) : trimmed.slice(1)
  }
  return trimmed.replace(/\s+["'][\s\S]*$/, "")
}

function isExternalTarget(target) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)
}

export function sanitizePublicMarkdown(
  markdown,
  sourceRelativePath,
  indexes,
  selectedPaths,
  referencedAssets,
) {
  let privateLinksRedacted = 0
  let output = markdown.replace(/!?\[\[([^\]\n]+)\]\]/g, (full, inner) => {
    const target = splitWikiTarget(inner)
    const assets = assetCandidates(target, sourceRelativePath, indexes)
    if (assets.length > 0) {
      referencedAssets.add(assets[0].relativePath)
      return full
    }

    if (targetKind(target, sourceRelativePath, indexes, selectedPaths) === "private") {
      privateLinksRedacted += 1
      return '<span class="private-node" title="此节点仅在私人全库中可见">🔒 私密节点</span>'
    }
    return full
  })

  output = output.replace(/!?\[([^\]\n]*)\]\(([^)\n]+)\)/g, (full, _label, rawDestination) => {
    const target = markdownDestination(rawDestination)
    if (!target || isExternalTarget(target)) return full

    const assetTarget = target.split("#", 1)[0]
    const assets = assetCandidates(assetTarget, sourceRelativePath, indexes)
    if (assets.length > 0) {
      referencedAssets.add(assets[0].relativePath)
      return full
    }

    const noteTarget = target.split("#", 1)[0]
    if (targetKind(noteTarget, sourceRelativePath, indexes, selectedPaths) === "private") {
      privateLinksRedacted += 1
      return '<span class="private-node" title="此节点仅在私人全库中可见">🔒 私密节点</span>'
    }
    return full
  })

  return { markdown: output, privateLinksRedacted }
}

function collectReferencedAssets(markdown, sourceRelativePath, indexes, referencedAssets) {
  markdown.replace(/!?\[\[([^\]\n]+)\]\]/g, (_full, inner) => {
    const target = splitWikiTarget(inner)
    const assets = assetCandidates(target, sourceRelativePath, indexes)
    if (assets.length > 0) referencedAssets.add(assets[0].relativePath)
    return _full
  })

  markdown.replace(/!?\[([^\]\n]*)\]\(([^)\n]+)\)/g, (_full, _label, rawDestination) => {
    const target = markdownDestination(rawDestination)
    if (!target || isExternalTarget(target)) return _full
    const assets = assetCandidates(target.split("#", 1)[0], sourceRelativePath, indexes)
    if (assets.length > 0) referencedAssets.add(assets[0].relativePath)
    return _full
  })
}

function countSelectedLinks(markdown, sourceRelativePath, indexes, selectedPaths) {
  let count = 0
  markdown.replace(/!?\[\[([^\]\n]+)\]\]/g, (_full, inner) => {
    const target = splitWikiTarget(inner)
    if (targetKind(target, sourceRelativePath, indexes, selectedPaths) === "selected") count += 1
    return _full
  })
  return count
}

function collectTags(note) {
  const rawTags = note.frontmatter.tags
  if (Array.isArray(rawTags)) return rawTags.map(String)
  if (typeof rawTags === "string") {
    return rawTags
      .split(/[\s,]+/)
      .map((tag) => tag.replace(/^#/, ""))
      .filter(Boolean)
  }
  return []
}

function homepageMarkdown(mode, selectedNotes, linkCount, tags) {
  const isPrivate = mode === "private"
  const label = isPrivate ? "私人全库" : "公开知识库"
  const badge = isPrivate ? "🔒 私人全库" : "● PUBLIC ATLAS"
  const description = isPrivate
    ? "完整 Obsidian Vault 的受保护入口。"
    : "一座持续生长、由双链连接的个人知识网络。"
  const folders = new Map()

  for (const note of selectedNotes) {
    const folder = toPosix(note.relativePath).split("/")[0]
    folders.set(folder, (folders.get(folder) ?? 0) + 1)
  }

  const folderCards = [...folders.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(
      ([folder, count]) =>
        '<a class="atlas-folder-card" href="' +
        encodeURI(folder) +
        '/"><span>' +
        folder +
        "</span><strong>" +
        count +
        " 篇</strong></a>",
    )
    .join("\n")

  return [
    "---",
    "title: 知识星图",
    "description: " + description,
    "---",
    "",
    '<section class="atlas-hero">',
    '<p class="atlas-kicker">' + badge + "</p>",
    "<h1>知识星图 <span>/ Knowledge Atlas</span></h1>",
    "<p>" + description + " 从搜索、文件夹、标签或右侧图谱开始探索。</p>",
    '<div class="atlas-stats">',
    "<div><strong>" + selectedNotes.length + "</strong><span>知识节点</span></div>",
    "<div><strong>" + linkCount + "</strong><span>有效双链</span></div>",
    "<div><strong>" + tags.size + "</strong><span>主题标签</span></div>",
    "</div>",
    "</section>",
    "",
    "> [!tip] 星图导航",
    "> 右侧显示当前节点的局部关系；点击展开按钮或按 **Ctrl / ⌘ + G** 可进入完整全局星图。左侧支持中文全文搜索与文件夹浏览。",
    "",
    "## 探索入口",
    "",
    '<div class="atlas-folder-grid">',
    folderCards,
    "</div>",
    "",
    "## 关于这个" + label,
    "",
    isPrivate
      ? "这里包含完整 Vault。站点本身设置为不被索引，并将在 Cloudflare Access 登录前拦截所有页面与静态资源。"
      : "公开站只收录 frontmatter 中明确设置 publish: true 的笔记。未公开内容不会进入页面、搜索索引、图谱或部署产物。",
    "",
  ].join("\n")
}

function privateFragment(markdown) {
  const body = markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "")
    .replace(/\s+/g, " ")
    .trim()
  return body.length >= 96 ? body.slice(0, 160) : ""
}

async function writeFilePreservingPath(root, relativePath, data, sourcePath) {
  const destination = path.join(root, relativePath)
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.writeFile(destination, data)
  if (sourcePath) {
    const stats = await fs.stat(sourcePath)
    await fs.utimes(destination, stats.atime, stats.mtime)
  }
}

export async function stageVault({
  mode = process.env.SITE_MODE || "public",
  vaultRoot = DEFAULT_VAULT_ROOT,
  outputRoot = DEFAULT_OUTPUT_ROOT,
  manifestPath = MANIFEST_PATH,
} = {}) {
  if (!["public", "private"].includes(mode)) {
    throw new Error("SITE_MODE must be either public or private")
  }

  const resolvedOutput = path.resolve(outputRoot)
  if (!resolvedOutput.startsWith(path.resolve(SITE_ROOT) + path.sep)) {
    throw new Error("Refusing to stage content outside the Quartz site directory")
  }

  const allFiles = await listFiles(vaultRoot)
  const notePaths = allFiles.filter((file) => path.extname(file).toLocaleLowerCase() === ".md")
  const assetPaths = allFiles.filter((file) =>
    ATTACHMENT_EXTENSIONS.has(path.extname(file).toLocaleLowerCase()),
  )
  const notes = await Promise.all(
    notePaths.map(async (relativePath) => {
      const markdown = await fs.readFile(path.join(vaultRoot, relativePath), "utf8")
      return {
        relativePath,
        markdown,
        frontmatter: readFrontmatter(markdown),
      }
    }),
  )
  const assets = assetPaths.map((relativePath) => ({ relativePath }))
  const indexes = buildIndexes(notes, assets)
  const publishedNotes = notes.filter((note) => note.frontmatter.publish === true)
  const selectedNotes = notes
  const selectedPaths = new Set(selectedNotes.map((note) => note.relativePath))
  const referencedAssets = new Set()
  let privateLinksRedacted = 0
  let linkCount = 0
  const tags = new Set()

  await fs.rm(resolvedOutput, { recursive: true, force: true })
  await fs.mkdir(resolvedOutput, { recursive: true })

  for (const note of selectedNotes) {
    let outputMarkdown = note.markdown
    if (mode === "public") {
      const sanitized = sanitizePublicMarkdown(
        note.markdown,
        note.relativePath,
        indexes,
        selectedPaths,
        referencedAssets,
      )
      outputMarkdown = sanitized.markdown
      privateLinksRedacted += sanitized.privateLinksRedacted
    } else {
      collectReferencedAssets(note.markdown, note.relativePath, indexes, referencedAssets)
    }

    linkCount += countSelectedLinks(note.markdown, note.relativePath, indexes, selectedPaths)
    for (const tag of collectTags(note)) tags.add(tag)
    await writeFilePreservingPath(
      resolvedOutput,
      note.relativePath,
      outputMarkdown,
      path.join(vaultRoot, note.relativePath),
    )
  }

  for (const relativePath of referencedAssets) {
    await writeFilePreservingPath(
      resolvedOutput,
      relativePath,
      await fs.readFile(path.join(vaultRoot, relativePath)),
      path.join(vaultRoot, relativePath),
    )
  }

  await writeFilePreservingPath(
    resolvedOutput,
    "index.md",
    homepageMarkdown(mode, selectedNotes, linkCount, tags),
  )

  const privateNotes = notes.filter((note) => !selectedPaths.has(note.relativePath))
  const manifest = {
    mode,
    generatedAt: new Date().toISOString(),
    sourceNoteCount: notes.length,
    publishedNoteCount: publishedNotes.length,
    selectedNoteCount: selectedNotes.length,
    generatedHomepageCount: 1,
    linkCount,
    tagCount: tags.size,
    privateLinksRedacted,
    selectedPaths: [...selectedPaths].map(toPosix).sort(),
    privatePaths: privateNotes.map((note) => toPosix(note.relativePath)).sort(),
    privateFragments: privateNotes.map((note) => privateFragment(note.markdown)).filter(Boolean),
    allAssetPaths: assetPaths.map(toPosix).sort(),
    referencedAssetPaths: [...referencedAssets].map(toPosix).sort(),
    selectedDigest: crypto
      .createHash("sha256")
      .update([...selectedPaths].map(toPosix).sort().join("\n"))
      .digest("hex"),
  }
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n")

  console.log(
    "[stage] mode=" +
      mode +
      " notes=" +
      selectedNotes.length +
      "/" +
      notes.length +
      " attachments=" +
      referencedAssets.size +
      " private-links-redacted=" +
      privateLinksRedacted,
  )
  return manifest
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (invokedDirectly) {
  await stageVault()
}
