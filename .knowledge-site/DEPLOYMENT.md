# 旺哥的第二大脑：部署说明

## 当前站点

- 唯一公开站：`https://cantor31415926-a11y.github.io/knowledge-atlas-vault/`
- GitHub 仓库：`cantor31415926-a11y/knowledge-atlas-vault`（Public）
- `main` 分支每次推送后由 GitHub Actions 自动构建并发布到 GitHub Pages。
- 当前模式为完整 Vault 公开，不再构建私人站或执行 `publish: true` 筛选。

## GitHub Pages 设置

- 仓库 `Settings → Pages → Build and deployment → Source` 选择 `GitHub Actions`。
- 工作流文件为 `.github/workflows/knowledge-atlas.yml`。
- 构建目录为 `.knowledge-site`，发布产物为 `.knowledge-site/public`。
- `SITE_MODE=public`，Node.js 版本为 24。
- 不需要 Cloudflare 账号、付款信息或安全认证。

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
