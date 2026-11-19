import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Small MD5 implementation for Gravatar hashes. Browsers only ship SHA in
 * SubtleCrypto, and pulling in a package for one hash felt like overkill.
 * Based on the public-domain JavaScript MD5 by Joseph Myers.
 */
const md5SafeAdd = (x: number, y: number) => {
  const lsw = (x & 0xffff) + (y & 0xffff)
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
  return (msw << 16) | (lsw & 0xffff)
}

const md5RotateLeft = (num: number, cnt: number) => (num << cnt) | (num >>> (32 - cnt))

const md5cmn = (q: number, a: number, b: number, x: number, s: number, t: number) =>
  md5SafeAdd(md5RotateLeft(md5SafeAdd(md5SafeAdd(a, q), md5SafeAdd(x, t)), s), b)

const md5ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
  md5cmn((b & c) | (~b & d), a, b, x, s, t)
const md5gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
  md5cmn((b & d) | (c & ~d), a, b, x, s, t)
const md5hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
  md5cmn(b ^ c ^ d, a, b, x, s, t)
const md5ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
  md5cmn(c ^ (b | ~d), a, b, x, s, t)

function md5Words(words: number[], length: number): number[] {
  words[length >> 5] |= 0x80 << length % 32
  words[(((length + 64) >>> 9) << 4) + 14] = length

  let a = 1732584193
  let b = -271733879
  let c = -1732584194
  let d = 271733878

  for (let i = 0; i < words.length; i += 16) {
    const olda = a
    const oldb = b
    const oldc = c
    const oldd = d

    a = md5ff(a, b, c, d, words[i], 7, -680876936)
    d = md5ff(d, a, b, c, words[i + 1], 12, -389564586)
    c = md5ff(c, d, a, b, words[i + 2], 17, 606105819)
    b = md5ff(b, c, d, a, words[i + 3], 22, -1044525330)
    a = md5ff(a, b, c, d, words[i + 4], 7, -176418897)
    d = md5ff(d, a, b, c, words[i + 5], 12, 1200080426)
    c = md5ff(c, d, a, b, words[i + 6], 17, -1473231341)
    b = md5ff(b, c, d, a, words[i + 7], 22, -45705983)
    a = md5ff(a, b, c, d, words[i + 8], 7, 1770035416)
    d = md5ff(d, a, b, c, words[i + 9], 12, -1958414417)
    c = md5ff(c, d, a, b, words[i + 10], 17, -42063)
    b = md5ff(b, c, d, a, words[i + 11], 22, -1990404162)
    a = md5ff(a, b, c, d, words[i + 12], 7, 1804603682)
    d = md5ff(d, a, b, c, words[i + 13], 12, -40341101)
    c = md5ff(c, d, a, b, words[i + 14], 17, -1502002290)
    b = md5ff(b, c, d, a, words[i + 15], 22, 1236535329)

    a = md5gg(a, b, c, d, words[i + 1], 5, -165796510)
    d = md5gg(d, a, b, c, words[i + 6], 9, -1069501632)
    c = md5gg(c, d, a, b, words[i + 11], 14, 643717713)
    b = md5gg(b, c, d, a, words[i], 20, -373897302)
    a = md5gg(a, b, c, d, words[i + 5], 5, -701558691)
    d = md5gg(d, a, b, c, words[i + 10], 9, 38016083)
    c = md5gg(c, d, a, b, words[i + 15], 14, -660478335)
    b = md5gg(b, c, d, a, words[i + 4], 20, -405537848)
    a = md5gg(a, b, c, d, words[i + 9], 5, 568446438)
    d = md5gg(d, a, b, c, words[i + 14], 9, -1019803690)
    c = md5gg(c, d, a, b, words[i + 3], 14, -187363961)
    b = md5gg(b, c, d, a, words[i + 8], 20, 1163531501)
    a = md5gg(a, b, c, d, words[i + 13], 5, -1444681467)
    d = md5gg(d, a, b, c, words[i + 2], 9, -51403784)
    c = md5gg(c, d, a, b, words[i + 7], 14, 1735328473)
    b = md5gg(b, c, d, a, words[i + 12], 20, -1926607734)

    a = md5hh(a, b, c, d, words[i + 5], 4, -378558)
    d = md5hh(d, a, b, c, words[i + 8], 11, -2022574463)
    c = md5hh(c, d, a, b, words[i + 11], 16, 1839030562)
    b = md5hh(b, c, d, a, words[i + 14], 23, -35309556)
    a = md5hh(a, b, c, d, words[i + 1], 4, -1530992060)
    d = md5hh(d, a, b, c, words[i + 4], 11, 1272893353)
    c = md5hh(c, d, a, b, words[i + 7], 16, -155497632)
    b = md5hh(b, c, d, a, words[i + 10], 23, -1094730640)
    a = md5hh(a, b, c, d, words[i + 13], 4, 681279174)
    d = md5hh(d, a, b, c, words[i], 11, -358537222)
    c = md5hh(c, d, a, b, words[i + 3], 16, -722521979)
    b = md5hh(b, c, d, a, words[i + 6], 23, 76029189)
    a = md5hh(a, b, c, d, words[i + 9], 4, -640364487)
    d = md5hh(d, a, b, c, words[i + 12], 11, -421815835)
    c = md5hh(c, d, a, b, words[i + 15], 16, 530742520)
    b = md5hh(b, c, d, a, words[i + 2], 23, -995338651)

    a = md5ii(a, b, c, d, words[i], 6, -198630844)
    d = md5ii(d, a, b, c, words[i + 7], 10, 1126891415)
    c = md5ii(c, d, a, b, words[i + 14], 15, -1416354905)
    b = md5ii(b, c, d, a, words[i + 5], 21, -57434055)
    a = md5ii(a, b, c, d, words[i + 12], 6, 1700485571)
    d = md5ii(d, a, b, c, words[i + 3], 10, -1894986606)
    c = md5ii(c, d, a, b, words[i + 10], 15, -1051523)
    b = md5ii(b, c, d, a, words[i + 1], 21, -2054922799)
    a = md5ii(a, b, c, d, words[i + 8], 6, 1873313359)
    d = md5ii(d, a, b, c, words[i + 15], 10, -30611744)
    c = md5ii(c, d, a, b, words[i + 6], 15, -1560198380)
    b = md5ii(b, c, d, a, words[i + 13], 21, 1309151649)
    a = md5ii(a, b, c, d, words[i + 4], 6, -145523070)
    d = md5ii(d, a, b, c, words[i + 11], 10, -1120210379)
    c = md5ii(c, d, a, b, words[i + 2], 15, 718787259)
    b = md5ii(b, c, d, a, words[i + 9], 21, -343485551)

    a = md5SafeAdd(a, olda)
    b = md5SafeAdd(b, oldb)
    c = md5SafeAdd(c, oldc)
    d = md5SafeAdd(d, oldd)
  }

  return [a, b, c, d]
}

function md5BytesToWords(bytes: number[]): number[] {
  const words: number[] = []
  for (let i = 0; i < bytes.length * 8; i += 8) {
    words[i >> 5] = (words[i >> 5] || 0) | (bytes[i / 8] << (i % 32))
  }
  return words
}

function md5WordsToHex(words: number[]): string {
  const hex = '0123456789abcdef'
  let output = ''
  for (let i = 0; i < words.length * 4; i += 1) {
    const byte = (words[i >> 2] >> ((i % 4) * 8)) & 0xff
    output += hex.charAt((byte >> 4) & 0x0f) + hex.charAt(byte & 0x0f)
  }
  return output
}

export function md5(value: string): string {
  // TextEncoder keeps non-ASCII emails (and emoji) correct.
  const bytes = Array.from(new TextEncoder().encode(value))
  return md5WordsToHex(md5Words(md5BytesToWords(bytes), bytes.length * 8))
}


export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    default:
      return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'done':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'review':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    case 'todo':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    case 'backlog':
      return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300'
    default:
      return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300'
  }
}

export function getRoleColor(role: string): string {
  switch (role) {
    case 'owner':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    case 'admin':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'member':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'viewer':
      return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300'
    default:
      return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300'
  }
}