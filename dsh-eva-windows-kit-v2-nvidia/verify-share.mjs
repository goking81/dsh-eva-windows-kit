#!/usr/bin/env node
/**
 * Checks a built application folder for traces of the machine that built it: its user and computer names, in UTF-8 and UTF-16,
 * including inside gzip archives, and files that hold user state. Holds no list of anyone's personal data.
 * Usage: node verify-share.mjs <folder> [--also <text>]
 */
import { closeSync, lstatSync, openSync, readFileSync, readSync, readdirSync } from 'node:fs'
import { hostname, userInfo } from 'node:os'
import { basename, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { gunzipSync } from 'node:zlib'

const CHUNK = 64 * 1024 * 1024
const OVERLAP = 4096
const GENERIC = new Set(['admin', 'administrator', 'user', 'users', 'owner', 'default', 'public', 'runner', 'build', 'test', 'guest', 'system', 'desktop', 'root', 'home'])
const STATE_FILE = /^(\.env(\.[a-z]+)?|\.credentials\.yaml|\.anonymous-user-id|session\.v\d+\.jsonl(\.zstd)?|session\.lock|schedule\.json|workspace\.json|Cookies|Local State|\.npmrc)$/

/**
 * What identifies the machine running this. A user name is searched only as a home path, because a short name such as "ming"
 * also occurs inside ordinary words, and paths are how it reaches a build.
 * @param env - the environment to read.
 * @returns the specific names, the texts to search for, and the names too generic to search for; all lower-cased.
 */
export function buildMachineNames(env = process.env) {
  let account = ''
  try {
    account = userInfo().username
  } catch {
    // An account without a passwd entry has no name to look for; the environment values below still apply.
  }
  const lowered = values => [...new Set(values.filter(Boolean).map(value => value.toLowerCase()))]
  const isSpecific = name => name.length >= 3 && !GENERIC.has(name)
  const users = lowered([env.USERNAME, env.USER, env.LOGNAME, account, basename(env.USERPROFILE ?? ''), basename(env.HOME ?? '')])
  const computers = lowered([env.COMPUTERNAME, env.HOSTNAME, hostname()])
  const texts = users.filter(isSpecific).flatMap((user) => {
    // Windows also spells a long folder name in 8.3 form, such as C:\Users\LONGNA~1.
    const spellings = user.length > 8 ? [user, `${user.slice(0, 6)}~1`] : [user]
    return spellings.flatMap(name => [`users\\${name}`, `users\\\\${name}`, `users/${name}`])
  })
  texts.push(...computers.filter(isSpecific))
  const names = [...users, ...computers]
  return { specific: names.filter(isSpecific), texts, skipped: names.filter(name => !isSpecific(name)) }
}

function needlesOf(name) {
  const text = name.toLowerCase()
  const forms = [Buffer.from(text, 'utf8'), Buffer.from(text, 'utf16le')]
  return forms.map(form => form.toString('latin1').toLowerCase())
}

function searchBuffer(buffer, searches, found) {
  const text = buffer.toString('latin1').toLowerCase()
  for (const { name, forms } of searches) {
    if (forms.some(form => text.includes(form))) found.add(name)
  }
}

let chunkBuffer

function searchFile(path, searches, found) {
  chunkBuffer ??= Buffer.allocUnsafe(CHUNK + OVERLAP)
  const handle = openSync(path, 'r')
  try {
    let kept = 0
    for (;;) {
      const read = readSync(handle, chunkBuffer, kept, CHUNK, null)
      if (read === 0) break
      const total = kept + read
      searchBuffer(chunkBuffer.subarray(0, total), searches, found)
      kept = Math.min(OVERLAP, total)
      chunkBuffer.copyWithin(0, total - kept, total)
    }
  } finally {
    closeSync(handle)
  }
}

/**
 * Searches one folder.
 * @param root - the folder.
 * @param names - the texts to look for.
 * @returns what was searched and found.
 */
export function verifyFolder(root, names) {
  const searches = names.map(name => ({ name, forms: needlesOf(name) }))
  const report = { files: 0, bytes: 0, archives: 0, unreadable: [], state: [], hits: new Map(names.map(name => [name, []])) }
  const pending = [root]
  while (pending.length > 0) {
    const folder = pending.pop()
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        pending.push(path)
        continue
      }
      if (!entry.isFile()) continue
      const shown = relative(root, path)
      if (STATE_FILE.test(entry.name)) report.state.push(shown)
      report.files += 1
      report.bytes += lstatSync(path).size
      const found = new Set()
      try {
        searchFile(path, searches, found)
        if (/\.(tgz|gz)$/i.test(entry.name)) {
          const packed = readFileSync(path)
          if (packed[0] === 0x1f && packed[1] === 0x8b) {
            report.archives += 1
            searchBuffer(gunzipSync(packed), searches, found)
          }
        }
      } catch (error) {
        report.unreadable.push(`${shown}: ${error.message}`)
      }
      for (const name of found) report.hits.get(name).push(shown)
    }
  }
  return report
}

/**
 * Prints a report.
 * @param report - the result of verifyFolder.
 * @returns whether the folder is clean.
 */
export function printReport(report) {
  console.log(`已检查 ${report.files} 个文件，${Math.round(report.bytes / (1 << 20))} MB，其中压缩包 ${report.archives} 个`)
  let clean = true
  for (const [name, files] of report.hits) {
    if (files.length === 0) continue
    clean = false
    console.log(`发现 "${name}"：${files.length} 个文件`)
    for (const file of files.slice(0, 20)) console.log(`  ${file}`)
  }
  if (report.state.length > 0) {
    clean = false
    console.log(`发现保存用户状态的文件：${report.state.length} 个`)
    for (const file of report.state.slice(0, 20)) console.log(`  ${file}`)
  }
  if (report.unreadable.length > 0) {
    clean = false
    console.log(`有文件无法读取：${report.unreadable.length} 个`)
    for (const line of report.unreadable.slice(0, 20)) console.log(`  ${line}`)
  }
  console.log(clean ? '复查通过：没有发现构建机信息和用户状态文件' : '复查未通过：请查看上面的文件')
  return clean
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { also: { type: 'string', multiple: true } } })
  if (positionals.length !== 1) {
    console.error('用法：node verify-share.mjs <文件夹> [--also <文字>]')
    process.exitCode = 2
  } else {
    const { texts, skipped } = buildMachineNames()
    if (skipped.length > 0) console.log(`这些名字太常见，未搜索：${skipped.join(', ')}`)
    // process.exit can deadlock after a large scan: it joins V8's workers while a background compile waits for a collection on this thread.
    process.exitCode = printReport(verifyFolder(positionals[0], [...texts, ...values.also ?? []])) ? 0 : 3
  }
}
