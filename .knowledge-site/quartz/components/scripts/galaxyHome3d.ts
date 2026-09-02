import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"

type GalaxyChild = {
  id: string
  name: string
  count: number
  href: string
}

type GalaxySector = {
  id: string
  order: string
  celestialName: string
  visualKey: string
  folder: string
  count: number
  children: GalaxyChild[]
  orbit: number
  phase: number
  duration: number
  size: number
  isSun: boolean
}

export type GalaxyHome3D = {
  setScene(entered: boolean): void
  focusSector(sectorId: string | null): void
  dispose(): void
}

type PlanetPalette = {
  base: string
  light: string
  dark: string
  glow: string
  ring?: string
}

type MoonRecord = {
  mesh: THREE.Mesh
  label: HTMLAnchorElement
  baseAngle: number
  radiusX: number
  radiusZ: number
  speed: number
}

type BodyRecord = {
  sector: GalaxySector
  anchor: THREE.Group
  visual: THREE.Group
  mesh: THREE.Mesh
  button: HTMLButtonElement | null
  radius: number
  orbitX: number
  orbitZ: number
  phase: number
  speed: number
  moons: MoonRecord[]
  moonSystem: THREE.Group | null
}

type CameraTween = {
  started: number
  duration: number
  fromPosition: THREE.Vector3
  toPosition: THREE.Vector3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
  fromMix: number
  toMix: number
}

type BlackHoleSystem = {
  group: THREE.Group
  update(time: number, opacity: number): void
}

const PALETTES: Record<string, PlanetPalette> = {
  earth: { base: "#087ef5", light: "#62f3ff", dark: "#041c72", glow: "#3eeaff" },
  jupiter: { base: "#c06aff", light: "#ffb56b", dark: "#3b176f", glow: "#ea76ff" },
  mars: { base: "#ff502c", light: "#ffae47", dark: "#5a0714", glow: "#ff563e" },
  saturn: {
    base: "#ffc84c",
    light: "#fff0a0",
    dark: "#714018",
    glow: "#ffd25f",
    ring: "#ffe08a",
  },
  uranus: { base: "#21d7c7", light: "#a2fff8", dark: "#06435f", glow: "#4effee" },
  venus: { base: "#ff8c32", light: "#ffe073", dark: "#7e2615", glow: "#ffaf45" },
  mercury: { base: "#8290aa", light: "#e7ecff", dark: "#242945", glow: "#a6c3ff" },
  neptune: { base: "#3f4eff", light: "#47d7ff", dark: "#100c6f", glow: "#607cff" },
}

const SUN_VERTEX_SHADER = `
  varying vec3 vNormalView;
  varying vec3 vPosition;
  varying vec3 vViewDirection;

  void main() {
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vPosition = position;
    vViewDirection = normalize(-modelViewPosition.xyz);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`

