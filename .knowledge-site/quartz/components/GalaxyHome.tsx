import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FilePath, slugifyFilePath } from "../util/path"
import { GALAXY_BODIES, GALAXY_CATEGORIES } from "./galaxyData"
import { formatBeijingTime } from "./galaxyTime"
import styles from "./styles/galaxyHome.scss"
// @ts-ignore: Quartz's esbuild pipeline loads *.inline.ts files as source strings.
import script from "./scripts/galaxyHome.inline"

function noteCount(allFiles: QuartzComponentProps["allFiles"], folder?: string) {
  if (!folder) return 0
  const prefix = `${slugifyFilePath(folder as FilePath)}/`
  return allFiles.filter(
    (file) =>
      String(file.filePath ?? "").endsWith(".md") && String(file.slug ?? "").startsWith(prefix),
  ).length
}

function categoryHref(folder: string) {
  return `./${slugifyFilePath(folder as FilePath)}/`
}

export default (() => {
  const GalaxyHome: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    if (fileData.slug !== "index") return null

    const notes = allFiles.filter(
      (file) => file.slug !== "index" && String(file.filePath ?? "").endsWith(".md"),
    ).length
    const abilityCount = noteCount(allFiles, "🌳 能力树搭建")

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
            <p class="galaxy-intro-text">让笔记像星辰一样连接，让知识在时间中持续生长。</p>
            <div class="galaxy-stats" aria-label="知识库统计">
              <span>
                <strong>{notes}</strong> 篇笔记
              </span>
              <span>
                <strong>6</strong> 个知识星域
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

          <div class="solar-orbits" aria-label="知识太阳系">
            {Array.from({ length: 8 }, (_, index) => (
              <span class={`solar-orbit orbit-${index + 1}`} aria-hidden="true" />
            ))}

            <a
              class="celestial sun"
              href={categoryHref("🌳 能力树搭建")}
              style={{ "--x": 50, "--y": 51, "--size": 112 }}
              data-active="true"
              aria-label={`太阳，03. 能力树，${abilityCount} 篇笔记，进入分类`}
            >
              <span class="celestial-visual">
                <i />
                <span class="solar-energy-particles" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, index) => (
                    <b style={{ "--particle-index": index }} />
                  ))}
                </span>
              </span>
              <span class="celestial-card">
                <small>太阳 · SOL</small>
                <strong>03. 能力树</strong>
                <em>{abilityCount} 篇笔记 · 进入分类</em>
              </span>
            </a>

            {GALAXY_BODIES.map((body) => {
              const count = noteCount(allFiles, body.folder)
              const label = `${body.celestialName}，${body.category}${body.folder ? `，${count} 篇笔记，进入分类` : "，暂未开放"}`
              const content = (
                <>
                  <span class="celestial-visual">
                    <i />
                  </span>
                  <span class="celestial-card">
                    <small>
                      {body.celestialName} · {body.key.toUpperCase()}
                    </small>
                    <strong>{body.category}</strong>
                    <em>{body.folder ? `${count} 篇笔记 · 进入分类` : "星域待拓展"}</em>
                  </span>
                </>
              )
              const style = {
                "--x": body.x,
                "--y": body.y,
                "--size": body.size,
                "--spin-duration": `${Math.max(8, Math.round(body.duration / 4))}s`,
              }

              return body.folder ? (
                <a
                  class={`celestial planet ${body.key}`}
                  href={categoryHref(body.folder)}
                  style={style}
                  data-active="true"
                  data-orbit={body.orbit}
                  data-phase={body.phase}
                  data-duration={body.duration}
                  aria-label={label}
                >
                  {content}
                </a>
              ) : (
                <button
                  class={`celestial planet ${body.key}`}
                  type="button"
                  style={style}
                  data-active="false"
                  data-orbit={body.orbit}
                  data-phase={body.phase}
                  data-duration={body.duration}
                  aria-label={label}
                  disabled
                >
                  {content}
                </button>
              )
            })}
          </div>

          <p class="solar-caption">
            <span /> 选择一颗星球，进入对应知识分类
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
                <small>KNOWLEDGE SECTORS</small>
                <h2>知识目录</h2>
              </div>
              <button type="button" data-galaxy-drawer-close aria-label="关闭知识目录">
                ×
              </button>
            </header>
            <p>六个持续生长的知识星域</p>
            <ol>
              {GALAXY_CATEGORIES.map((item) => (
                <li>
                  <a href={categoryHref(item.folder)}>
                    <span class="directory-order">{item.order}</span>
                    <span class="directory-name">
                      <strong>{item.category}</strong>
                      <small>
                        {item.celestialName} · {noteCount(allFiles, item.folder)} 篇笔记
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
