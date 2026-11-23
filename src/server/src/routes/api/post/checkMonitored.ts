import { ApiHandler } from '../../../types'
import { logger } from '../../../helpers/logger'
import { resolveSessionDz } from '../../../helpers/sessionDz'
import { checkAllMonitoredArtists, checkMonitoredArtist, getMonitoredSummary } from '../../../helpers/monitoringDb'

const path: ApiHandler['path'] = '/monitored/check'

const handler: ApiHandler['handler'] = async (req, res) => {
	try {
		const deemix = req.app.get('deemix')
		const activeDz = resolveSessionDz(req, deemix)
		const id = req.body?.id != null ? String(req.body.id).trim() : ''

		if (id) {
			await checkMonitoredArtist(id, activeDz, deemix)
			return res.send(getMonitoredSummary())
		}

		const summary = await checkAllMonitoredArtists(activeDz, deemix, false)
		return res.send(summary)
	} catch (err: any) {
		logger.error(`Failed to check monitored artists: ${err?.message || err}`)
		return res.status(500).send({ error: err?.message || 'Failed to check monitored artists' })
	}
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
