import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

const isPrivate = process.env.SITE_MODE === "private"
const config = await loadQuartzConfig({
  pageTitle: isPrivate ? "知识星图 · 私人全库" : "知识星图",
  baseUrl: isPrivate ? "wang-knowledge-atlas-private.pages.dev" : "wang-knowledge-atlas.pages.dev",
})
if (isPrivate) {
  config.plugins.emitters = config.plugins.emitters.filter(
    (emitter) => emitter.name !== "CustomOgImages",
  )
}
export default config
export const layout = await loadQuartzLayout()
