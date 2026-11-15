const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function findVersionFile() {
  let currentDir = __dirname
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(currentDir, 'version')
    if (fs.existsSync(candidate)) {
      try {
        const content = fs.readFileSync(candidate, 'utf8').trim()
        if (content) return content
      } catch (_) {}
    }
    const parent = path.dirname(currentDir)
    if (parent === currentDir) break
    currentDir = parent
  }
  return null
}

function generateVersion() {
  if (process.env.DEEMIX_VERSION && process.env.DEEMIX_VERSION.trim()) {
    return process.env.DEEMIX_VERSION.trim()
  }

  const baseVersion = findVersionFile()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const dateStr = `${year}.${month}.${day}`

  try {
    const commitsNumber = String(execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })).trim()
    const commitHash = String(execSync('git rev-parse --short=10 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })).trim()
    if (commitsNumber && commitHash) {
      const prefix = baseVersion || dateStr
      return `${prefix}-r${commitsNumber}.${commitHash}`
    }
  } catch (e) {
    // git absent (e.g. inside docker build context) or failed
  }

  if (baseVersion) {
    return baseVersion
  }

  return dateStr
}

console.log(generateVersion())

module.exports = generateVersion
