import { stageVault } from "./stage-content.mjs"

const publicManifest = await stageVault({ mode: "public" })
if (publicManifest.selectedNoteCount !== publicManifest.sourceNoteCount) {
  throw new Error(
    "Public source count mismatch: expected every note to be published, got " +
      publicManifest.selectedNoteCount +
      " / " +
      publicManifest.sourceNoteCount,
  )
}

const privateManifest = await stageVault({ mode: "private" })
if (privateManifest.selectedNoteCount !== privateManifest.sourceNoteCount) {
  throw new Error(
    "Private source count mismatch: expected every note to be staged, got " + privateManifest.selectedNoteCount,
  )
}

console.log(
  "[baseline] passed public=" +
    publicManifest.selectedNoteCount +
    " private=" +
    privateManifest.selectedNoteCount,
)
