# Flash API

基于 [New API](https://github.com/QuantumNous/new-api) 的二次开发版本，保留上游全部功能，加入深空轨道主题、自定义顶部导航和图片生成入口。

![顶部导航](docs/preview-header.png)

## 与上游的差异

| 改动 | 位置 |
|---|---|
| 深空轨道主题（CSS 变量、星场 / 轨道动画） | `web/public/orbit.css`、`web/public/orbit.js`、`web/index.html` |
| 顶部导航改为 主页 / 控制台 / 图片生成 / 在线充值 / 模型广场 | `web/src/hooks/use-top-nav-links.ts` |
| 图片生成入口（跳转模型广场的 image-generation 筛选） | `web/src/routes/image-generation.tsx` |
| 根路由与 `/home` 路由调整 | `web/src/routes/index.tsx`、`web/src/routes/home.tsx` |
| 旧路径兼容映射（`/plaza`、`/register`、`/legal/*` 等） | `web/src/lib/legacy-route.ts` |
| 品牌与页脚署名 | `web/index.html`、`web/src/components/layout/components/footer.tsx` |

上游默认首页组件已删除，`/` 会进入控制台。自定义静态首页由 nginx 在 `/` 和 `/home` 单独提供，不在本仓库内。

## 部署

### Docker（推荐）

```bash
SRC=/path/to/this/repo
cd "$SRC"
docker build -t flash-api:local .
```

把 `docker-compose.yml` 里的 `image: calciumion/new-api:latest` 改成 `flash-api:local`，然后：

```bash
docker compose up -d
```

### 二进制

```bash
SRC=/path/to/this/repo
cd "$SRC/web" && bun install --frozen-lockfile && bun run build
cd "$SRC" && go build -o new-api .
```

### nginx 与静态首页

`deploy/nginx.conf.example` 是一份可参考的 nginx 配置：面板反代到 `127.0.0.1:3000`，`/` 和 `/home` 指向 `/opt/flash-home` 的静态首页。

静态首页是独立项目，源码不在本仓库。部署时把它的构建产物放到 `/opt/flash-home`，或修改 nginx 的 `root` 指向你的目录。

## 配置

- 站点名称、Logo、文档地址：后台「设置 → 站点」。
- 顶部导航：`web/src/hooks/use-top-nav-links.ts`。`图片生成` 的落点改 `imageGenerationHref` 一行即可。
- 主题：`web/index.html` 引入 `orbit.css` / `orbit.js`；删除这两行即可回到官方外观。
- 首页：本仓库只包含面板；静态首页请放在 nginx 的 `/opt/flash-home`（或任意静态目录），把 `/` 和 `/home` 指过去。
- `HeaderNavModules` 仍控制主页 / 控制台 / 模型广场三个标准入口；图片生成和在线充值固定在导航代码里。

## 许可与署名

本项目基于 New API，按 **AGPL-3.0** 分发。你必须保留：

- `LICENSE` 与源码中的版权头；
- 页脚对 New API 的署名和官方仓库链接；
- `NOTICE` 中的全部声明与本次修改记录。

如果你修改后对外提供网络服务，需要按 AGPL-3.0 向用户提供完整对应源码。公开本仓库即可满足这一要求。

上游：https://github.com/QuantumNous/new-api
