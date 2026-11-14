const { execSync } = require('child_process')

function generateVersion(){
  if (process.env.DEEMIX_VERSION) {
    return process.env.DEEMIX_VERSION.trim();
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  try {
    const commitsNumber = String(execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })).trim()
    const commitHash = String(execSync('git rev-parse --short=10 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })).trim()
    return `${year}.${month}.${day}-r${commitsNumber}.${commitHash}`
  } catch (e) {
    return '2022.12.14-r222.5d447b6035'
  }
}

console.log(generateVersion())

module.exports = generateVersion
