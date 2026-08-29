# 知识星图部署说明

## 构建约定

Cloudflare Pages 的两个项目都连接同一个私有 GitHub 仓库与 `main` 分支。

| 设置 | 公开站 | 私人站 |
| --- | --- | --- |
| 项目名 | `wang-knowledge-atlas` | `wang-knowledge-atlas-private` |
| Root directory | `.knowledge-site` | `.knowledge-site` |
| Build command | `npm ci && npm run build:site` | `npm ci && npm run build:site` |
| Build output | `public` | `public` |
| `SITE_MODE` | `public` | `private` |
| `NODE_VERSION` | `24` | `24` |

`SITE_MODE` 未设置时默认使用 `public`，以避免误把全库作为默认构建。

## 私人站 Cloudflare Access

1. 为 `wang-knowledge-atlas-private.pages.dev` 创建 Access self-hosted application。
2. 会话时长设置为 24 小时。
3. Allow policy 同时要求 Cloudflare 身份提供商登录与账户当前精确邮箱；不要添加其他用户或绕过规则。
4. 将根域名 `wang-knowledge-atlas-private.pages.dev` 和预览通配域名 `*.wang-knowledge-atlas-private.pages.dev` 都纳入应用。
5. 匿名检查首页、任一文章、`/static/contentIndex.json` 和图片，四者都必须先进入 Access 登录页。

私人构建还会移除 RSS/sitemap/社交卡，并输出 `noindex`、`no-store`、`no-referrer` 与 `robots.txt`。这些是纵深防御，不能替代 Access。

## 本地验证

```powershell
cd .knowledge-site
npm ci
npm run test:privacy
npm run verify:baseline

$env:SITE_MODE = "public"
npm run build:site

$env:SITE_MODE = "private"
npm run build:site
```

初始基线必须是 252 篇公开笔记与 332 篇私人全库笔记。日后知识库正常增长时，不需要修改固定计数；每次 Pages 构建仍会断言所有被选择的源文件都进入索引，并执行模式对应的隐私扫描。

## Obsidian 自动同步

本机已安装 Obsidian Git 2.38.6，自动 commit-and-sync 周期为 10 分钟。GitHub 远端建立后，`main` 必须跟踪 `origin/main`；不要把访问令牌写入 Vault 或 Git 历史。
