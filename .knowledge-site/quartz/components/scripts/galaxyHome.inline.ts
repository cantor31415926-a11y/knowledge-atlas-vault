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
  const graphOverlay = document.querySelector<HTMLElement>(".global-graph-outer")
  const graphOriginParent = graphOverlay?.parentElement ?? null
  const graphOriginNext = graphOverlay?.nextSibling ?? null
  const panelCloseActions = root.querySelectorAll<HTMLButtonElement>("[data-galaxy-drawer-close]")
  const planets = root.querySelectorAll<HTMLAnchorElement>(".celestial[data-active='true']")
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const touchLayout = window.matchMedia("(hover: none), (pointer: coarse)")
  let starFrame = 0
  let orbitFrame = 0
  let clockTimer = 0
  let lastFocused: HTMLElement | null = null
  let orbitStarted = performance.now()
  let orbitPausedAt = 0
  let graphObserver: MutationObserver | null = null
  let particles: Array<{ x: number; y: number; radius: number; alpha: number; speed: number }> = []

  const setDirectory = (open: boolean) => {
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

    for (const planet of orbitalBodies) {
      const orbit = Number(planet.dataset.orbit)
      const phase = Number(planet.dataset.phase) * (Math.PI / 180)
      const duration = Math.max(1, Number(planet.dataset.duration)) * 1000
      const elapsed = reduceMotion ? 0 : timestamp - orbitStarted
      const angle = phase + (elapsed / duration) * Math.PI * 2
      const orbitWidth = bounds.width * (0.13 + orbit * 0.09)
      const radiusX = orbitWidth / 2
      const radiusY = orbitWidth / 4.6
      const x = bounds.width * 0.5 + Math.cos(angle) * radiusX
      const y = bounds.height * 0.51 + Math.sin(angle) * radiusY

      planet.style.setProperty("--orbit-x", `${x}px`)
      planet.style.setProperty("--orbit-y", `${y}px`)
      planet.dataset.side = x < bounds.width * 0.5 ? "left" : "right"
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
      orbitPausedAt = performance.now()
      return
    }
    if (!document.hidden && !reduceMotion) {
      if (orbitPausedAt) orbitStarted += performance.now() - orbitPausedAt
      orbitPausedAt = 0
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
  const handleGraph = () => {
    document.documentElement.classList.add("galaxy-graph-active")
    root.classList.add("is-graph-open")
    if (graphOverlay && graphOverlay.parentElement !== document.body) {
      document.body.append(graphOverlay)
    }
    const graphContainer = graphOverlay?.querySelector<HTMLElement>(".global-graph-container")
    graphContainer?.setAttribute("data-note-count", root.dataset.noteCount ?? "")
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>(".global-graph-icon")?.click()
      window.setTimeout(syncGraphState, 0)
    }, 0)
  }
  const handleCloseDirectory = () => setDirectory(false)
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && root.classList.contains("is-directory-open")) {
      event.preventDefault()
      setDirectory(false)
    }
  }
  const handlePlanetTap = (event: MouseEvent) => {
    if (!touchLayout.matches) return
    const planet = event.currentTarget as HTMLAnchorElement
    if (planet.classList.contains("is-peeked")) return
    event.preventDefault()
    for (const item of planets) item.classList.remove("is-peeked")
    planet.classList.add("is-peeked")
    planet.focus({ preventScroll: true })
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
  for (const planet of planets) planet.addEventListener("click", handlePlanetTap)
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
    graphObserver?.disconnect()
    enter?.removeEventListener("click", handleEnter)
    back?.removeEventListener("click", handleBack)
    searchAction?.removeEventListener("click", handleSearch)
    directoryAction?.removeEventListener("click", handleDirectory)
    graphAction?.removeEventListener("click", handleGraph)
    for (const action of panelCloseActions)
      action.removeEventListener("click", handleCloseDirectory)
    for (const planet of planets) planet.removeEventListener("click", handlePlanetTap)
    document.removeEventListener("keydown", handleKeydown)
    window.removeEventListener("resize", handleResize)
    document.removeEventListener("visibilitychange", handleVisibility)
  })
}

document.addEventListener("nav", setupGalaxyHome)
document.addEventListener("render", setupGalaxyHome)
