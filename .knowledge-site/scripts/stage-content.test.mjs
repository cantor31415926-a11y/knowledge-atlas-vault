import assert from "node:assert/strict"
import test from "node:test"
import { buildIndexes, sanitizePublicMarkdown } from "./stage-content.mjs"

test("public links keep public targets and redact private targets without leaking aliases", () => {
  const notes = [
    { relativePath: "公开/入口.md" },
    { relativePath: "公开/可见.md" },
    { relativePath: "私人/秘密计划.md" },
  ]
  const indexes = buildIndexes(notes)
  const selected = new Set(["公开/入口.md", "公开/可见.md"])
  const assets = new Set()
  const source = [
    "[[可见|公开别名]]",
    "[[秘密计划|不能泄漏的别名]]",
    "[秘密路径](../私人/秘密计划.md)",
  ].join("\n")

  const result = sanitizePublicMarkdown(source, "公开/入口.md", indexes, selected, assets)
  assert.match(result.markdown, /\[\[可见\|公开别名\]\]/)
  assert.doesNotMatch(result.markdown, /秘密计划|不能泄漏的别名|秘密路径/)
  assert.equal(result.privateLinksRedacted, 2)
})

test("a note can move private to public and back without changing the sanitizer", () => {
  const notes = [{ relativePath: "入口.md" }, { relativePath: "生长节点.md" }]
  const indexes = buildIndexes(notes)
  const source = "[[生长节点]]"

  const privateResult = sanitizePublicMarkdown(
    source,
    "入口.md",
    indexes,
    new Set(["入口.md"]),
    new Set(),
  )
  assert.match(privateResult.markdown, /私密节点/)

  const publicResult = sanitizePublicMarkdown(
    source,
    "入口.md",
    indexes,
    new Set(["入口.md", "生长节点.md"]),
    new Set(),
  )
  assert.equal(publicResult.markdown, source)

  const privateAgain = sanitizePublicMarkdown(
    source,
    "入口.md",
    indexes,
    new Set(["入口.md"]),
    new Set(),
  )
  assert.match(privateAgain.markdown, /私密节点/)
})

test("only referenced attachments are selected", () => {
  const notes = [{ relativePath: "公开/入口.md" }]
  const assets = [{ relativePath: "📎 附件/可见.png" }, { relativePath: "📎 附件/私密.png" }]
  const indexes = buildIndexes(notes, assets)
  const referenced = new Set()
  sanitizePublicMarkdown(
    "![[可见.png]]",
    "公开/入口.md",
    indexes,
    new Set(["公开/入口.md"]),
    referenced,
  )
  assert.deepEqual([...referenced], ["📎 附件/可见.png"])
})
