#!/usr/bin/env node
/**
 * Builds the unsigned share installer on a Windows x64 PC from the source archive beside this file.
 * Everything the build reads or writes stays under a neutral folder, because build paths end up inside the bundles.
 * Options: --root <folder>, --cn-mirror, --proxy <http://host:port>, --check-only, --rehearse (macOS trial of the same steps).
 */
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statfsSync, writeFileSync } from 'node:fs'
import { dirname, join, parse, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { buildMachineNames, printReport, verifyFolder } from './verify-share.mjs'

const KIT = dirname(fileURLToPath(import.meta.url))
const SOURCE = join(KIT, 'dsh-eva-share-src.tar.gz')
const PNPM_VERSION = '11.28.5'
const MINIMUM_NODE = [24, 9]
const MINIMUM_FREE_GB = 25
const AUTHOR = { name: 'EVA Build', email: 'build@example.invalid' }
const MIRROR = { registry: 'https://registry.npmmirror.com', electron: 'https://repo.huaweicloud.com/electron/',
  python: 'https://pypi.tuna.tsinghua.edu.cn/simple', models: 'https://hf-mirror.com' }
/** Credentials and app settings of the build machine never reach the build. */
const WITHHELD = /(API_?KEY|TOKEN|SECRET|PASSWORD|CREDENTIALS?)$|^(DEEPSEEK|ANTHROPIC|OPENAI|DSH)_|^ELECTRON_RUN_AS_NODE$|^NoDefaultCurrentDirectoryInExePath$/i

const { values: options } = parseArgs({
  options: {
    root: { type: 'string' },
    'cn-mirror': { type: 'boolean', default: false },
    proxy: { type: 'string' },
    'check-only': { type: 'boolean', default: false },
    rehearse: { type: 'boolean', default: false },
  },
})
const rehearsal = options.rehearse
const windows = process.platform === 'win32'
let logFile

/** Stops the build with a message for the person running it. */
class BuildStopped extends Error {}

function fail(message) {
  throw new BuildStopped(message)
}

function step(message) {
  console.log(`\n=== ${message} ===`)
}

function probe(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true })
  return result.status === 0 ? `${result.stdout}${result.stderr}`.trim() : undefined
}

function checkHost() {
  if (!rehearsal && (!windows || process.arch !== 'x64')) fail('需要在 Windows x64 电脑上运行')
  if (!existsSync(SOURCE)) fail(`找不到 ${SOURCE}。请先完整解压，再运行`)
  const [major, minor] = process.versions.node.split('.').map(Number)
  if (major < MINIMUM_NODE[0] || (major === MINIMUM_NODE[0] && minor < MINIMUM_NODE[1])) {
    fail(`需要 Node.js ${MINIMUM_NODE.join('.')} 或更新的 24.x，当前是 ${process.versions.node}。下载：https://nodejs.org/dist/latest-v24.x/`)
  }
  if (major !== MINIMUM_NODE[0]) console.log(`提示：当前 Node.js 是 ${process.versions.node}，项目用 24.x 验证，如果出错请改用 24.x`)
}

function checkRoot(root) {
  if (/[^\x21-\x7e]/.test(root)) fail(`构建目录只能用英文和数字，不能有空格：${root}`)
  const lower = root.toLowerCase()
  const folders = lower.split(/[\\/]/)
  if ((windows && folders.includes('users')) || buildMachineNames().specific.some(name => folders.includes(name))) {
    fail(`构建目录不能带用户名，否则路径会写进安装包：${root}`)
  }
}

function checkTools() {
  const missing = []
  if (probe('git', ['--version']) === undefined) missing.push('Git：winget install --id Git.Git')
  const pythons = process.env.PYTHON === undefined ? ['python', 'python3', 'py'] : [process.env.PYTHON]
  if (!pythons.some(python => probe(python, ['--version']) !== undefined)) missing.push('Python：winget install --id Python.Python.3.12（或设置 PYTHON 环境变量）')
  if (windows) {
    if (probe('pwsh', ['--version']) === undefined) missing.push('PowerShell 7：winget install --id Microsoft.PowerShell')
    if (probe(tarCommand(), ['--version']) === undefined) missing.push('tar：需要 Windows 10 1803 或更新版本')
    const vswhere = join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Microsoft Visual Studio', 'Installer', 'vswhere.exe')
    const found = existsSync(vswhere) ? probe(vswhere, ['-products', '*', '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64', '-property', 'installationPath']) : undefined
    if (found === undefined || found === '') {
      missing.push('Visual C++ 生成工具：winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --wait"')
    }
  }
  if (missing.length > 0) fail(`缺少以下工具，安装后请重新打开窗口再运行：\n  ${missing.join('\n  ')}`)
  if (probe('uv', ['--version']) === undefined) console.log('提示：构建不需要 uv，但明日香的声音和记忆需要。安装：winget install --id astral-sh.uv，装完后注销或重启一次')
}

