import fs from 'fs'
import path from 'path'
// @ts-expect-error
import deemix from 'deemix'

export interface LogRecord {
	id: number
	timestamp: string
	level: 'info' | 'warn' | 'error' | 'debug' | string
	message: string
	meta?: any
}

export interface GetLogsOptions {
	level?: string
	search?: string
	limit?: number
	offset?: number
}

export interface GetLogsResult {
	logs: LogRecord[]
	total: number
	counts: {
		all: number
		info: number
		warn: number
		error: number
		debug: number
	}
}

const MAX_LOG_ENTRIES = 2000
const configFolder: string = deemix.utils.localpaths.getConfigFolder()
const logsDbPath: string = path.join(configFolder, 'logs.json')

let logsMemory: LogRecord[] = []
let nextId = 1
let isInitialized = false
let saveTimer: NodeJS.Timeout | null = null

function initLogDb() {
	if (isInitialized) return
	isInitialized = true

	try {
		if (fs.existsSync(logsDbPath)) {
			const data = fs.readFileSync(logsDbPath, 'utf8')
			const parsed = JSON.parse(data)
			if (Array.isArray(parsed)) {
				logsMemory = parsed.slice(-MAX_LOG_ENTRIES)
				if (logsMemory.length > 0) {
					nextId = Math.max(...logsMemory.map(l => l.id || 0)) + 1
				}
			}
		}
	} catch {
		logsMemory = []
	}
}

function scheduleDiskSave() {
	if (saveTimer) return
	saveTimer = setTimeout(() => {
		saveTimer = null
		flushLogsToDisk()
	}, 800)
}

export function flushLogsToDisk(): void {
	try {
		if (!fs.existsSync(configFolder)) {
			fs.mkdirSync(configFolder, { recursive: true })
		}
		const tmp = `${logsDbPath}.${Date.now()}.tmp`
		fs.writeFileSync(tmp, JSON.stringify(logsMemory, null, 2), 'utf8')
		fs.renameSync(tmp, logsDbPath)
	} catch {
		// Ignore disk logging errors to avoid crash loops
	}
}

export function addLog(level: string, message: string, meta?: any): void {
	initLogDb()

	const record: LogRecord = {
		id: nextId++,
		timestamp: new Date().toISOString(),
		level: (level || 'info').toLowerCase(),
		message: typeof message === 'string' ? message : JSON.stringify(message),
		meta: meta && Object.keys(meta).length > 0 ? meta : undefined
	}

	logsMemory.push(record)

	if (logsMemory.length > MAX_LOG_ENTRIES) {
		logsMemory = logsMemory.slice(-MAX_LOG_ENTRIES)
	}

	scheduleDiskSave()
}

export function getLogs(options: GetLogsOptions = {}): GetLogsResult {
	initLogDb()

	const levelFilter = (options.level || 'all').toLowerCase()
	const search = (options.search || '').toLowerCase().trim()
	const limit = Math.max(1, Math.min(options.limit || 100, 500))
	const offset = Math.max(0, options.offset || 0)

	// Compute counts
	const counts = {
		all: logsMemory.length,
		info: 0,
		warn: 0,
		error: 0,
		debug: 0
	}

	for (let i = 0; i < logsMemory.length; i++) {
		const l = logsMemory[i].level
		if (l === 'info') counts.info++
		else if (l === 'warn') counts.warn++
		else if (l === 'error') counts.error++
		else if (l === 'debug') counts.debug++
	}

	// Filter
	let filtered = logsMemory
	if (levelFilter !== 'all') {
		filtered = filtered.filter(l => l.level === levelFilter)
	}

	if (search) {
		filtered = filtered.filter(l =>
			l.message.toLowerCase().includes(search) ||
			l.timestamp.toLowerCase().includes(search)
		)
	}

	// Newest first
	const sorted = filtered.slice().reverse()
	const paginated = sorted.slice(offset, offset + limit)

	return {
		logs: paginated,
		total: filtered.length,
		counts
	}
}

export function clearLogs(): void {
	initLogDb()
	logsMemory = []
	nextId = 1

	if (saveTimer) {
		clearTimeout(saveTimer)
		saveTimer = null
	}

	try {
		if (fs.existsSync(logsDbPath)) {
			fs.writeFileSync(logsDbPath, '[]', 'utf8')
		}
	} catch {
		// Ignore
	}
}

export function exportLogsText(): string {
	initLogDb()
	return logsMemory
		.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}${l.meta ? ' ' + JSON.stringify(l.meta) : ''}`)
		.join('\n')
}

process.once('beforeExit', () => flushLogsToDisk())
