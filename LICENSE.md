# 许可与第三方声明

本仓库**不是原创项目**，而是把一份别人做的 DSH 改装套件原样打包、另配一份说明页放在这里。
所以它没有「一个许可证」，只有一条**授权链**。下面逐层写清楚，别把任何一层当成另一层。

## 一、这里有什么，各归谁

| # | 内容 | 权利人 | 许可 | 本仓库能授什么 |
|---|---|---|---|---|
| 1 | `dsh-eva-share-src.tar.gz` 内的 DSH 源码 | **DeepSeek** | MIT（`Copyright (c) 2026 DeepSeek`，见包内 `LICENSE`） | 只能原样再分发并保留其版权声明，**不能替它另发许可** |
| 2 | 构建脚本 `build-windows.*` / `self-check.*` / `verify-share.mjs` | 套件原打包者 | 未单独声明 | 同上：原样再分发 |
| 3 | 界面中的 EVA 角色形象（含明日香立绘与机体素材） | **Khara / GAINAX** | **无** | ❌ 任何人都无权授权 |
| 4 | 记忆插件 `dsh-fish-memory`（派生自 [Yuuyuko-uu](https://github.com/Yuuyuko-uu/dsh-fish-memory)） | Yuuyuko-uu | **Yuuyuko-uu 插件许可 1.2** | ❌ 不是 MIT，不适用本仓库任何声明 |
| 5 | 声音模型 Irodori-TTS / Kokoro / Supertonic 3 | 各自作者 | MIT / Apache-2.0 / OpenRAIL-M | ❌ 三者各不相同，且由使用者首次运行时自行下载 |
| 6 | `README.md` 的文字，`assets/showcase/` 的排版合成 | 本仓库维护者（@goking81） | 文字可自由引用并注明出处 | ⚠️ 图片含第 3 层素材，不单独授权，仅随本页展示 |

## 二、你可以做什么

- 下载、解压、在自己的 Windows 机器上构建并使用。这是这套东西原本的用途。
- 私下转给朋友体验。

## 三、你不可以做什么

- **公开再分发**：镜像、搬运、打包成安装包对外发布，或用于任何商业用途。
  套件原说明里写得很明确：「只供朋友之间私下体验，请不要公开分发或用于商业用途」。
- 把本仓库的任何内容当作 MIT 授权使用。本仓库**没有**对第 1–5 层发出任何许可。
- 单独提取 EVA 角色素材另作他用。

> 本仓库托管在公开平台上，客观上任何人都能访问。**「能被看到」不等于「被授权」**——
> 除上述范围外，维护者不授予任何额外权利。

## 四、关于 GitHub 显示的许可证

GitHub 在这一栏会显示 `Other` 或 `none`，这是**准确**的：本仓库不存在单一 OSI 许可证。
如果某处出现「MIT」字样（旧版 README 徽章等），那指的是第 1 层上游 DSH 源码的许可，**不是**对整个仓库的授权。

## 五、免责

本仓库与 DeepSeek、Khara、GAINAX 均无关联，非官方、未获授权。
按现状提供，不附带任何明示或默示担保；因使用造成的任何后果由使用者自行承担。
若权利人认为本仓库内容侵犯其权益，请通过仓库 Issue 联系，维护者将立即处理。

---

<sub>**English summary** — This repository only repackages a third-party DSH customization kit for personal, non-commercial use. It grants **no** license of its own. The DSH source inside the archive is MIT (© 2026 DeepSeek) and must be redistributed with that notice intact. The EVA character artwork is © Khara / GAINAX and is **not** licensed by anyone here. The `dsh-fish-memory` plugin is under the Yuuyuko-uu Plugin License 1.2, not MIT. Public redistribution and commercial use are not permitted.</sub>
