#!/usr/bin/env node
/**
 * Checks what Asuka's voice and memory need on this PC and writes a report to send back: the system, the NVIDIA GPU and
 * driver, uv, the prepared Python environments with what PyTorch sees, and the downloaded models. It changes nothing and
 * reads no keys; the home folder is written as ~.
 * Options: --home <DSH home folder>, --out <report file>; the report goes beside this file by default.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { cpus, homedir, release, totalmem, version } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values: options } = parseArgs({ options: { home: { type: 'string' }, out: { type: 'string' } } })
const windows = process.platform === 'win32'
const home = options.home ?? (process.env.DSH_HOME?.trim() || join(homedir(), '.dsh'))
const hub = process.env.HF_HUB_CACHE ?? join(process.env.HF_HOME ?? join(homedir(), '.cache', 'huggingface'), 'hub')
const report = []
const line = text => { report.push(text) }
const hide = text => String(text).split(homedir()).join('~')

function run(command, args, timeout = 120_000) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout, windowsHide: true })
  if (result.error !== undefined) return { ok: false, text: result.error.code === 'ENOENT' ? '未找到' : result.error.message }
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  return { ok: result.status === 0, text: result.status === 0 ? text : `退出码 ${result.status}：${text.split('\n').slice(-12).join('\n')}` }
}

function size(path) {
  let total = 0
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name)
    if (entry.isDirectory()) total += size(child)
    else if (entry.isFile()) total += statSync(child).size
  }
  return total
}

const gb = bytes => `${(bytes / 1024 ** 3).toFixed(2)} GB`
const python = environment => join(environment, ...windows ? ['Scripts', 'python.exe'] : ['bin', 'python'])

line(`明日香语音与记忆自检  ${new Date().toISOString()}`)
line('')
line('[系统]')
line(`${version()} ${release()} ${process.arch}，Node ${process.version}`)
line(`CPU：${cpus()[0]?.model ?? '未知'} × ${cpus().length}，内存 ${gb(totalmem())}`)
line('')
line('[NVIDIA 显卡]')
const gpu = run('nvidia-smi', ['--query-gpu=name,memory.total,driver_version', '--format=csv,noheader'])
line(gpu.ok ? gpu.text : `nvidia-smi ${gpu.text}（没有 N 卡或没装驱动时，N 卡版不能朗读）`)
line('')
line('[uv]')
const uv = run('uv', ['--version'])
line(uv.ok ? uv.text : `uv ${uv.text}（请运行 winget install --id astral-sh.uv，然后重启电脑）`)
line('')
line(`[语音环境]  数据目录 ${hide(home)}`)
const probes = {
  cuda: 'import torch, irodori_tts, dacvae, sherpa_onnx\n'
    + 'print("PyTorch", torch.__version__, "CUDA", torch.version.cuda, "可用" if torch.cuda.is_available() else "不可用")\n'
    + 'if torch.cuda.is_available():\n'
    + '    p = torch.cuda.get_device_properties(0)\n'
    + '    print(p.name, round(p.total_memory / 1024 ** 3, 1), "GiB", "bf16" if torch.cuda.is_bf16_supported() else "fp32")\n'
    + 'print("sherpa-onnx", sherpa_onnx.__version__)',
  cpu: 'import sherpa_onnx\nprint("sherpa-onnx", sherpa_onnx.__version__)',
}
let prepared = false
for (const [runtime, probe] of Object.entries(probes)) {
  const environment = join(home, 'text-to-speech', runtime, 'python')
  if (!existsSync(python(environment))) continue
  prepared = true
  line(`${runtime === 'cuda' ? 'N 卡版' : '通用版'}环境：已安装${existsSync(join(environment, '.dsh-requirements')) ? '' : '（未完成）'}`)
  const result = run(python(environment), ['-I', '-c', probe], 300_000)
  line(hide(result.ok ? result.text : `检查失败，${result.text}`))
}
if (!prepared) line('还没有准备过语音（在明日香的气泡里点“准备声音”后再运行本自检）')
const embedding = join(home, 'text-embedding', 'onnx')
line(`记忆向量：${existsSync(join(embedding, '.installed')) ? '已就绪' : existsSync(embedding) ? '下载或启动中，或上次启动失败' : '尚未启动'}`)
line('')
line(`[已下载的模型]  ${hide(hub)}`)
const models = existsSync(hub) ? readdirSync(hub).filter(name => name.startsWith('models--')) : []
for (const name of models) line(`${name.slice('models--'.length).replace('--', '/')}  ${gb(size(join(hub, name)))}`)
if (models.length === 0) line('没有')

const text = `${report.join('\n')}\n`
const out = options.out ?? join(dirname(fileURLToPath(import.meta.url)), 'DSH-自检结果.txt')
process.stdout.write(text)
try {
  writeFileSync(out, windows ? text.replace(/\n/g, '\r\n') : text, 'utf8')
  process.stdout.write(`\n结果已保存到 ${out}，请把这个文件发给分享安装包的人。\n`)
} catch (error) {
  process.stdout.write(`\n无法保存结果（${error.message}），请截图上面的内容。\n`)
}