const SUN_FRAGMENT_SHADER = `
  uniform float uTime;
  varying vec3 vNormalView;
  varying vec3 vPosition;
  varying vec3 vViewDirection;

  void main() {
    float flowA = sin(vPosition.y * 8.0 + uTime * 1.35);
    float flowB = sin((vPosition.x + vPosition.z) * 11.0 - uTime * 1.8);
    float granulation = sin(length(vPosition.xz) * 18.0 + uTime * 2.1);
    float energy = clamp(0.5 + flowA * 0.16 + flowB * 0.12 + granulation * 0.09, 0.0, 1.0);
    float fresnel = pow(1.0 - max(dot(vNormalView, vViewDirection), 0.0), 2.25);
    vec3 ember = vec3(0.72, 0.08, 0.005);
    vec3 gold = vec3(1.0, 0.48, 0.035);
    vec3 whiteHot = vec3(1.0, 0.91, 0.46);
    vec3 color = mix(ember, gold, energy);
    color = mix(color, whiteHot, smoothstep(0.68, 1.0, energy));
    color += vec3(1.0, 0.22, 0.03) * fresnel * 1.6;
    gl_FragColor = vec4(color, 1.0);
  }
`

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormalView;
  varying vec3 vViewDirection;

  void main() {
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDirection = normalize(-modelViewPosition.xyz);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`

const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uOpacity;
  varying vec3 vNormalView;
  varying vec3 vViewDirection;

  void main() {
    float fresnel = pow(1.0 - abs(dot(vNormalView, vViewDirection)), uPower);
    gl_FragColor = vec4(uColor, fresnel * uOpacity);
  }
`

const ACCRETION_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ACCRETION_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    vec4 h = fract(sin(vec4(dot(cell, vec2(127.1, 311.7)),
      dot(cell + vec2(1.0, 0.0), vec2(127.1, 311.7)),
      dot(cell + vec2(0.0, 1.0), vec2(127.1, 311.7)),
      dot(cell + vec2(1.0), vec2(127.1, 311.7)))) * 43758.5453);
    return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
  }

  void main() {
    vec2 centered = (vUv - 0.5) * 2.0;
    float radius = length(centered);
    float angle = atan(centered.y, centered.x);
    float radialMask = (1.0 - smoothstep(0.62, 1.0, radius)) * smoothstep(0.16, 0.20, radius);
    float swirl = angle + radius * 5.0 - uTime * 0.22;
    vec2 flow = vec2(cos(swirl), sin(swirl)) * radius * 24.0;
    float turbulence = noise(flow) * 0.6 + noise(flow * 3.1) * 0.28 + noise(flow * 8.3) * 0.12;
    float lanes = 0.5 + 0.5 * sin(radius * 185.0 + angle * 3.0 + turbulence * 7.0 - uTime * 1.4);
    float filaments = pow(lanes, 3.0) * turbulence + pow(turbulence, 3.0) * 0.65;
    float heat = 1.0 - smoothstep(0.25, 0.92, radius);
    float coolSide = smoothstep(-0.3, 0.75, sin(angle - 0.55));
    vec3 ember = vec3(0.92, 0.09, 0.008);
    vec3 gold = vec3(1.0, 0.43, 0.035);
    vec3 whiteHot = vec3(1.0, 0.88, 0.52);
    vec3 ionBlue = vec3(0.08, 0.32, 1.0);
    vec3 color = mix(ember, gold, heat);
    color = mix(color, whiteHot, heat * filaments * 0.82);
    color = mix(color, ionBlue, coolSide * (1.0 - heat) * 0.42);
    float alpha = radialMask * (0.16 + filaments * 0.96) * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`

const JET_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const JET_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    float lengthFade = smoothstep(0.0, 0.13, vUv.y) * (1.0 - smoothstep(0.68, 1.0, vUv.y));
    float braid = pow(abs(sin(vUv.x * 38.0 + vUv.y * 17.0 - uTime * 4.8)), 9.0);
    float pulse = 0.5 + 0.5 * sin(vUv.y * 54.0 - uTime * 7.0);
    vec3 blue = vec3(0.04, 0.29, 1.0);
    vec3 cyan = vec3(0.18, 0.82, 1.0);
    vec3 whiteHot = vec3(0.9, 0.97, 1.0);
    vec3 color = mix(blue, cyan, vUv.y);
    color = mix(color, whiteHot, braid * 0.35 + pulse * 0.08);
    float alpha = lengthFade * (0.045 + braid * 0.2 + pulse * 0.055) * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`

const JET_PARTICLE_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uOpacity;
  attribute float aSeed;
  attribute float aSide;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float speed = 4.0 + aSeed * 4.2;
    float travel = mod(position.y + uTime * speed, 48.0);
    float radius = (0.08 + travel * 0.052) * (0.22 + aSeed * 0.82);
    float angle = aSeed * 31.4159 + travel * 0.38 + uTime * 0.7;
    vec3 transformed = vec3(cos(angle) * radius, aSide * (2.8 + travel), sin(angle) * radius);
    vec4 modelViewPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    gl_PointSize = (1.4 + aSeed * 2.6) * clamp(260.0 / -modelViewPosition.z, 0.8, 3.8);
    vAlpha = smoothstep(0.0, 3.4, travel) * (1.0 - smoothstep(37.0, 48.0, travel)) * uOpacity;
    vColor = mix(vec3(0.025, 0.18, 1.0), vec3(0.36, 0.72, 1.0), aSeed);
  }
`

const JET_PARTICLE_FRAGMENT_SHADER = `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float glow = 1.0 - smoothstep(0.02, 0.5, length(point));
    gl_FragColor = vec4(vColor, glow * vAlpha * 0.58);
  }
