import { ApiHandler } from '../../../types'
import { logger } from '../../../helpers/logger'
import { resolveSessionDz } from '../../../helpers/sessionDz'
import { getMonitoredData } from '../../../helpers/monitoringDb'

const path: ApiHandler['path'] = '/monitored/downloadMissing'

const handler: ApiHandler['handler'] = async (req, res) => {
	const deemix = req.app.get('deemix')
	const activeDz = resolveSessionDz(req, deemix)
	const body = req.body || {}
	const monitoredData = getMonitoredData()

	let links: string[] = []
	if (Array.isArray(body.links)) {
		links = body.links.map((l: any) => String(l || '').trim()).filter(Boolean)
	} else if (body.artistId != null) {
		const target = monitoredData.artists.find(a => String(a.id) === String(body.artistId).trim())
		if (target) {
			links = target.missingReleases.map(r => r.link).filter(Boolean)
		}
	}

	links = Array.from(new Set(links))

	if (links.length === 0) {
		return res.status(400).send({ result: false, error: 'No release links provided', queued: 0 })
	}

	let bitrate = body.bitrate
	if (bitrate === undefined || bitrate === null || bitrate === 'null') {
		bitrate = monitoredData.config.bitrate ?? deemix?.getSettings?.()?.settings?.maxBitrate ?? 9
	}
	bitrate = Number(bitrate)

	let obj: any
	try {
		obj = await deemix.addToQueue(activeDz, links, bitrate)
	} catch (e: any) {
		res.send({ result: false, errid: e?.name, data: { links, bitrate } })
		switch (e?.name) {
			case 'NotLoggedIn':
				deemix?.listener?.send('queueError' + e.name)
				break
			case 'CantStream':
				deemix?.listener?.send('queueError' + e.name, e.bitrate)
				break
			default:
				logger.error(e)
				break
		}
		return
	}

	return res.send({
		result: true,
		queued: Array.isArray(obj) ? obj.length : 0,
		data: { links, bitrate, obj }
	})
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
