// Load .env into process.env (without overriding real env vars). Imported first by index.js.
import fs from 'node:fs'
import path from 'node:path'
try {
  for (const line of fs.readFileSync(path.resolve('.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch { /* no .env */ }
