const fs = require('fs')
const path = require('path')

const changelog = path.join(__dirname, '..', 'CHANGELOG.md')
const msg = process.argv.slice(2).join(' ').trim()

if (!msg) {
  console.error('Usage: node scripts/appendLog.js "Your message here"')
  process.exit(1)
}

const now = new Date().toISOString().replace('T', ' ').slice(0, 16)
const entry = `- ${now} — ${msg}\n`

fs.appendFileSync(changelog, entry)
console.log('Appended to CHANGELOG.md:')
console.log(entry)
