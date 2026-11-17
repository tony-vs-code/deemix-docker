const fs = require('fs')
const path = require('path')
const vm = require('vm')

const bundlePath = path.resolve(__dirname, '../public/js/bundle.js')
const code = fs.readFileSync(bundlePath, 'utf8')

const noop = () => ({
	addEventListener: () => {},
	removeEventListener: () => {},
	setAttribute: () => {},
	style: {},
	classList: { add: () => {}, remove: () => {} },
	remove: () => {}
})

let domReadyCb = null
const ctx = {
	console,
	setTimeout,
	clearTimeout,
	setInterval,
	clearInterval,
	window: {},
	location: {
		base: '/',
		origin: 'http://localhost:6595',
		pathname: '/',
		search: '',
		hash: '',
		href: 'http://localhost:6595/',
		replace: () => {}
	},
	navigator: { userAgent: 'node-smoke-test' },
	localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
	document: {
		addEventListener: (ev, cb) => {
			if (ev === 'DOMContentLoaded') domReadyCb = cb
		},
		removeEventListener: () => {},
		getElementById: noop,
		createElement: () => ({ ...noop(), appendChild: () => {}, getElementsByTagName: () => [] }),
		createTextNode: () => ({}),
		getElementsByTagName: () => [],
		head: { appendChild: () => {} },
		body: { appendChild: () => {} },
		querySelector: noop,
		querySelectorAll: () => [],
		documentElement: { style: {}, dataset: {} }
	},
	WebSocket: class {
		addEventListener() {}
		send() {}
		close() {}
	},
	fetch: async () => ({ json: async () => ({}) }),
	URL,
	URLSearchParams,
	CustomEvent: function () {},
	Event: function () {},
	Element: function () {},
	HTMLElement: function () {},
	Node: function () {}
}

ctx.window = ctx
ctx.self = ctx
ctx.globalThis = ctx

vm.runInNewContext(code, ctx)

if (typeof domReadyCb !== 'function') {
	throw new Error('DOMContentLoaded callback was not registered by bundle.js')
}

console.log('bundle.js runtime smoke test PASSED')
