import { stageVault } from "./stage-content.mjs"

const publicManifest = await stageVault({ mode: "public" })
if (publicManifest.sourceNoteCount !== 332 || publicManifest.selectedNoteCount !== 252) {
  throw new Error(
    "Initial source count mismatch: expected 252 public / 332 total, got " +
      publicManifest.selectedNoteCount +
      " / " +
      publicManifest.sourceNoteCount,
  )
}

const privateManifest = await stageVault({ mode: "private" })
if (privateManifest.selectedNoteCount !== 332) {
  throw new Error(
    "Initial private source count mismatch: expected 332, got " + privateManifest.selectedNoteCount,
  )
}

console.log("[baseline] passed public=252 private=332")
