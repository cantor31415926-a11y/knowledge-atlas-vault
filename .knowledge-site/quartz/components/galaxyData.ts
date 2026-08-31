export type GalaxyCategory = {
  order: string
  celestialName: string
  category: string
  folder: string
}

export type GalaxyBody = {
  key: string
  celestialName: string
  category: string
  folder?: string
  orbit: number
  phase: number
  duration: number
  x: number
  y: number
  size: number
}

export const GALAXY_CATEGORIES: GalaxyCategory[] = [
  { order: "01", celestialName: "地球", category: "个人思考", folder: "✨ 个人思考" },
  { order: "02", celestialName: "土星", category: "专业领域", folder: "📚 专业领域" },
  { order: "03", celestialName: "太阳", category: "能力树", folder: "🌳 能力树搭建" },
  { order: "04", celestialName: "火星", category: "日常学习", folder: "📅 日常学习" },
  { order: "05", celestialName: "木星", category: "日常记录", folder: "📝 日常记录" },
  {
    order: "06",
    celestialName: "金星",
    category: "AI学习和实操",
    folder: "🤖 AI 学习&实操",
  },
]

export const GALAXY_BODIES: GalaxyBody[] = [
  {
    key: "mercury",
    celestialName: "水星",
    category: "待拓展",
    orbit: 1,
    phase: 218,
    duration: 30,
    x: 43,
    y: 33,
    size: 12,
  },
  {
    key: "venus",
    celestialName: "金星",
    category: "06. AI学习和实操",
    folder: "🤖 AI 学习&实操",
    orbit: 2,
    phase: 326,
    duration: 38,
    x: 57,
    y: 38,
    size: 19,
  },
  {
    key: "earth",
    celestialName: "地球",
    category: "01. 个人思考",
    folder: "✨ 个人思考",
    orbit: 3,
    phase: 148,
    duration: 48,
    x: 31,
    y: 60,
    size: 22,
  },
  {
    key: "mars",
    celestialName: "火星",
    category: "04. 日常学习",
    folder: "📅 日常学习",
    orbit: 4,
    phase: 28,
    duration: 58,
    x: 64,
    y: 62,
    size: 17,
  },
  {
    key: "jupiter",
    celestialName: "木星",
    category: "05. 日常记录",
    folder: "📝 日常记录",
    orbit: 5,
    phase: 202,
    duration: 76,
    x: 25,
    y: 34,
    size: 42,
  },
  {
    key: "saturn",
    celestialName: "土星",
    category: "02. 专业领域",
    folder: "📚 专业领域",
    orbit: 6,
    phase: 322,
    duration: 92,
    x: 77,
    y: 30,
    size: 36,
  },
  {
    key: "uranus",
    celestialName: "天王星",
    category: "待拓展",
    orbit: 7,
    phase: 156,
    duration: 112,
    x: 20,
    y: 72,
    size: 28,
  },
  {
    key: "neptune",
    celestialName: "海王星",
    category: "待拓展",
    orbit: 8,
    phase: 24,
    duration: 132,
    x: 81,
    y: 73,
    size: 26,
  },
]
