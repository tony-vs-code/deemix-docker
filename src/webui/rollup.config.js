import fs from 'fs'
import path from 'path'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import alias from '@rollup/plugin-alias'
import analyze from 'rollup-plugin-analyzer'
import vue from 'rollup-plugin-vue'
import svg from 'rollup-plugin-svg'
import postcss from 'rollup-plugin-postcss'

const packageJson = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
)
const version = packageJson.version

const isProduction = !process.env.ROLLUP_WATCH
process.env.NODE_ENV = isProduction ? 'production' : 'development'
process.env.BROWSERSLIST_IGNORE_OLD_DATA = '1'

export default {
	input: 'src/app.js',
	output: [
		{
			file: isProduction ? 'public/js/bundle.temp.js' : 'public/js/bundle.js',
			format: 'es',
			sourcemap: !isProduction
		}
	],
	onwarn(warning, warn) {
		const isFromNodeModules = (w) => {
			const file = w.id || (w.loc && w.loc.file) || w.importer
			if (file && file.includes('node_modules')) return true
			if (w.cycle && w.cycle.some((p) => p.includes('node_modules'))) return true
			return false
		}

		if (
			(warning.code === 'THIS_IS_UNDEFINED' || warning.code === 'CIRCULAR_DEPENDENCY') &&
			isFromNodeModules(warning)
		) {
			return
		}
		warn(warning)
	},
	plugins: [
		alias({
			entries: [
				{
					find: 'vue',
					replacement: 'vue/dist/vue.esm'
				},
				{
					find: '@',
					replacement: path.resolve(__dirname, 'src')
				},
				{
					find: '@components',
					replacement: path.resolve(__dirname, 'src/components')
				}
			]
		}),
		// Needed for Vue imports
		replace({
			preventAssignment: true,
			values: {
				'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
				__VER__: JSON.stringify(version)
			}
		}),
		resolve({
			browser: true,
			preferBuiltins: false
		}), // Tells Rollup how to find imported modules in node_modules
		commonjs(), // Converts imported modules to ES modules, if necessary
		svg(),
		vue(),
		postcss(),
		isProduction && analyze({ summaryOnly: true, limit: 15 }) // Show useful information about bundles, only in production
	]
}
