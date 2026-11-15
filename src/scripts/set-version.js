const fs = require('fs')
const path = require('path')
const generateVersion = require('./gen-version.js')

const packagePath = path.join(__dirname, '..', 'package.json')
let package = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
package.version = generateVersion()
fs.writeFileSync(packagePath, JSON.stringify(package, null, 2) + "\n")
