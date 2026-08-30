# 旺哥的第二大脑：部署说明

## 当前站点

- 唯一公开站：`https://wang-knowledge-atlas.pages.dev`
- GitHub 仓库：`cantor31415926-a11y/knowledge-atlas-vault`（Private）
- `main` 分支每次推送后由 Cloudflare Pages 自动构建。
- 当前模式为完整 Vault 公开，不再构建私人站或执行 `publish: true` 筛选。

## Cloudflare Pages 设置

| 设置           | 值                             |
| -------------- | ------------------------------ |
| Project name   | `wang-knowledge-atlas`         |
| Root directory | `.knowledge-site`              |
| Build command  | `npm ci && npm run build:site` |
| Build output   | `public`                       |
| `SITE_MODE`    | `public`                       |
| `NODE_VERSION` | `24`                           |

## 本地验证

```powershell
cd .knowledge-site
npm ci
npm run test
npm run verify:baseline
npm run build:site
```

构建会暂存全部正常 Markdown 笔记、复制引用的附件、生成搜索索引和图谱数据，并在完成后执行公开输出审计。

## Obsidian 自动同步

本机 Obsidian Git 按既有设置自动提交并推送。不要把访问令牌、密钥、`.obsidian` 配置或缓存写入 Git 历史；网站源码只位于隐藏目录 `.knowledge-site`。