/** With --cn-mirror, her voices and memory also install Python packages and download models through mirrors. */
function mirrorCompanion(source) {
  const bundle = join(source, 'packages', 'experimental', 'companion-bundle', 'cordis.patch.yml')
  const text = readFileSync(bundle, 'utf8')
  const mirrored = text
    .replace(/^( +)runtime: (cuda|cpu)\n/m, (row, indent) => `${row}${indent}packageIndex: ${MIRROR.python}\n${indent}modelOrigins: [${MIRROR.models}, https://huggingface.co]\n`)
    .replace(/^( +)backend: onnx\n/m, (row, indent) => `${row}${indent}packageIndex: ${MIRROR.python}\n${indent}modelOrigin: ${MIRROR.models}\n`)
  if (mirrored.split(MIRROR.python).length !== 3) fail('源码包里明日香的语音配置和预期不同，无法改用国内镜像')
  writeFileSync(bundle, mirrored)
}

function tarCommand() {
  // Git's tar reads "C:" as a remote host, so this names the one Windows ships.
  return windows ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar'
}

function checkDisk(root) {
  const { bavail, bsize } = statfsSync(parse(root).root)
  const free = Math.floor(bavail * bsize / (1 << 30))
  if (free < MINIMUM_FREE_GB) fail(`${parse(root).root} 只剩 ${free} GB，至少需要 ${MINIMUM_FREE_GB} GB`)
}

function checkProxy(proxy) {
  let url
  try {
    url = new URL(proxy)
  } catch {
    fail(`代理地址格式不对：${proxy}`)
  }
  if (!/^https?:$/.test(url.protocol) || url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '' || url.pathname !== '/') {
    fail('代理地址只能写成 http://主机:端口，不能带账号密码')
  }
}

function buildEnvironment(root) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !WITHHELD.test(name)))
  const pathName = Object.keys(env).find(name => name.toLowerCase() === 'path') ?? 'PATH'
  const temporary = join(root, 'tmp')
  const cache = join(root, 'cache')
  Object.assign(env, {
    [pathName]: `${join(root, 'tools', 'node_modules', '.bin')}${windows ? ';' : ':'}${env[pathName]}`,
    TEMP: temporary,
    TMP: temporary,
    TMPDIR: temporary,
    PNPM_CONFIG_STORE_DIR: join(root, 'store'),
    DSH_DESKTOP_PACKAGE_CACHE_DIR: cache,
    DSH_TELEMETRY_DISABLED: '1',
    npm_config_cache: join(cache, 'npm'),
    npm_config_devdir: join(cache, 'node-gyp'),
    ELECTRON_CACHE: join(cache, 'electron'),
    electron_config_cache: join(cache, 'electron'),
    ELECTRON_BUILDER_CACHE: join(cache, 'electron-builder'),
    GIT_AUTHOR_NAME: AUTHOR.name,
    GIT_AUTHOR_EMAIL: AUTHOR.email,
    GIT_COMMITTER_NAME: AUTHOR.name,
    GIT_COMMITTER_EMAIL: AUTHOR.email,
  })
  if (options['cn-mirror']) {
    Object.assign(env, { npm_config_registry: MIRROR.registry, pnpm_config_registry: MIRROR.registry, ELECTRON_MIRROR: MIRROR.electron })
  }
  if (options.proxy !== undefined) {
    Object.assign(env, { HTTP_PROXY: options.proxy, HTTPS_PROXY: options.proxy, NODE_USE_ENV_PROXY: '1', npm_config_proxy: options.proxy, npm_config_https_proxy: options.proxy })
  }
  return env
}

