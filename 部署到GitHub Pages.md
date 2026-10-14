# 部署到 GitHub Pages（固定链接）指南

> 目标：把「小王的工作台」放到 GitHub Pages，得到一个**永久不变的链接**
> （`https://你的用户名.github.io/仓库名/`）。
> 以后内容更新只需改完代码、bump 一下 sw.js 版本号、push，手机靠 Service Worker 自动更新，无需重新添加主屏幕。

---

## 一、为什么用 GitHub Pages

- CloudStudio 的部署工具每次都会新建 workspace，**链接必然变化**（旧链接已停留在 v18）。
- GitHub Pages 的链接与仓库绑定，**建好之后永久不变**，且自带 HTTPS，PWA（离线 + 自动更新）完全可用。
- 代码我已提前适配子路径：Service Worker 注册改为 `./sw.js`、加了 `.nojekyll`、缓存版本升到 `sunpad-v20`。

---

## 二、方式一：GitHub Desktop（最简单，推荐 Windows 用户）

1. 注册 / 登录 GitHub（https://github.com）。
2. 网页上新建仓库：`New repository` → 名字建议 `xiaowang-workbench` → 选 **Public** → 不要勾 README → `Create repository`。
3. 下载安装 GitHub Desktop（https://desktop.github.com）。
4. 打开 GitHub Desktop → `File` → `Add Local Repository` → 选本机 `sun-workspace` 文件夹（就是放 index.html 的这个目录）。
5. 上方填 `Summary`（如 `init: 小王的工作台 PWA v20`），点 `Commit to main`。
6. 点 `Publish repository` → 选你刚建的仓库 → `Publish`。
7. 去仓库页面 `Settings` → `Pages` → `Source` 选 `main` / `(root)` → `Save`。
8. 等 1–2 分钟，访问 `https://你的用户名.github.io/xiaowang-workbench/` 即可。

---

## 三、方式二：命令行一键脚本（publish.ps1）

已生成 `publish.ps1`（同目录）。在装好 git 的 Windows 上：

1. 网页上先建好空仓库（同方式一步骤 2，Public）。
2. 右键 `publish.ps1` → 用 PowerShell 运行，按提示输入 GitHub 用户名、回车。
3. 脚本会 `git init / add / commit / push` 到 `https://github.com/你的用户名/仓库名.git`。
4. 同方式一步骤 7 在仓库 `Settings → Pages` 开启。

> 前提：本机 git 已配置好凭据（GitHub Desktop 登录过，或配了 SSH key / Personal Access Token）。

---

## 四、手机添加到主屏幕（iOS）

1. 用 Safari 打开你的 GitHub Pages 链接。
2. 点底部「分享」→「添加到主屏幕」→ 命名「小王的工作台」→ 添加。
3. 以后从主屏幕图标进入，就是类原生 App。

---

## 五、以后怎么更新内容

1. 改代码（例如再修 bug、加板块）。
2. **务必** 改 `sw.js` 顶部的 `const CACHE = 'sunpad-vXX'` 升一个版本号（否则浏览器不拉新版）。
3. push 到 GitHub（Desktop 提交并 push，或重跑脚本）。
4. 手机打开后，Service Worker 检测到新版会弹「立即更新」横幅，点一下即更新；不点也会在下次进入时生效。

---

## 六、注意事项

- 你的数据（记账、体重、阅读进度、自定义书籍、提醒等）存在**手机浏览器 localStorage**，换设备或清缓存会丢；用 App 内「设置 → 备份/恢复」导出 JSON 保存。
- GitHub Pages 免费版仓库是公开的，但本项目纯前端、无敏感数据，无妨。
- 若想用自定义域名（如 `app.你的域名.com`），在仓库 `Settings → Pages` 里填 Custom domain 即可，链接同样固定。
