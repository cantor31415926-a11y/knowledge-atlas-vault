import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import GalaxyHome from "./quartz/components/GalaxyHome"
import { componentRegistry } from "./quartz/components/registry"
import { PageTypes } from "./quartz/plugins"

componentRegistry.register("GalaxyHome", GalaxyHome, "local")
const galaxyHome = componentRegistry.instantiate(GalaxyHome)
const config = await loadQuartzConfig({
  pageTitle: "旺哥的第二大脑",
  baseUrl: "cantor31415926-a11y.github.io/knowledge-atlas-vault",
})
const loadedLayout = await loadQuartzLayout()
loadedLayout.byPageType.content.afterBody = [
  ...(loadedLayout.byPageType.content.afterBody ?? []),
  galaxyHome,
]
config.plugins.emitters = config.plugins.emitters.map((emitter) =>
  emitter.name === "PageTypeDispatcher"
    ? PageTypes.PageTypeDispatcher({
        defaults: loadedLayout.defaults,
        byPageType: loadedLayout.byPageType,
      })
    : emitter,
)

export default config
export const layout = loadedLayout