function run(label, command, args, { cwd, env, shell = false }) {
  step(label)
  return new Promise((done, stop) => {
    const child = spawn(command, args, { cwd, env, shell, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    const write = (chunk) => {
      process.stdout.write(chunk)
      appendFileSync(logFile, chunk)
    }
    child.stdout.on('data', write)
    child.stderr.on('data', write)
    child.on('error', error => stop(new BuildStopped(`${label} 无法启动：${error.message}`)))
    child.on('close', code => (code === 0 ? done() : stop(new BuildStopped(`${label} 失败，退出码 ${code}`))))
  })
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

async function prepareSource(root, env) {
  const source = join(root, 'src')
  const marker = join(root, 'source.sha256')
  const expected = readFileSync(join(KIT, 'SHA256SUMS.txt'), 'utf8').match(/^([0-9a-f]{64})\s+dsh-eva-share-src\.tar\.gz$/m)?.[1]
  const actual = sha256(SOURCE)
  if (actual !== expected) fail('源码包校验不通过，文件可能损坏，请重新获取')
  if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === actual && existsSync(join(source, '.git'))) {
    console.log('源码已准备好，继续上次的构建')
    return source
  }
  rmSync(source, { recursive: true, force: true, maxRetries: 3 })
  mkdirSync(source, { recursive: true })
  await run('解压源码', tarCommand(), ['-xzf', SOURCE, '-C', source], { cwd: root, env })
  if (options['cn-mirror']) {
    appendFileSync(join(source, 'apps', 'desktop', '.env.windows'), `DSH_DESKTOP_NPM_REGISTRY=${MIRROR.registry}\n`)
    mirrorCompanion(source)
  }
  const git = args => run(`git ${args[0]}`, 'git', args, { cwd: source, env })
  await git(['init', '-q', '-b', 'main', '.'])
  await git(['config', 'core.autocrlf', 'false'])
  await git(['config', 'core.longpaths', 'true'])
  await git(['config', 'user.name', AUTHOR.name])
  await git(['config', 'user.email', AUTHOR.email])
  await git(['add', '-A'])
  await git(['commit', '-q', '--no-verify', '-m', 'EVA command bay snapshot'])
  writeFileSync(marker, `${actual}\n`)
  return source
}

async function installPnpm(root, env) {
  const tools = join(root, 'tools')
  const manifest = join(tools, 'node_modules', 'pnpm', 'package.json')
  const installed = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : undefined
  if (installed?.version !== PNPM_VERSION) {
    mkdirSync(tools, { recursive: true })
    await run(`安装 pnpm ${PNPM_VERSION}`, 'npm', ['install', '--prefix', tools, '--no-audit', '--no-fund', `pnpm@${PNPM_VERSION}`], { cwd: tools, env, shell: windows })
  }
  const { bin } = JSON.parse(readFileSync(manifest, 'utf8'))
  return join(dirname(manifest), typeof bin === 'string' ? bin : bin.pnpm)
}

function locateOutput(source) {
  const target = rehearsal ? 'mac-arm64' : 'win-x64'
  const artifacts = join(source, 'apps', 'desktop', '.desktop-build', 'targets', target, 'unsigned-artifacts')
  return { artifacts, unpacked: rehearsal ? join(artifacts, 'mac-arm64', 'DeepSeek Harness.app', 'Contents', 'Resources') : join(artifacts, 'win-unpacked') }
}

function verifyOutput(unpacked) {
  step('复查构建结果')
  if (!existsSync(unpacked)) fail(`找不到构建结果：${unpacked}`)
  const { texts, skipped } = buildMachineNames()
  if (skipped.length > 0) console.log(`这些名字太常见，未搜索：${skipped.join(', ')}`)
  return printReport(verifyFolder(unpacked, texts))
}

function publishInstaller(root, artifacts, clean) {
  const installers = readdirSync(artifacts).filter(name => name.toLowerCase().endsWith('.exe'))
  if (installers.length !== 1) fail(`应该只有一个安装包，实际找到 ${installers.length} 个：${artifacts}`)
  const output = join(root, 'output')
  rmSync(output, { recursive: true, force: true })
  mkdirSync(output, { recursive: true })
  const installer = join(output, installers[0])
  copyFileSync(join(artifacts, installers[0]), installer)
  const digest = sha256(installer)
  writeFileSync(join(output, 'SHA256.txt'), `${digest}  ${installers[0]}\n`)
  console.log(`\n安装包：${installer}\nSHA256：${digest}`)
  if (!clean) fail('安装包里有上面列出的内容，确认无妨后再分发')
}

async function main() {
  checkHost()
  const root = resolve(options.root ?? (windows ? 'C:\\dsh-build' : '/Users/Shared/dsh-kit-test'))
  checkRoot(root)
  checkTools()
  if (options.proxy !== undefined) checkProxy(options.proxy)
  mkdirSync(join(root, 'logs'), { recursive: true })
  mkdirSync(join(root, 'tmp'), { recursive: true })
  checkDisk(root)
  logFile = join(root, 'logs', `build-${new Date().toISOString().replace(/[:.]/g, '-')}.log`)
  const env = buildEnvironment(root)
  const source = await prepareSource(root, env)
  const pnpm = await installPnpm(root, env)
  const pnpmRun = (label, ...args) => run(label, process.execPath, [pnpm, ...args], { cwd: source, env })
  const command = rehearsal ? 'package:desktop:mac:arm64:unsigned' : 'package:desktop:win:x64:unsigned'
  await pnpmRun('安装依赖', 'install', '--frozen-lockfile')
  await pnpmRun('检查打包配置和工具', 'run', command, '--check')
  if (options['check-only']) {
    console.log('\n检查通过。去掉 --check-only 再运行就会开始构建')
    return
  }
  await pnpmRun('构建安装包（首次较慢）', 'run', command, ...rehearsal ? ['--dir'] : [])
  const { artifacts, unpacked } = locateOutput(source)
  const clean = verifyOutput(unpacked)
  if (rehearsal) {
    if (!clean) fail('复查未通过')
    console.log(`\n演练完成：${unpacked}`)
    return
  }
  publishInstaller(root, artifacts, clean)
  console.log('\n完成。安装包在 output 文件夹里')
}

// The exit code is set, not passed to process.exit, which can deadlock after a large scan: it joins V8's workers while a background compile waits for a collection on this thread.
try {
  await main()
} catch (error) {
  if (!(error instanceof BuildStopped)) throw error
  console.error(`\n构建停止：${error.message}`)
  if (logFile !== undefined) console.error(`日志：${logFile}`)
  process.exitCode = 1
}
