import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { FilePath, slugifyFilePath } from "../util/path"
import { GALAXY_BODIES, GALAXY_CATEGORIES } from "./galaxyData"
import { formatBeijingTime } from "./galaxyTime"

test("六个知识天体与六个真实顶层目录完全匹配", () => {
  assert.equal(GALAXY_CATEGORIES.length, 6)
  assert.equal(new Set(GALAXY_CATEGORIES.map((item) => item.folder)).size, 6)
  for (const item of GALAXY_CATEGORIES) {
    assert.equal(fs.statSync(path.join(process.cwd(), "..", item.folder)).isDirectory(), true)
    assert.match(slugifyFilePath(item.folder as FilePath), /\S/)
  }

  const activeFolders = new Set(GALAXY_BODIES.flatMap((body) => body.folder ?? []))
  activeFolders.add("🌳 能力树搭建")
  assert.deepEqual(activeFolders, new Set(GALAXY_CATEGORIES.map((item) => item.folder)))
})

test("水星、天王星和海王星保持不可导航", () => {
  const inactive = GALAXY_BODIES.filter((body) => !body.folder)
  assert.deepEqual(
    inactive.map((body) => body.celestialName),
    ["水星", "天王星", "海王星"],
  )
})

test("北京时间格式不受本地时区影响", () => {
  assert.equal(formatBeijingTime(new Date("2026-08-30T00:04:05.000Z")), "2026.08.30 / 08:04:05")
})
