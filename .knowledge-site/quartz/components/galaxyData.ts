import { FilePath, slugifyFilePath } from "../util/path"

export type GalaxyFile = {
  filePath?: string
  slug?: string
}

export type GalaxyChildFolder = {
  id: string
  name: string
  folder: string
  count: number
}

export type GalaxySector = {
  id: string
  order: string
  celestialName: string
  visualKey: string
  folder: string
  count: number
  children: GalaxyChildFolder[]
  orbit: number
  phase: number
  duration: number
  size: number
  isSun: boolean
}

type VisualPreset = {
  key: string
  celestialName: string
  size: number
}

const PREFERRED_FOLDER_ORDER = [
  "✨ 个人思考",
  "📚 专业领域",
  "🌳 能力树搭建",
  "📅 日常学习",
  "📝 日常记录",
  "🤖 AI 学习&实操",
  "📖 读书日志",
  "📎 附件",
]

const PLANET_PRESETS: VisualPreset[] = [
  { key: "earth", celestialName: "地球", size: 36 },
  { key: "jupiter", celestialName: "木星", size: 58 },
  { key: "mars", celestialName: "火星", size: 30 },
  { key: "saturn", celestialName: "土星", size: 52 },
  { key: "uranus", celestialName: "天王星", size: 40 },
  { key: "venus", celestialName: "金星", size: 36 },
  { key: "mercury", celestialName: "水星", size: 27 },
  { key: "neptune", celestialName: "海王星", size: 42 },
]

const FOLDER_PRESETS: Array<[RegExp, VisualPreset]> = [
  [/个人|思考/i, PLANET_PRESETS[0]],
  [/专业|领域/i, PLANET_PRESETS[1]],
  [/日常学习|学习日志/i, PLANET_PRESETS[2]],
  [/日常记录|记录/i, PLANET_PRESETS[3]],
  [/\bAI\b|人工智能|实操/i, PLANET_PRESETS[4]],
  [/读书|阅读/i, PLANET_PRESETS[5]],
  [/附件|资源|素材/i, PLANET_PRESETS[6]],
]

function numericPrefix(name: string) {
  const match = name.match(/^(\d{2})(?=[.\s_-]|$)/)
  return match ? Number(match[1]) : null
}

function compareFolderNames(left: string, right: string) {
  const leftNumber = numericPrefix(left)
  const rightNumber = numericPrefix(right)
  if (leftNumber !== null || rightNumber !== null) {
    if (leftNumber === null) return 1
    if (rightNumber === null) return -1
    if (leftNumber !== rightNumber) return leftNumber - rightNumber
  }

  const leftPreferred = PREFERRED_FOLDER_ORDER.indexOf(left)
  const rightPreferred = PREFERRED_FOLDER_ORDER.indexOf(right)
  if (leftPreferred !== -1 || rightPreferred !== -1) {
    if (leftPreferred === -1) return 1
    if (rightPreferred === -1) return -1
    if (leftPreferred !== rightPreferred) return leftPreferred - rightPreferred
  }

  return left.localeCompare(right, "zh-CN", { numeric: true, sensitivity: "base" })
}

function fileSegments(file: GalaxyFile) {
  const raw = String(file.filePath ?? "").replaceAll("\\", "/")
  if (!raw.toLowerCase().endsWith(".md")) return []

  let parts = raw.split("/").filter(Boolean)
  const generatedRoot = parts.lastIndexOf("content.generated")
  const contentRoot = parts.lastIndexOf("content")
  const rootIndex = Math.max(generatedRoot, contentRoot)
  if (rootIndex >= 0) parts = parts.slice(rootIndex + 1)
  return parts
}

function presetFor(folder: string, fallbackIndex: number) {
  return (
    FOLDER_PRESETS.find(([pattern]) => pattern.test(folder))?.[1] ??
    PLANET_PRESETS[fallbackIndex % PLANET_PRESETS.length]
  )
}

export function galaxyFolderHref(folder: string) {
  return `./${slugifyFilePath(folder as FilePath)}/`
}

export function buildGalaxySectors(files: GalaxyFile[]) {
  const folders = new Map<string, { count: number; children: Map<string, number> }>()

  for (const file of files) {
    const parts = fileSegments(file)
    if (parts.length < 2) continue
    const top = parts[0]
    if (!top || top.startsWith(".") || top === "tags") continue

    const entry = folders.get(top) ?? { count: 0, children: new Map<string, number>() }
    entry.count += 1
    if (parts.length > 2) {
      const child = parts[1]
      entry.children.set(child, (entry.children.get(child) ?? 0) + 1)
    }
    folders.set(top, entry)
  }

  const orderedFolders = [...folders.entries()]
    .filter(([, entry]) => entry.count > 0)
    .sort(([left], [right]) => compareFolderNames(left, right))

  const sunFolder =
    orderedFolders.find(([folder]) => /能力树|knowledge\s*tree|核心/i.test(folder))?.[0] ??
    orderedFolders.reduce<string | undefined>(
      (current, [folder, entry]) =>
        !current || entry.count > (folders.get(current)?.count ?? 0) ? folder : current,
      undefined,
    )

  let planetIndex = 0
  const sectors = orderedFolders.map<GalaxySector>(([folder, entry], index) => {
    const isSun = folder === sunFolder
    const preset = isSun
      ? { key: "sun", celestialName: "太阳", size: 184 }
      : presetFor(folder, planetIndex++)
    const prefix = numericPrefix(folder)
    const order =
      prefix === null ? String(index + 1).padStart(2, "0") : String(prefix).padStart(2, "0")
    const children = [...entry.children.entries()]
      .filter(([, count]) => count > 0)
      .sort(([left], [right]) => compareFolderNames(left, right))
      .map(([name, count]) => ({
        id: slugifyFilePath(`${folder}/${name}` as FilePath),
        name,
        folder: `${folder}/${name}`,
        count,
      }))

    return {
      id: slugifyFilePath(folder as FilePath),
      order,
      celestialName: preset.celestialName,
      visualKey: preset.key,
      folder,
      count: entry.count,
      children,
      orbit: 0,
      phase: 0,
      duration: 0,
      size: isSun ? preset.size : Math.min(68, preset.size + Math.log2(entry.count + 1) * 1.7),
      isSun,
    }
  })

  const planetSectors = sectors.filter((sector) => !sector.isSun)
  const planets = planetSectors.map((sector, index) => ({
    ...sector,
    orbit: index + 1,
    phase: (205 + index * (360 / Math.max(1, planetSectors.length))) % 360,
    duration: 72,
  }))
  const sun = sectors.find((sector) => sector.isSun)

  return { sectors, sun, planets }
}
