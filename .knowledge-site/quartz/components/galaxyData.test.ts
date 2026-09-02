import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { buildGalaxySectors, galaxyFolderHref, GalaxyFile } from "./galaxyData"
import { formatBeijingTime } from "./galaxyTime"

function markdownFiles(root: string, relativeRoot = ""): GalaxyFile[] {
  const files: GalaxyFile[] = []
  for (const entry of fs.readdirSync(path.join(root, relativeRoot), { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue
    const relativePath = path.join(relativeRoot, entry.name)
    if (entry.isDirectory()) {
      files.push(...markdownFiles(root, relativePath))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push({ filePath: relativePath.replaceAll("\\", "/") })
    }
  }
  return files
}

test("按真实目录生成星域，数字前缀优先并过滤空目录", () => {
  const files: GalaxyFile[] = [
    { filePath: "20 项目/进行中/项目 A.md" },
    { filePath: "00 收件箱/闪念.md" },
    { filePath: "10 领域/销售/线索.md" },
    { filePath: "10 领域/销售/成交.md" },
    { filePath: "🌳 能力树搭建/英语/听力.md" },
    { filePath: "根目录笔记.md" },
    { filePath: ".trash/已删除.md" },
  ]

  const { sectors, sun, planets } = buildGalaxySectors(files)
  assert.deepEqual(
    sectors.map((sector) => sector.folder),
    ["00 收件箱", "10 领域", "20 项目", "🌳 能力树搭建"],
  )
  assert.equal(sun?.folder, "🌳 能力树搭建")
  assert.equal(planets.length, 3)
  assert.deepEqual(
    sectors
      .find((sector) => sector.folder === "10 领域")
      ?.children.map((child) => [child.name, child.count]),
    [["销售", 2]],
  )
  assert.equal(
    sectors.some((sector) => sector.folder === ".trash"),
    false,
  )
})

test("银河星域与当前 Vault 的全部非空顶层和二级目录一致", () => {
  const vaultRoot = path.resolve(process.cwd(), "..")
  const files = markdownFiles(vaultRoot)
  const { sectors, sun, planets } = buildGalaxySectors(files)
  const expectedTopFolders = fs
    .readdirSync(vaultRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .filter((entry) => files.some((file) => file.filePath?.startsWith(`${entry.name}/`)))
    .map((entry) => entry.name)

  assert.deepEqual(new Set(sectors.map((sector) => sector.folder)), new Set(expectedTopFolders))
  assert.equal(
    sectors.reduce((total, sector) => total + sector.count, 0),
    files.filter((file) => String(file.filePath).includes("/")).length,
  )
  assert.equal(sun?.folder, "🌳 能力树搭建")
  assert.deepEqual(
    planets.map((planet) => planet.orbit),
    planets.map((_, index) => index + 1),
  )

  for (const sector of sectors) {
    assert.ok(sector.count > 0)
    assert.match(galaxyFolderHref(sector.folder), /^\.\/.+\/$/)
    for (const child of sector.children) assert.ok(child.count > 0)
  }
})

test("北京时间格式不受访问者本地时区影响", () => {
  assert.equal(formatBeijingTime(new Date("2026-08-30T00:04:05.000Z")), "2026.08.30 / 08:04:05")
})
