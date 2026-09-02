import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { buildGalaxySectors, galaxyFolderHref, GalaxySector } from "./galaxyData"
import { formatBeijingTime } from "./galaxyTime"
import styles from "./styles/galaxyHome.scss"
// @ts-ignore: Quartz's esbuild pipeline loads *.inline.ts files as source strings.
import script from "./scripts/galaxyHome.inline"

function CelestialBody({ sector }: { sector: GalaxySector }) {
  const label = `${sector.celestialName}，${sector.folder}，${sector.count} 篇笔记，点击展开二级目录`
  const style = {
    "--size": sector.size,
    "--x": sector.isSun ? 50 : undefined,
    "--y": sector.isSun ? 51 : undefined,
    "--spin-duration": `${Math.max(9, Math.round(sector.duration / 4) || 18)}s`,
  }

  return (
    <button
      class={`celestial ${sector.isSun ? "sun" : "planet"} ${sector.visualKey}`}
      type="button"
      style={style}
      data-active="true"
      data-sector-button
      data-sector-id={sector.id}
      data-sector-href={galaxyFolderHref(sector.folder)}
      data-orbit={sector.orbit || undefined}
      data-phase={sector.phase || undefined}
      data-duration={sector.duration || undefined}
      data-order={sector.order}
      aria-label={label}
      aria-expanded="false"
      aria-controls={`sector-panel-${sector.id}`}
    >
      <span class="celestial-visual">
        <i />
        <span class="planet-energy-band" aria-hidden="true" />
        {sector.isSun && <span class="fresnel-atmosphere" aria-hidden="true" />}
        {sector.isSun && (
          <span class="solar-energy-particles" aria-hidden="true">
            {Array.from({ length: 24 }, (_, index) => (
              <b style={{ "--particle-index": index }} />
            ))}
          </span>
        )}
      </span>
      <span class="celestial-label" aria-hidden="true">
        <small>{sector.order}</small>
        <strong>{sector.folder}</strong>
        <em>{sector.count} NOTES</em>
      </span>
      <span class="celestial-card">
        <small>
          {sector.celestialName} · {sector.visualKey.toUpperCase()}
        </small>
        <strong>{sector.folder}</strong>
        <em>
          {sector.count} 篇笔记 · {sector.children.length} 个二级目录
        </em>
      </span>
    </button>
  )
}