`

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function parseSectors(root: HTMLElement): GalaxySector[] {
  const node = root.querySelector<HTMLScriptElement>("[data-galaxy-data]")
  if (!node?.textContent) return []
  const value: unknown = JSON.parse(node.textContent)
  return Array.isArray(value) ? (value as GalaxySector[]) : []
}

function createGalaxy(pointCount: number) {
  const random = seededRandom(314159)
  const positions = new Float32Array(pointCount * 3)
  const colors = new Float32Array(pointCount * 3)
  const blue = new THREE.Color("#378cff")
  const ember = new THREE.Color("#ff5d20")
  const white = new THREE.Color("#fff1c7")
  const mixed = new THREE.Color()

  for (let index = 0; index < pointCount; index++) {
    const radius = 4 + Math.pow(random(), 0.68) * 40
    const branch = (index % 4) * (Math.PI / 2)
    const spin = radius * 0.23
    const spread = (0.35 + radius * 0.045) * (random() - 0.5)
    const angle = branch + spin + spread
    const offset = index * 3
    positions[offset] = Math.cos(angle) * radius + (random() - 0.5) * radius * 0.09
    positions[offset + 1] = (random() - 0.5) * (0.45 + radius * 0.032)
    positions[offset + 2] = Math.sin(angle) * radius * 0.62 + (random() - 0.5) * radius * 0.06

    const radialColor = Math.sin(angle * 0.56) > -0.12 ? ember : blue
    mixed.copy(radialColor).lerp(white, Math.max(0, 1 - radius / 19) * 0.72)
    colors[offset] = mixed.r
    colors[offset + 1] = mixed.g
    colors[offset + 2] = mixed.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: 0.13,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.86,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  return { points: new THREE.Points(geometry, material), material }
}

function createStarField(pointCount: number) {
  const random = seededRandom(271828)
  const positions = new Float32Array(pointCount * 3)
  for (let index = 0; index < pointCount; index++) {
    const offset = index * 3
    const radius = 48 + random() * 86
    const azimuth = random() * Math.PI * 2
    const polar = Math.acos(2 * random() - 1)
    positions[offset] = radius * Math.sin(polar) * Math.cos(azimuth)
    positions[offset + 1] = radius * Math.cos(polar)
    positions[offset + 2] = radius * Math.sin(polar) * Math.sin(azimuth)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: "#b7dcff",
    size: 0.12,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  return new THREE.Points(geometry, material)
}

function createBlackHole(compact: boolean): BlackHoleSystem {
  const group = new THREE.Group()

  const eventHorizonMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
  })
  const eventHorizon = new THREE.Mesh(
    new THREE.SphereGeometry(2.55, compact ? 40 : 64, compact ? 28 : 42),
    eventHorizonMaterial,
  )
  eventHorizon.renderOrder = 6
  group.add(eventHorizon)

  const accretionMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: ACCRETION_VERTEX_SHADER,
    fragmentShader: ACCRETION_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
  const accretionDisk = new THREE.Mesh(
    new THREE.RingGeometry(2.75, 15.5, compact ? 144 : 240, 1),
    accretionMaterial,
  )
  accretionDisk.rotation.x = -Math.PI / 2
  accretionDisk.renderOrder = 4
  group.add(accretionDisk)

  const photonRingMaterial = new THREE.MeshBasicMaterial({
    color: "#ff9d45",
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const photonRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.78, 0.105, 20, compact ? 96 : 160),
    photonRingMaterial,
  )
  photonRing.rotation.x = -0.32
  photonRing.renderOrder = 7
  group.add(photonRing)

  const lensHalo = createAtmosphere("#ff7f32", 3.28, 0.42)
  lensHalo.renderOrder = 5
  group.add(lensHalo)

  const jetMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: JET_VERTEX_SHADER,
    fragmentShader: JET_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
  const upperJet = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 0.1, 48, compact ? 28 : 44, 1, true),
    jetMaterial,
  )
  upperJet.position.y = 26.3
  const lowerJet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 3.6, 48, compact ? 28 : 44, 1, true),
    jetMaterial,
  )
  lowerJet.position.y = -26.3
  group.add(upperJet, lowerJet)

  const particleCount = compact ? 520 : 1100
  const particlePositions = new Float32Array(particleCount * 3)
  const particleSeeds = new Float32Array(particleCount)
  const particleSides = new Float32Array(particleCount)
  const random = seededRandom(141421)
  for (let index = 0; index < particleCount; index++) {
    particlePositions[index * 3 + 1] = random() * 48
    particleSeeds[index] = random()
    particleSides[index] = index % 2 === 0 ? 1 : -1
  }
  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3))
  particleGeometry.setAttribute("aSeed", new THREE.BufferAttribute(particleSeeds, 1))
  particleGeometry.setAttribute("aSide", new THREE.BufferAttribute(particleSides, 1))
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: JET_PARTICLE_VERTEX_SHADER,
    fragmentShader: JET_PARTICLE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const jetParticles = new THREE.Points(particleGeometry, particleMaterial)
  jetParticles.frustumCulled = false
  group.add(jetParticles)

  return {
    group,
    update(time, opacity) {
      group.visible = opacity > 0.015
      accretionMaterial.uniforms.uTime.value = time
      accretionMaterial.uniforms.uOpacity.value = opacity
      jetMaterial.uniforms.uTime.value = time
      jetMaterial.uniforms.uOpacity.value = opacity
      particleMaterial.uniforms.uTime.value = time
      particleMaterial.uniforms.uOpacity.value = opacity
      eventHorizonMaterial.opacity = opacity
      photonRingMaterial.opacity = 0.82 * opacity
      lensHalo.material.uniforms.uOpacity.value = 0.42 * opacity
      accretionDisk.rotation.z = time * 0.11
      photonRing.rotation.z = Math.sin(time * 0.32) * 0.035
      jetParticles.rotation.y = time * 0.035
    },
  }
}

function createAtmosphere(color: string, radius: number, opacity = 0.78) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: 2.15 },
      uOpacity: { value: opacity },
    },
    vertexShader: ATMOSPHERE_VERTEX_SHADER,
    fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  })
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), material)
}

function createPlanetTexture(palette: PlanetPalette, seed: number) {
  const random = seededRandom(seed)
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext("2d")
  if (!context) return null

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, palette.dark)
  gradient.addColorStop(0.32, palette.base)
  gradient.addColorStop(0.52, palette.light)
  gradient.addColorStop(0.72, palette.base)
  gradient.addColorStop(1, palette.dark)
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.globalCompositeOperation = "screen"
  for (let index = 0; index < 18; index++) {
    const y = random() * canvas.height
    const height = 2 + random() * 10
    context.fillStyle = `${index % 2 === 0 ? palette.light : palette.base}${Math.round(
      30 + random() * 44,
    )
      .toString(16)
      .padStart(2, "0")}`
    context.fillRect(0, y, canvas.width, height)
  }

  context.globalCompositeOperation = "multiply"
  for (let index = 0; index < 16; index++) {
    context.beginPath()
    context.fillStyle = `${palette.dark}${Math.round(50 + random() * 70)
      .toString(16)
      .padStart(2, "0")}`
    context.ellipse(
      random() * canvas.width,
      random() * canvas.height,
      5 + random() * 28,
      2 + random() * 7,
      random() * 0.35,
      0,
      Math.PI * 2,
    )
    context.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = 4
  return texture
}

function createOrbit(radiusX: number, radiusZ: number, color = "#2daaff") {
  const points = Array.from({ length: 160 }, (_, index) => {
    const angle = (index / 160) * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle) * radiusX, 0, Math.sin(angle) * radiusZ)
  })
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  return new THREE.LineLoop(geometry, material)
}

function createSun(sector: GalaxySector, button: HTMLButtonElement | null): BodyRecord {
  const anchor = new THREE.Group()
  const visual = new THREE.Group()
  anchor.add(visual)
  const radius = 2.55
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: SUN_VERTEX_SHADER,
    fragmentShader: SUN_FRAGMENT_SHADER,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 72, 48), material)
  mesh.userData.sectorId = sector.id
  visual.add(mesh)
  visual.add(createAtmosphere("#ff742e", radius * 1.2, 0.78))
  visual.add(createAtmosphere("#ffcc67", radius * 1.09, 0.58))

  const random = seededRandom(161803)
  const coronaPositions = new Float32Array(180 * 3)
  for (let index = 0; index < 180; index++) {
    const radiusOffset = radius * (1.05 + random() * 0.55)
    const azimuth = random() * Math.PI * 2
    const polar = Math.acos(2 * random() - 1)
    const offset = index * 3
    coronaPositions[offset] = radiusOffset * Math.sin(polar) * Math.cos(azimuth)
    coronaPositions[offset + 1] = radiusOffset * Math.cos(polar)
    coronaPositions[offset + 2] = radiusOffset * Math.sin(polar) * Math.sin(azimuth)
  }
  const coronaGeometry = new THREE.BufferGeometry()
  coronaGeometry.setAttribute("position", new THREE.BufferAttribute(coronaPositions, 3))
  visual.add(
    new THREE.Points(
      coronaGeometry,
      new THREE.PointsMaterial({
        color: "#ff9b38",
        size: 0.11,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  )

  return {
    sector,
    anchor,
    visual,
    mesh,
    button,
    radius,
    orbitX: 0,
    orbitZ: 0,
    phase: 0,
    speed: 0,
    moons: [],
    moonSystem: null,
  }
}

function createPlanet(sector: GalaxySector, index: number, button: HTMLButtonElement | null) {
  const palette = PALETTES[sector.visualKey] ?? PALETTES.neptune
  const anchor = new THREE.Group()
  const visual = new THREE.Group()
  anchor.add(visual)
  const normalizedSize = THREE.MathUtils.clamp((sector.size - 27) / 31, 0, 1)
  const radius = 0.62 + normalizedSize * 0.58
  const geometry = new THREE.SphereGeometry(radius, 48, 32)
  const texture = createPlanetTexture(palette, 700 + index * 97)
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    roughness: 0.62,
    metalness: 0.08,
    emissive: new THREE.Color(palette.glow),
    emissiveMap: texture,
    emissiveIntensity: 0.34,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.z = (index % 2 === 0 ? 1 : -1) * (0.08 + index * 0.018)
  mesh.userData.sectorId = sector.id
  visual.add(mesh)
  visual.add(createAtmosphere(palette.glow, radius * 1.08, 0.52))

  if (palette.ring) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.42, radius * 2.05, 96),
      new THREE.MeshBasicMaterial({
        color: palette.ring,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    ring.rotation.x = Math.PI / 2.12
    ring.rotation.z = -0.18
    visual.add(ring)
  }

  const orbitX = 6.5 + index * 3.05
  const orbitZ = orbitX * 0.58
  const phase = THREE.MathUtils.degToRad(sector.phase)
  return {
    record: {
      sector,
      anchor,
      visual,
      mesh,
      button,
      radius,
      orbitX,
      orbitZ,
      phase,
      speed: (Math.PI * 2) / Math.max(24, sector.duration),
      moons: [],
      moonSystem: null,
    } satisfies BodyRecord,
    orbit: createOrbit(orbitX, orbitZ),
  }
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : []
    for (const material of materials) {
      const values = Object.values(material) as unknown[]
      for (const value of values) {
        if (value instanceof THREE.Texture) value.dispose()
      }
      material.dispose()
    }
  })
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2
}

export function mountGalaxyHome3D(root: HTMLElement): GalaxyHome3D {
  const canvasNode = root.querySelector<HTMLCanvasElement>(".galaxy-webgl")
  const sectors = parseSectors(root)
  if (!canvasNode || sectors.length === 0) throw new Error("Galaxy scene data is unavailable")
  const canvas = canvasNode

  const compact = window.matchMedia("(max-width: 760px)").matches
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !compact,
    powerPreference: "high-performance",
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.setClearColor(0x01030b, 1)

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x02020c, 0.008)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 240)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.enablePan = false
  controls.minDistance = 8
  controls.maxDistance = 82
  controls.minPolarAngle = 0.34
  controls.maxPolarAngle = 1.42
  controls.zoomToCursor = true

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), compact ? 0.55 : 0.78, 0.42, 0.62)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const galaxyGroup = new THREE.Group()
  galaxyGroup.rotation.x = -0.08
  galaxyGroup.rotation.z = 0.28
  scene.add(galaxyGroup)
  const galaxy = createGalaxy(compact ? 2600 : 6200)
  galaxyGroup.add(galaxy.points)
  galaxyGroup.add(createStarField(compact ? 650 : 1400))
  const blackHole = createBlackHole(compact)
  galaxyGroup.add(blackHole.group)

  const solarGroup = new THREE.Group()
  solarGroup.rotation.x = -0.03
  scene.add(solarGroup)
  solarGroup.add(new THREE.AmbientLight(0x58699c, 0.92))
  const planetFill = new THREE.DirectionalLight(0xc5dcff, 1.4)
  planetFill.position.set(-10, 14, 22)
  solarGroup.add(planetFill)
  const sunLight = new THREE.PointLight(0xff9b52, 28, 90, 1.45)
  solarGroup.add(sunLight)

  const buttons = new Map(
    [...root.querySelectorAll<HTMLButtonElement>("[data-sector-button]")].map((button) => [
      button.dataset.sectorId ?? "",
      button,
    ]),
  )
  const bodies: BodyRecord[] = []
  const interactiveMeshes: THREE.Object3D[] = []
  const sunSector = sectors.find((sector) => sector.isSun)
  if (sunSector) {
    const sun = createSun(sunSector, buttons.get(sunSector.id) ?? null)
    bodies.push(sun)
    solarGroup.add(sun.anchor)
    interactiveMeshes.push(sun.mesh)
  }

  const planets = sectors.filter((sector) => !sector.isSun).sort((a, b) => a.orbit - b.orbit)
  planets.forEach((sector, index) => {
    const { record, orbit } = createPlanet(sector, index, buttons.get(sector.id) ?? null)
    bodies.push(record)
    solarGroup.add(orbit, record.anchor)
    interactiveMeshes.push(record.mesh)
  })

  const bodyById = new Map(bodies.map((body) => [body.sector.id, body]))
  const introPosition = new THREE.Vector3(0, 17, 64)
  const targetOrigin = new THREE.Vector3()
  const projected = new THREE.Vector3()
  const worldPosition = new THREE.Vector3()
  const worldScale = new THREE.Vector3()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const pointerDown = new THREE.Vector2()
  const resizeObserver = new ResizeObserver(() => resize())
  let sceneMix = root.classList.contains("is-entered") ? 1 : 0
  let entered = sceneMix === 1
  let selectedId: string | null = null
  let orbitElapsed = 0
  let lastFrame = performance.now()
  let frame = 0
  let cameraTween: CameraTween | null = null
  let solarScale = 1
  let disposed = false

  function homePosition() {
    const aspect = Math.max(0.35, camera.aspect)
    if (aspect < 0.72) return new THREE.Vector3(0, 27, 61)
    if (aspect < 1.05) return new THREE.Vector3(0, 23, 49)
    return new THREE.Vector3(0, 18, 38)
  }

  function resize() {
    const bounds = root.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) return
    const pixelRatio = Math.min(window.devicePixelRatio || 1, compact ? 1.2 : 1.7)
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(bounds.width, bounds.height, false)
    composer.setPixelRatio(pixelRatio)
    composer.setSize(bounds.width, bounds.height)
    camera.aspect = bounds.width / bounds.height
    camera.updateProjectionMatrix()
    solarScale = camera.aspect < 0.72 ? 0.61 : camera.aspect < 1.05 ? 0.78 : 1
    if (!cameraTween && !selectedId) {
      const position = entered ? homePosition() : introPosition
      camera.position.copy(position)
      controls.target.copy(targetOrigin)
    }
  }

  function startCameraTween(
    position: THREE.Vector3,
    target: THREE.Vector3,
    mix: number,
    duration: number,
  ) {
    if (reduceMotion) {
      camera.position.copy(position)
      controls.target.copy(target)
      sceneMix = mix
      cameraTween = null
      controls.enabled = entered
      return
    }
    cameraTween = {
      started: performance.now(),
      duration,
      fromPosition: camera.position.clone(),
      toPosition: position.clone(),
      fromTarget: controls.target.clone(),
      toTarget: target.clone(),
      fromMix: sceneMix,
      toMix: mix,
    }
    controls.enabled = false
  }

  function removeMoons(body: BodyRecord | undefined) {
    if (!body?.moonSystem) return
    for (const moon of body.moons) moon.label.remove()
    interactiveMeshes.splice(
      0,
      interactiveMeshes.length,
      ...interactiveMeshes.filter((object) => !body.moons.some((moon) => moon.mesh === object)),
    )
    disposeObject(body.moonSystem)
    body.anchor.remove(body.moonSystem)
    body.moonSystem = null
    body.moons = []
  }

  function createMoons(body: BodyRecord) {
    removeMoons(body)
    if (body.sector.children.length === 0) return
    const system = new THREE.Group()
    body.anchor.add(system)
    body.moonSystem = system
    const labelHost = root.querySelector<HTMLElement>(".solar-scene") ?? root

    body.sector.children.forEach((child, index) => {
      const ringIndex = Math.floor(index / 6)
      const slot = index % 6
      const slotsInRing = Math.min(6, body.sector.children.length - ringIndex * 6)
      const radiusX = body.radius * 2.35 + 1.15 + ringIndex * 1.45
      const radiusZ = radiusX * 0.64
      if (slot === 0) system.add(createOrbit(radiusX, radiusZ, "#77e8ff"))
      const palette = PALETTES[body.sector.visualKey] ?? PALETTES.neptune
      const material = new THREE.MeshStandardMaterial({
        color: palette.light,
        emissive: new THREE.Color(palette.glow),
        emissiveIntensity: 0.62,
        roughness: 0.52,
        metalness: 0.18,
      })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 14), material)
      mesh.userData.childId = child.id
      system.add(mesh)
      interactiveMeshes.push(mesh)

      const label = document.createElement("a")
      label.className = "galaxy-moon-label"
      label.href = child.href
      label.dataset.runtimeMoon = child.id
      const labelName = document.createElement("strong")
      labelName.textContent = child.name
      const labelCount = document.createElement("small")
      labelCount.textContent = `${child.count} 篇`
      label.append(labelName, labelCount)
      labelHost.append(label)

      body.moons.push({
        mesh,
        label,
        baseAngle: (slot / Math.max(1, slotsInRing)) * Math.PI * 2 + ringIndex * 0.42,
        radiusX,
        radiusZ,
        speed: 0.23 + ringIndex * 0.07,
      })
    })
  }

  function updateBodies(delta: number) {
    if (entered && !selectedId && !reduceMotion) orbitElapsed += delta
    for (const body of bodies) {
      if (!body.sector.isSun) {
        const angle = body.phase + orbitElapsed * body.speed
        body.anchor.position.set(
          Math.cos(angle) * body.orbitX,
          Math.sin(angle * 0.7) * 0.16,
          Math.sin(angle) * body.orbitZ,
        )
      }
      if (!reduceMotion) {
        body.mesh.rotation.y += delta * (body.sector.id === selectedId ? 1.75 : 0.2)
        if (body.sector.isSun) {
          const material = body.mesh.material as THREE.ShaderMaterial
          material.uniforms.uTime.value += delta
        }
      }
      const targetScale = body.sector.id === selectedId ? 1.2 : selectedId ? 0.12 : 1
      const scale = THREE.MathUtils.damp(body.visual.scale.x, targetScale, 7.5, delta)
      body.visual.scale.setScalar(scale)

      for (const moon of body.moons) {
        const angle =
          moon.baseAngle +
          (reduceMotion ? 0 : orbitElapsed * moon.speed + performance.now() * 0.00025)
        moon.mesh.position.set(
          Math.cos(angle) * moon.radiusX,
          Math.sin(angle * 1.7) * 0.18,
          Math.sin(angle) * moon.radiusZ,
        )
        if (!reduceMotion) moon.mesh.rotation.y += delta * 0.9
      }
    }
  }

  function updateSceneMix(now = performance.now()) {
    const introOpacity = 1 - THREE.MathUtils.smoothstep(sceneMix, 0.08, 0.9)
    galaxy.material.opacity = THREE.MathUtils.lerp(0.86, 0.16, sceneMix)
    blackHole.update(reduceMotion ? 0 : now * 0.001, introOpacity)
    galaxyGroup.scale.setScalar(THREE.MathUtils.lerp(1, 2.05, sceneMix))
    galaxyGroup.rotation.y += reduceMotion ? 0 : 0.00018
    solarGroup.visible = sceneMix > 0.015
    solarGroup.scale.setScalar(solarScale * THREE.MathUtils.lerp(0.22, 1, sceneMix))
  }

  function updateCameraTween(now: number) {
    if (!cameraTween) return
    const progress = THREE.MathUtils.clamp((now - cameraTween.started) / cameraTween.duration, 0, 1)
    const eased = easeInOutCubic(progress)
    camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased)
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased)
    sceneMix = THREE.MathUtils.lerp(cameraTween.fromMix, cameraTween.toMix, eased)
    if (progress >= 1) {
      cameraTween = null
      controls.enabled = entered
    }
  }

  function projectElement(
    element: HTMLElement,
    position: THREE.Vector3,
    radius: number,
    hideOutside = true,
  ) {
    const bounds = root.getBoundingClientRect()
    projected.copy(position).project(camera)
    const x = (projected.x * 0.5 + 0.5) * bounds.width
    const y = (-projected.y * 0.5 + 0.5) * bounds.height
    const cameraDistance = Math.max(0.1, camera.position.distanceTo(position))
    const pixelsPerUnit = bounds.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
    const screenRadius = Math.max(8, (radius / cameraDistance) * pixelsPerUnit)
    const visible =
      entered &&
      projected.z > -1 &&
      projected.z < 1 &&
      (!hideOutside || (x > -80 && x < bounds.width + 80 && y > -80 && y < bounds.height + 80))
    element.style.setProperty("--webgl-x", `${x}px`)
    element.style.setProperty("--webgl-y", `${y}px`)
    element.style.setProperty("--webgl-radius", `${screenRadius}px`)
    element.dataset.webglVisible = String(visible)
  }

  function updateLabels() {
    scene.updateMatrixWorld()
    for (const body of bodies) {
      if (!body.button) continue
      body.mesh.getWorldPosition(worldPosition)
      body.mesh.getWorldScale(worldScale)
      projectElement(body.button, worldPosition, body.radius * worldScale.x)
      if (selectedId && body.sector.id !== selectedId) body.button.dataset.webglVisible = "false"
      body.button.dataset.webglDepth = projected.z > 0.45 ? "far" : "near"
    }
    for (const body of bodies) {
      for (const moon of body.moons) {
        moon.mesh.getWorldPosition(worldPosition)
        projectElement(moon.label, worldPosition, 0.2, false)
      }
    }
  }

  function focusSector(sectorId: string | null) {
    if (selectedId && selectedId !== sectorId) removeMoons(bodyById.get(selectedId))
    selectedId = sectorId
    if (!sectorId) {
      for (const body of bodies) removeMoons(body)
      startCameraTween(homePosition(), targetOrigin, 1, 920)
      return
    }

    const body = bodyById.get(sectorId)
    if (!body) return
    createMoons(body)
    body.anchor.getWorldPosition(worldPosition)
    const target = worldPosition.clone()
    const distance = body.sector.isSun ? 10.5 : 6.8 + body.radius * 2.2
    const position = target.clone().add(new THREE.Vector3(0, distance * 0.38, distance))
    startCameraTween(position, target, 1, 880)
  }

  function setScene(nextEntered: boolean) {
    entered = nextEntered
    if (!entered) {
      selectedId = null
      for (const body of bodies) removeMoons(body)
      startCameraTween(introPosition, targetOrigin, 0, 1500)
    } else {
      startCameraTween(homePosition(), targetOrigin, 1, 1650)
    }
  }

  function pick(clientX: number, clientY: number, activate: boolean) {
    if (!entered || cameraTween) return false
    const bounds = canvas.getBoundingClientRect()
    pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1
    pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster
      .intersectObjects(interactiveMeshes, false)
      .find(
        ({ object }) =>
          !selectedId || object.userData.childId || object.userData.sectorId === selectedId,
      )?.object
    canvas.style.cursor = hit ? "pointer" : "grab"
    if (!activate || !hit) return Boolean(hit)

    const childId = hit.userData.childId as string | undefined
    if (childId) {
      root.querySelector<HTMLAnchorElement>(`[data-runtime-moon="${CSS.escape(childId)}"]`)?.click()
      return true
    }
    const sectorId = hit.userData.sectorId as string | undefined
    bodyById.get(sectorId ?? "")?.button?.click()
    return Boolean(sectorId)
  }

  function handlePointerDown(event: PointerEvent) {
    pointerDown.set(event.clientX, event.clientY)
    canvas.style.cursor = "grabbing"
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.buttons === 0) pick(event.clientX, event.clientY, false)
  }

  function handlePointerUp(event: PointerEvent) {
    const moved = pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY))
    if (moved < 7) pick(event.clientX, event.clientY, true)
    else canvas.style.cursor = "grab"
  }

  function handleContextLost() {
    root.classList.remove("is-webgl-ready")
    root.dataset.webgl = "failed"
    cancelAnimationFrame(frame)
    root.dispatchEvent(new CustomEvent("galaxy:webgl-failed"))
  }

  function animate(now: number) {
    if (disposed) return
    const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000))
    lastFrame = now
    if (!document.hidden) {
      updateCameraTween(now)
      updateBodies(delta)
      updateSceneMix(now)
      controls.update()
      composer.render()
      updateLabels()
    }
    frame = requestAnimationFrame(animate)
  }

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    canvas.removeEventListener("pointerdown", handlePointerDown)
    canvas.removeEventListener("pointermove", handlePointerMove)
    canvas.removeEventListener("pointerup", handlePointerUp)
    canvas.removeEventListener("webglcontextlost", handleContextLost)
    for (const body of bodies) removeMoons(body)
    controls.dispose()
    composer.dispose()
    disposeObject(scene)
    renderer.dispose()
    renderer.forceContextLoss()
    root.classList.remove("is-webgl-ready")
    delete root.dataset.webgl
  }

  resizeObserver.observe(root)
  canvas.addEventListener("pointerdown", handlePointerDown)
  canvas.addEventListener("pointermove", handlePointerMove)
  canvas.addEventListener("pointerup", handlePointerUp)
  canvas.addEventListener("webglcontextlost", handleContextLost)
  resize()
  camera.position.copy(entered ? homePosition() : introPosition)
  controls.target.copy(targetOrigin)
  controls.enabled = entered
  updateBodies(0)
  updateSceneMix()
  composer.render()
  updateLabels()
  root.dataset.webgl = "ready"
  root.classList.add("is-webgl-ready")
  frame = requestAnimationFrame(animate)

  return { setScene, focusSector, dispose }
}
