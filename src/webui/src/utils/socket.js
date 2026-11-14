class CustomSocket extends WebSocket {
	constructor(args) {
		super(args)
		this.listeners = {}

		this.addEventListener('message', event => {
			try {
				const messageData = JSON.parse(event.data)
				if (messageData && messageData.key && this.listeners[messageData.key]) {
					this.listeners[messageData.key].forEach(cb => {
						try {
							cb(messageData.data)
						} catch (err) {
							console.error(`Error in socket listener for ${messageData.key}:`, err)
						}
					})
				}
			} catch (e) {
				console.error('Socket parse error:', e)
			}
		})
	}

	emit(key, data) {
		if (this.readyState !== WebSocket.OPEN) return false

		this.send(JSON.stringify({ key, data }))
	}

	on(key, cb) {
		if (!this.listeners[key]) {
			this.listeners[key] = []
		}
		if (!this.listeners[key].includes(cb)) {
			this.listeners[key].push(cb)
		}
	}

	off(key, cb) {
		if (this.listeners[key]) {
			if (cb) {
				this.listeners[key] = this.listeners[key].filter(fn => fn !== cb)
				if (this.listeners[key].length === 0) {
					delete this.listeners[key]
				}
			} else {
				delete this.listeners[key]
			}
		}
	}
}

export const socket = new CustomSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + location.base)
