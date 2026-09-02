const SESSION_KEY = "knowledge-atlas:galaxy-entered:v1"

function setupGalaxyHome() {
  const root = document.querySelector<HTMLElement>(".galaxy-home")
  if (!root || root.dataset.ready === "true") return
  root.dataset.ready = "true"
  document.documentElement.classList.add("galaxy-home-active")

  const intro = root.querySelector<HTMLElement>("[data-galaxy-scene='intro']")
  const solar = root.querySelector<HTMLElement>("[data-galaxy-scene='solar']")
  const enter = root.querySelector<HTMLButtonElement>("[data-galaxy-enter]")
  const back = root.querySelector<HTMLButtonElement>("[data-galaxy-back]")
  const clock = root.querySelector<HTMLElement>("[data-galaxy-clock] strong")
  const canvas = root.querySelector<HTMLCanvasElement>(".galaxy-stars")
  const searchAction = root.querySelector<HTMLButtonElement>("[data-galaxy-search]")
  const directoryAction = root.querySelector<HTMLButtonElement>("[data-galaxy-directory]")
  const graphAction = root.querySelector<HTMLButtonElement>("[data-galaxy-graph]")
  const panel = root.querySelector<HTMLElement>("[data-galaxy-panel]")
  const orbitSystem = root.querySelector<HTMLElement>(".solar-orbits")
  const orbitalBodies = root.querySelectorAll<HTMLElement>(".planet[data-orbit]")
  const orbitalTracks = root.querySelectorAll<HTMLElement>(".solar-orbit[data-orbit]")
  const orbitalTrackByOrbit = new Map(
    [...orbitalTracks].map((track) => [Number(track.dataset.orbit), track]),
  )
  const graphOverlay = document.querySelector<HTMLElement>(".global-graph-outer")
  const graphOriginParent = graphOverlay?.parentElement ?? null
  const graphOriginNext = graphOverlay?.nextSibling ?? null
  const panelCloseActions = root.querySelectorAll<HTMLButtonElement>("[data-galaxy-drawer-close]")
  const sectorButtons = root.querySelectorAll<HTMLButtonElement>("[data-sector-button]")
  const sectorPanels = root.querySelectorAll<HTMLElement>("[data-sector-panel]")
  const sectorCloseActions = root.querySelectorAll<HTMLButtonElement>("[data-sector-close]")
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  let starFrame = 0
  let orbitFrame = 0
  let clockTimer = 0
  let lastFocused: HTMLElement | null = null
  let orbitStarted = performance.now()
  let visibilityPausedAt = 0
  let frozenOrbitElapsed: number | null = null
  let orbitFocusFrom = 0
  let orbitFocusTo = 0
  let orbitFocusStarted = performance.now()
  let graphObserver: MutationObserver | null = null
  let graphMotionTimer = 0
  let sectorActivationTimer = 0
  let lastSectorButton: HTMLButtonElement | null = null
  let graphMotionCleanup: (() => void) | null = null
  let graphFitTimers: number[] = []
  let particles: Array<{ x: number; y: number; radius: number; alpha: number; speed: number }> = []

  const normalizeAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle))
  const orbitFocusOffset = (timestamp: number) => {
    if (reduceMotion) return orbitFocusTo
    const progress = Math.min(1, Math.max(0, (timestamp - orbitFocusStarted) / 900))
    const eased = 1 - Math.pow(1 - progress, 3)
    return orbitFocusFrom + (orbitFocusTo - orbitFocusFrom) * eased
  }

  const setOrbitFocus = (sectorId: string | null) => {
    const now = performance.now()
    const currentOffset = orbitFocusOffset(now)
    orbitFocusFrom = currentOffset
    orbitFocusStarted = now

    if (!sectorId) {
      orbitFocusTo = 0
      if (frozenOrbitElapsed !== null) {
        orbitStarted = now - frozenOrbitElapsed
        frozenOrbitElapsed = null
      }
      positionPlanets(now)
      return
    }

    if (frozenOrbitElapsed === null) frozenOrbitElapsed = now - orbitStarted
    const selected = [...sectorButtons].find((button) => button.dataset.sectorId === sectorId)
    const orbit = Number(selected?.dataset.orbit ?? 0)
    const phase = Number(selected?.dataset.phase ?? 0) * (Math.PI / 180)
    const duration = Math.max(1, Number(selected?.dataset.duration ?? 1)) * 1000
    const baseAngle = orbit > 0 ? phase + (frozenOrbitElapsed / duration) * Math.PI * 2 : 0
    const focusAngle = -Math.PI / 2
    orbitFocusTo =
      orbit > 0 ? currentOffset + normalizeAngle(focusAngle - (baseAngle + currentOffset)) : 0
    positionPlanets(now)
  }

  const setSector = (sectorId: string | null, focusButton = false) => {
    if ((root.dataset.selectedSector ?? null) !== sectorId) setOrbitFocus(sectorId)
    root.classList.toggle("is-sector-open", Boolean(sectorId))
    if (sectorId) root.dataset.selectedSector = sectorId
    else delete root.dataset.selectedSector

    for (const button of sectorButtons) {
      const selected = button.dataset.sectorId === sectorId
      button.classList.toggle("is-selected", selected)
      button.setAttribute("aria-expanded", String(selected))
      if (selected && focusButton) button.focus({ preventScroll: true })
    }

    for (const sectorPanel of sectorPanels) {
      const selected = sectorPanel.dataset.sectorPanel === sectorId
      sectorPanel.classList.toggle("is-active", selected)
      sectorPanel.setAttribute("aria-hidden", String(!selected))
      sectorPanel.inert = !selected
    }
  }

  const setDirectory = (open: boolean) => {
    if (open) setSector(null)
    root.classList.toggle("is-directory-open", open)
    panel?.setAttribute("aria-hidden", String(!open))
    if (panel) panel.inert = !open
    directoryAction?.setAttribute("aria-expanded", String(open))
    if (open) {
      lastFocused = document.activeElement as HTMLElement
      panel?.querySelector<HTMLButtonElement>("[data-galaxy-drawer-close]")?.focus()
    } else if (lastFocused) {
      lastFocused.focus()
      lastFocused = null
    }
  }

  const setScene = (entered: boolean) => {
    setSector(null)
    root.classList.toggle("is-entered", entered)
    intro?.setAttribute("aria-hidden", String(entered))
    solar?.setAttribute("aria-hidden", String(!entered))
    if (intro) intro.inert = entered
    if (solar) solar.inert = !entered
    setDirectory(false)
    if (entered) {
      sessionStorage.setItem(SESSION_KEY, "1")
    } else {
      sessionStorage.removeItem(SESSION_KEY)
    }
  }

  const formatBeijingTime = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date)
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "--"
    return `${value("year")}.${value("month")}.${value("day")} / ${value("hour")}:${value("minute")}:${value("second")}`
  }

  const updateClock = () => {
    if (clock) clock.textContent = formatBeijingTime(new Date())
  }

  const resizeCanvas = () => {
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const count = window.innerWidth < 700 ? 90 : 260
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: (0.35 + Math.random() * 1.1) * dpr,
      alpha: 0.04 + Math.random() * 0.14,
      speed: (0.025 + Math.random() * 0.07) * dpr,
    }))
  }

  const drawStars = () => {
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    for (const star of particles) {
      context.beginPath()
      context.fillStyle = `rgba(192, 210, 232, ${star.alpha})`
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
      context.fill()
      if (!reduceMotion) {
        star.y -= star.speed
        if (star.y < -2) {
          star.y = canvas.height + 2
          star.x = Math.random() * canvas.width
        }
      }
    }
    if (!reduceMotion && !document.hidden) starFrame = requestAnimationFrame(drawStars)
  }

  const positionPlanets = (timestamp = performance.now()) => {
    if (!orbitSystem) return
    const bounds = orbitSystem.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) return

    const compact = bounds.width < 700
    const orbitCount = Math.max(1, orbitalBodies.length)
    const tilt = (-7 * Math.PI) / 180
    const cosTilt = Math.cos(tilt)
    const sinTilt = Math.sin(tilt)

    for (const planet of orbitalBodies) {
      const orbit = Number(planet.dataset.orbit)
      const phase = Number(planet.dataset.phase) * (Math.PI / 180)
      const duration = Math.max(1, Number(planet.dataset.duration)) * 1000
      const elapsed = reduceMotion ? 0 : (frozenOrbitElapsed ?? timestamp - orbitStarted)
      const angle = phase + (elapsed / duration) * Math.PI * 2 + orbitFocusOffset(timestamp)
      const orbitProgress = orbitCount === 1 ? 0 : (orbit - 1) / (orbitCount - 1)
      const minRadiusX = bounds.width * (compact ? 0.25 : 0.2)
      const maxRadiusX = bounds.width * (compact ? 0.43 : 0.46)
      const minRadiusY = bounds.height * (compact ? 0.22 : 0.26)
      const maxRadiusY = bounds.height * (compact ? 0.43 : 0.46)
      const radiusX = minRadiusX + (maxRadiusX - minRadiusX) * orbitProgress
      const radiusY = minRadiusY + (maxRadiusY - minRadiusY) * orbitProgress
      const ellipseX = Math.cos(angle) * radiusX
      const ellipseY = Math.sin(angle) * radiusY
      const x = bounds.width * 0.5 + ellipseX * cosTilt - ellipseY * sinTilt
      const y = bounds.height * 0.51 + ellipseX * sinTilt + ellipseY * cosTilt

      planet.style.setProperty("--orbit-x", `${x}px`)
      planet.style.setProperty("--orbit-y", `${y}px`)
      planet.dataset.side = x < bounds.width * 0.5 ? "left" : "right"

      const track = orbitalTrackByOrbit.get(orbit)
      track?.style.setProperty("--orbit-width", `${radiusX * 2}px`)
      track?.style.setProperty("--orbit-height", `${radiusY * 2}px`)
    }
  }

  const animatePlanets = (timestamp: number) => {
    positionPlanets(timestamp)
    if (!reduceMotion && !document.hidden) orbitFrame = requestAnimationFrame(animatePlanets)
  }

  const syncGraphState = () => {
    const active = graphOverlay?.classList.contains("active") ?? false
    if (active && graphOverlay && graphOverlay.parentElement !== document.body) {
      document.body.append(graphOverlay)
    } else if (
      !active &&
      graphOverlay &&
      graphOriginParent &&
      graphOverlay.parentElement === document.body
    ) {
      graphOriginParent.insertBefore(
        graphOverlay,
        graphOriginNext?.parentNode === graphOriginParent ? graphOriginNext : null,
      )
    }
    document.documentElement.classList.toggle("galaxy-graph-active", active)
    root.classList.toggle("is-graph-open", active)
  }

  const handleVisibility = () => {
    cancelAnimationFrame(starFrame)
    cancelAnimationFrame(orbitFrame)
    if (document.hidden) {
      visibilityPausedAt = performance.now()
      return
    }
    if (!document.hidden && !reduceMotion) {
      if (visibilityPausedAt && frozenOrbitElapsed === null)
        orbitStarted += performance.now() - visibilityPausedAt
      visibilityPausedAt = 0
      starFrame = requestAnimationFrame(drawStars)
      orbitFrame = requestAnimationFrame(animatePlanets)
    }
  }
  const handleResize = () => {
    cancelAnimationFrame(starFrame)
    resizeCanvas()
    drawStars()
    positionPlanets()
  }
  const handleEnter = () => {
    setScene(true)
    back?.focus({ preventScroll: true })
    root.scrollTop = 0
  }
  const handleBack = () => {
    setScene(false)
    enter?.focus({ preventScroll: true })
    root.scrollTop = 0
  }
  const handleSearch = () => document.querySelector<HTMLButtonElement>(".search-button")?.click()
  const handleDirectory = () => setDirectory(!root.classList.contains("is-directory-open"))
  const clearGraphFitTimers = () => {
    for (const timer of graphFitTimers) window.clearTimeout(timer)
    graphFitTimers = []
  }
  const markGraphMotion = (graphContainer: HTMLElement) => {
    window.clearTimeout(graphMotionTimer)
    graphContainer.classList.add("is-interacting")
    graphMotionTimer = window.setTimeout(() => {
      graphContainer.classList.remove("is-interacting")
    }, 650)
  }
  const fitGlobalGraph = (attempt = 0) => {
    const graphContainer = graphOverlay?.querySelector<HTMLElement>(".global-graph-container")
    const graphCanvas = graphContainer?.querySelector<HTMLCanvasElement>("canvas")
    if (!graphContainer || !graphCanvas) {
      if (attempt < 30) {
        graphFitTimers.push(window.setTimeout(() => fitGlobalGraph(attempt + 1), 50))
      }
      return
    }
    if (graphCanvas.dataset.atlasFit === "true") return
    graphCanvas.dataset.atlasFit = "true"

    graphMotionCleanup?.()
    const handleGraphMotion = () => markGraphMotion(graphContainer)
    graphContainer.addEventListener("wheel", handleGraphMotion, { passive: true, capture: true })
    graphContainer.addEventListener("pointerdown", handleGraphMotion, true)
    graphContainer.addEventListener("pointerup", handleGraphMotion, true)
    graphContainer.addEventListener("pointercancel", handleGraphMotion, true)
    graphMotionCleanup = () => {
      graphContainer.removeEventListener("wheel", handleGraphMotion, true)
      graphContainer.removeEventListener("pointerdown", handleGraphMotion, true)
      graphContainer.removeEventListener("pointerup", handleGraphMotion, true)
      graphContainer.removeEventListener("pointercancel", handleGraphMotion, true)
    }

    const steps = reduceMotion ? 1 : 4
    const deltaY = reduceMotion ? 400 : 100
    for (let step = 0; step < steps; step++) {
      graphFitTimers.push(
        window.setTimeout(() => {
          const bounds = graphCanvas.getBoundingClientRect()
          graphCanvas.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              clientX: bounds.left + bounds.width / 2,
              clientY: bounds.top + bounds.height / 2,
              deltaY,
              view: window,
            }),
          )
        }, step * 65),
      )
    }
  }
  const handleGraph = () => {
    clearGraphFitTimers()
    document.documentElement.classList.add("galaxy-graph-active")
    root.classList.add("is-graph-open")
    if (graphOverlay && graphOverlay.parentElement !== document.body) {
      document.body.append(graphOverlay)
    }
    const graphContainer = graphOverlay?.querySelector<HTMLElement>(".global-graph-container")
    graphContainer?.setAttribute("data-note-count", root.dataset.noteCount ?? "")
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>(".global-graph-icon")?.click()
      window.setTimeout(() => {
        syncGraphState()
        fitGlobalGraph()
      }, 0)
    }, 0)
  }
  const handleCloseDirectory = () => setDirectory(false)
  const closeSector = () => {
    setSector(null)
    lastSectorButton?.focus({ preventScroll: true })
  }
  const handleSectorClose = () => closeSector()
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && root.classList.contains("is-directory-open")) {
      event.preventDefault()
      setDirectory(false)
    } else if (event.key === "Escape" && root.classList.contains("is-sector-open")) {
      event.preventDefault()
      closeSector()
    }
  }
  const handleSectorSelect = (event: MouseEvent) => {
    const button = event.currentTarget as HTMLButtonElement
    const sectorId = button.dataset.sectorId
    if (!sectorId) return
    lastSectorButton = button

    const alreadySelected = button.classList.contains("is-selected")
    window.clearTimeout(sectorActivationTimer)
    for (const sectorButton of sectorButtons) sectorButton.classList.remove("is-activating")
    if (alreadySelected) {
      setSector(null)
      return
    }

    button.classList.add("is-activating")
    setSector(sectorId)
    sectorActivationTimer = window.setTimeout(() => button.classList.remove("is-activating"), 900)
  }

  setScene(sessionStorage.getItem(SESSION_KEY) === "1")
  updateClock()
  clockTimer = window.setInterval(updateClock, 1000)
  resizeCanvas()
  drawStars()
  positionPlanets()
  if (!reduceMotion && !document.hidden) orbitFrame = requestAnimationFrame(animatePlanets)

  if (graphOverlay) {
    graphObserver = new MutationObserver(syncGraphState)
    graphObserver.observe(graphOverlay, { attributes: true, attributeFilter: ["class"] })
    syncGraphState()
  }

  enter?.addEventListener("click", handleEnter)
  back?.addEventListener("click", handleBack)
  searchAction?.addEventListener("click", handleSearch)
  directoryAction?.addEventListener("click", handleDirectory)
  graphAction?.addEventListener("click", handleGraph)
  for (const action of panelCloseActions) action.addEventListener("click", handleCloseDirectory)
  for (const button of sectorButtons) button.addEventListener("click", handleSectorSelect)
  for (const action of sectorCloseActions) action.addEventListener("click", handleSectorClose)
  document.addEventListener("keydown", handleKeydown)
  window.addEventListener("resize", handleResize)
  document.addEventListener("visibilitychange", handleVisibility)

  window.addCleanup(() => {
    document.documentElement.classList.remove("galaxy-home-active")
    document.documentElement.classList.remove("galaxy-graph-active")
    if (graphOverlay && graphOriginParent && graphOverlay.parentElement === document.body) {
      graphOriginParent.insertBefore(
        graphOverlay,
        graphOriginNext?.parentNode === graphOriginParent ? graphOriginNext : null,
      )
    }
    cancelAnimationFrame(starFrame)
    cancelAnimationFrame(orbitFrame)
    clearInterval(clockTimer)
    clearGraphFitTimers()
    window.clearTimeout(graphMotionTimer)
    window.clearTimeout(sectorActivationTimer)
    graphMotionCleanup?.()
    graphObserver?.disconnect()
    enter?.removeEventListener("click", handleEnter)
    back?.removeEventListener("click", handleBack)
    searchAction?.removeEventListener("click", handleSearch)
    directoryAction?.removeEventListener("click", handleDirectory)
    graphAction?.removeEventListener("click", handleGraph)
    for (const action of panelCloseActions)
      action.removeEventListener("click", handleCloseDirectory)
    for (const button of sectorButtons) button.removeEventListener("click", handleSectorSelect)
    for (const action of sectorCloseActions) action.removeEventListener("click", handleSectorClose)
    document.removeEventListener("keydown", handleKeydown)
    window.removeEventListener("resize", handleResize)
    document.removeEventListener("visibilitychange", handleVisibility)
  })
}

document.addEventListener("nav", setupGalaxyHome)
document.addEventListener("render", setupGalaxyHome)
