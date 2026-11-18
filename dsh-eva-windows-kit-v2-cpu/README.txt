DeepSeek Harness EVA 指挥舱版（第 2 版·通用版）：Windows 安装包构建说明

这个文件夹用来在一台 Windows 电脑上生成安装包（.exe）。
它必须在 Windows 上构建，脚本会把所有文件放在 C:\dsh-build，不会碰这台电脑上的其他内容。

本安装包包含 dsh-fish-memory 的修改版（明日香伴侣的记忆功能）：
- 派生自 https://github.com/Yuuyuko-uu/dsh-fish-memory ，原作者 Yuuyuko-uu。
- 许可：Yuuyuko-uu 插件许可 1.2，全文随安装包附在 node_modules/dsh-fish-memory/LICENSE，
  源码里也有一份：packages/experimental/companion-bundle/docs/FISH_MEMORY_LICENSE.txt。
- 改动（源码 patches/dsh-fish-memory@1.5.8.patch）：记忆只给明日香的会话使用；固定使用一个记忆库，
  换电脑或换目录也不丢；接入本地向量检索；长期事实可以被新事实更新和取代；每月保存快照。

第 2 版新增
- 智慧决策委员会：请几位思想框架委员审议一个决策，在指挥舱的「02 审议厅」看过程。
- 自动化任务页：每次定时运行产出的文件都能在运行记录里查看和打开。
- 开机身份卡：可以在「指挥舱选项 → 驾驶员名称」里改显示的名字。
- 明日香伴侣（实验）：可以打字或语音聊天、陪你闲聊、记会议纪要；会开口朗读，记忆按意思回忆，
  也可以“放到桌面上”，在其他程序上方显示。
- 修复了多次启动后登录失败、应用打不开的问题。

明日香的声音
这是「通用版」，不需要独立显卡：
- 日语和中文都用在 CPU 上合成的女声（日语 5 个、中文 6 个，在她的菜单里选），不是明日香本人的声音。
- 第一次准备声音要下载约 0.5 GB。
- 如果准备声音或朗读失败：先双击 self-check.cmd，把生成的 DSH-自检结果.txt 发给分享的人。
- 两个版本都在第一次用到记忆时下载约 0.9 GB 的向量模型和依赖。
- 声音和记忆需要 uv（见第一步）。下载来自 pypi.org、download.pytorch.org 和 huggingface.co；
  构建时加 --cn-mirror 会改用国内镜像（清华 PyPI 和 hf-mirror.com）。

需要的条件
- Windows 10 或 11，64 位
- C 盘至少 25 GB 空闲空间
- 能访问 npm、GitHub 和 nodejs.org；明日香的声音和记忆还要访问 pypi.org 和 huggingface.co（或用 --cn-mirror）

第一步：安装工具（已装的可以跳过）
1. 安装 Node.js 24：打开 https://nodejs.org/dist/latest-v24.x/ ，下载 x64 的 .msi 并安装。
2. 打开 PowerShell，逐行运行：

   winget install --id Git.Git
   winget install --id Microsoft.PowerShell
   winget install --id Python.Python.3.12
   winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --wait"
   winget install --id astral-sh.uv

3. 全部装完后，注销或重启一次电脑，让 uv 生效。

第二步：构建
1. 先把这个压缩包完整解压，不要在压缩包里直接运行。
2. 双击 build-windows.cmd。第一次要下载很多内容，请耐心等待，也可以中途重新运行，它会接着做。
3. 成功后，安装包在 C:\dsh-build\output\ 文件夹里，旁边的 SHA256.txt 是它的校验值。

如果下载很慢，在这个文件夹打开 PowerShell，运行下面其中一行：

   .\build-windows.cmd --cn-mirror
   .\build-windows.cmd --proxy http://127.0.0.1:7890

（第二行的地址换成你自己的代理。）

如果失败：把屏幕上最后几十行，或者 C:\dsh-build\logs\ 里最新的日志发给分享这个包的人。

第三步：安装和使用
1. 双击安装包。因为没有数字签名，Windows 可能提示“已保护你的电脑”，点“更多信息”，再点“仍要运行”。
2. 打开后先出现欢迎窗口，点“添加 API Key”，填入你自己的 API 密钥。以后可以在“更多 → 设置 → 模型”里修改。
3. 这个版本不会自动更新，使用统计、会话日志上传和反馈上传都已关闭。详细说明见随包发送的安装配置手册。
4. 新功能默认关闭。在左侧栏的“插件 → 实验性插件”里打开「智慧决策委员会」「明日香伴侣」或「语音输入」，
   用法见手册里的“第 2 版新增功能”和“明日香伴侣”两节。
5. 第一次让明日香说话前，点她气泡里的“准备声音”，等下载和安装完成（进度会显示在气泡里）。
6. 声音或记忆有问题时，双击这个文件夹里的 self-check.cmd，把生成的 DSH-自检结果.txt 发给分享的人。
   它只读取显卡、uv 和已下载模型的情况，不读取密钥。

第四步：清理
安装包复制走之后，可以删除 C:\dsh-build，以释放空间。

其他说明
- 项目本身使用 MIT 许可证，见源码里的 LICENSE。
- 界面中的 EVA 角色图（包括明日香的形象）涉及《新世纪福音战士》的版权，只供朋友之间私下体验，请不要公开分发或用于商业用途。
- 明日香的声音是本地合成的，不经过任何在线服务；语音输入第一次使用会下载约 240 MB 的识别模型。
- 声音模型的许可：Irodori-TTS（MIT，禁止未经同意克隆真人声音）、Kokoro（Apache-2.0）、Supertonic 3（OpenRAIL-M，
  有使用限制）；记忆用的 Qwen3-Embedding 为 Apache-2.0。
- 打开“聊最新新闻”时，应用会读取几家新闻网站的 RSS 标题；不打开就不会联网读取。
