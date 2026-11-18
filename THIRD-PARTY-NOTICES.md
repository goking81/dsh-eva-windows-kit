# 第三方声明

本仓库的**打包、构建脚本、`README.md` 文案和展示图排版**由维护者（@goking81）完成，以 [MIT](LICENSE) 许可发布 —— 可以自由使用、修改、再分发。

但有**三样东西不是维护者的**，它们各自的条款盖在 MIT 之上。下面写清楚，以免误用。

## 一、不在 MIT 范围内的部分

| 内容 | 权利人 | 条款 | 你能做什么 |
|---|---|---|---|
| 界面中的 EVA 角色形象（含明日香立绘、机体素材、启动画面） | **Khara / GAINAX** | **未授权**，属非商业同人使用 | 随本套件原样使体验，**不可单独提取、转售、用于商业产品** |
| 记忆插件 `dsh-fish-memory`（派生自 [Yuuyuko-uu](https://github.com/Yuuyuko-uu/dsh-fish-memory)） | Yuuyuko-uu | **Yuuyuko-uu 插件许可 1.2**（全文随包附于 `node_modules/dsh-fish-memory/LICENSE`） | 遵守该许可，**不适用 MIT** |
| 声音与向量模型：Irodori-TTS / Kokoro / Supertonic 3 / Qwen3-Embedding | 各自作者 | MIT（禁止未经同意克隆真人声音）/ Apache-2.0 / OpenRAIL-M / Apache-2.0 | 各按原条款；由使用者首次运行时自行下载，不在本仓库内 |

## 二、DSH 本体

`dsh-eva-share-src.tar.gz` 内的 DeepSeek Harness 源码是 **MIT，`Copyright (c) 2026 DeepSeek`**，全文见包内 `LICENSE`。

它和本仓库的 MIT 是同一类许可，**互不冲突**：你拿到的那份源码仍归 DeepSeek，版权声明已原样保留在压缩包里。

## 三、关于 EVA 素材

这是**非官方、非商业的同人作品**，与 Khara / GAINAX 无任何关联，未获授权。角色与视觉设定的版权归权利人所有。

保留这些素材的唯一目的，是让别人能还原出同样的界面观感。若权利人认为本仓库的使用不妥，请通过 [Issues](../../issues) 联系，维护者会立即移除相关素材。

## 四、免责

按现状提供，不附带任何明示或默示担保。因使用造成的任何后果由使用者自行承担。

---

<sub>**English summary** — This repository's own work (packaging, build scripts, README, layout) is MIT-licensed, © 2026 furong.xu (@goking81). Three bundled components are **not** covered by that MIT license: (1) the EVA character artwork, © Khara / GAINAX, used as non-commercial fan work without authorization; (2) the `dsh-fish-memory` plugin, under the Yuuyuko-uu Plugin License 1.2; (3) the speech and embedding models, which are downloaded separately under their own MIT / Apache-2.0 / OpenRAIL-M terms. The DeepSeek Harness source inside the archive is MIT, © 2026 DeepSeek, and retains its own notice.</sub>