function SectorPanel({ sector }: { sector: GalaxySector }) {
  return (
    <section
      class={`sector-detail sector-${sector.visualKey}`}
      id={`sector-panel-${sector.id}`}
      data-sector-panel={sector.id}
      style={{ "--child-count": sector.children.length }}
      aria-hidden="true"
      aria-label={`${sector.folder}二级目录`}
    >
      <header>
        <div>
          <small>
            OBSIDIAN / {sector.order} / {sector.folder}
          </small>
          <h2>{sector.folder}</h2>
          <p>
            {sector.count} 篇笔记 · {sector.children.length} 个非空二级文件夹
          </p>
        </div>
        <button type="button" data-sector-close aria-label="关闭二级目录">
          ×
        </button>
      </header>

      {sector.children.length > 0 ? (
        <ol class="sector-child-orbit">
          {sector.children.map((child, index) => (
            <li key={child.id} style={{ "--child-index": index }}>
              <a href={galaxyFolderHref(child.folder)}>
                <i aria-hidden="true" />
                <span>
                  <strong>{child.name}</strong>
                  <small>{child.count} 篇笔记</small>
                </span>
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p class="sector-empty">这个星域暂时没有非空二级文件夹，可直接进入主文件夹。</p>
      )}

      <a class="sector-root-link" href={galaxyFolderHref(sector.folder)}>
        <span>进入 {sector.folder}</span>
        <i aria-hidden="true">→</i>
      </a>
    </section>
  )
}

export default (() => {
  const GalaxyHome: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    if (fileData.slug !== "index") return null

    const { sectors, sun, planets } = buildGalaxySectors(allFiles)
    const notes = sectors.reduce((total, sector) => total + sector.count, 0)

    return (
      <section class="galaxy-home" aria-label="旺哥的第二大脑银河导航" data-note-count={notes}>
        <canvas class="galaxy-stars" aria-hidden="true" />
        <div class="galaxy-nebula galaxy-nebula-a" aria-hidden="true" />
        <div class="galaxy-nebula galaxy-nebula-b" aria-hidden="true" />

        <div class="galaxy-intro" data-galaxy-scene="intro">
          <div class="galaxy-cluster" aria-hidden="true">
            <span class="galaxy-arm galaxy-arm-a" />
            <span class="galaxy-arm galaxy-arm-b" />
            <span class="galaxy-arm galaxy-arm-c" />
            <span class="galaxy-cluster-core" />
          </div>
          <div class="galaxy-intro-copy">
            <p class="galaxy-kicker">OBSIDIAN KNOWLEDGE GALAXY</p>
            <h1>旺哥的第二大脑</h1>
            <p class="galaxy-intro-text">让真实目录化作行星，让知识在轨道上持续生长。</p>
            <div class="galaxy-stats" aria-label="知识库统计">
              <span>
                <strong>{notes}</strong> 篇笔记
              </span>
              <span>
                <strong>{sectors.length}</strong> 个非空知识星域
              </span>
            </div>
            <button class="galaxy-enter" type="button" data-galaxy-enter>
              <span>进入第二大脑</span>
              <i aria-hidden="true">→</i>
            </button>
          </div>
          <p class="galaxy-scroll-hint">CLICK TO ENTER · 点击进入</p>
        </div>

        <div class="solar-scene" data-galaxy-scene="solar" aria-hidden="true">
          <header class="galaxy-hud galaxy-hud-left">
            <p class="galaxy-hud-eyebrow">KNOWLEDGE ATLAS</p>
            <strong>旺哥的第二大脑</strong>
            <button type="button" data-galaxy-back>
              ← 返回银河
            </button>
          </header>

          <time class="galaxy-clock" data-galaxy-clock aria-label="北京时间">
            <span>BEIJING TIME</span>
            <strong>{formatBeijingTime(new Date())}</strong>
          </time>

          <div class="galaxy-dashboard-title" aria-hidden="true">
            <small>WANG'S SECOND BRAIN</small>
            <strong>KNOWLEDGE GALAXY</strong>
            <span>
              {notes} NOTES · {sectors.length} ACTIVE SECTORS
            </span>
          </div>

          <aside class="galaxy-telemetry" aria-label="知识库实时统计">
            <small>VAULT TELEMETRY</small>
            <dl>
              <div>
                <dt>知识节点</dt>
                <dd>{notes}</dd>
              </div>
              <div>
                <dt>活跃星域</dt>
                <dd>{sectors.length}</dd>
              </div>
              <div>
                <dt>二级目录</dt>
                <dd>{sectors.reduce((total, sector) => total + sector.children.length, 0)}</dd>
              </div>
            </dl>
          </aside>

          <div
            class="solar-orbits"
            aria-label="真实知识目录太阳系"
            data-sector-count={sectors.length}
          >
            <div class="solar-galaxy-disc" aria-hidden="true">
              <span class="solar-galaxy-arm arm-a" />
              <span class="solar-galaxy-arm arm-b" />
              <span class="solar-galaxy-arm arm-c" />
              <span class="solar-galaxy-dust" />
            </div>
            {planets.map((planet) => (
              <span
                key={`orbit-${planet.orbit}`}
                class={`solar-orbit orbit-${planet.orbit}`}
                style={{ "--orbit": planet.orbit }}
                aria-hidden="true"
              />
            ))}

            {sun && <CelestialBody sector={sun} />}
            {planets.map((planet) => (
              <CelestialBody key={planet.id} sector={planet} />
            ))}
          </div>

          <div class="sector-detail-stage" aria-live="polite">
            {sectors.map((sector) => (
              <SectorPanel key={sector.id} sector={sector} />
            ))}
          </div>

          <p class="solar-caption">
            <span /> 点击行星旋转聚焦，展开真实二级文件夹
          </p>

          <nav class="galaxy-dock" aria-label="知识库快捷功能">
            <button type="button" data-galaxy-search aria-label="打开全文搜索">
              <i aria-hidden="true">⌕</i>
              <span>搜索</span>
            </button>
            <button
              type="button"
              data-galaxy-directory
              aria-label="打开知识目录"
              aria-expanded="false"
              aria-controls="galaxy-directory-panel"
            >
              <i aria-hidden="true">☷</i>
              <span>知识目录</span>
            </button>
            <button type="button" data-galaxy-graph aria-label="打开全局知识图谱">
              <i aria-hidden="true">◎</i>
              <span>全局图谱</span>
            </button>
          </nav>

          <button
            class="galaxy-drawer-backdrop"
            type="button"
            data-galaxy-drawer-close
            aria-label="关闭知识目录"
            tabindex={-1}
          />
          <aside
            class="galaxy-directory-panel"
            id="galaxy-directory-panel"
            data-galaxy-panel
            aria-hidden="true"
            aria-label="知识目录"
          >
            <header>
              <div>
                <small>REAL VAULT SECTORS</small>
                <h2>知识目录</h2>
              </div>
              <button type="button" data-galaxy-drawer-close aria-label="关闭知识目录">
                ×
              </button>
            </header>
            <p>自动读取 Vault 中所有非空顶层文件夹</p>
            <ol>
              {sectors.map((sector) => (
                <li key={sector.id}>
                  <a href={galaxyFolderHref(sector.folder)}>
                    <span class="directory-order">{sector.order}</span>
                    <span class="directory-name">
                      <strong>{sector.folder}</strong>
                      <small>
                        {sector.celestialName} · {sector.count} 篇笔记
                      </small>
                    </span>
                    <i aria-hidden="true">→</i>
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>
    )
  }

  GalaxyHome.css = styles
  GalaxyHome.afterDOMLoaded = script
  return GalaxyHome
}) satisfies QuartzComponentConstructor
