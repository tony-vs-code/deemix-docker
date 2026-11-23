import { ApiHandler } from '../../../types'
import { logger } from '../../../helpers/logger'
import { removeMonitoredArtist } from '../../../helpers/monitoringDb'

const path: ApiHandler['path'] = '/monitored/remove'

const handler: ApiHandler['handler'] = (req, res) => {
	try {
		const deemix = req.app.get('deemix')
		const id = req.body?.id != null ? String(req.body.id).trim() : ''
		if (!id) {
			return res.status(400).send({ error: 'Artist id is required' })
		}

		const { artists, totalMissing } = removeMonitoredArtist(id, deemix)
		return res.send({ artists, totalMissing })
	} catch (err: any) {
		logger.error(`Failed to remove monitored artist: ${err?.message || err}`)
		return res.status(500).send({ error: 'Failed to remove monitored artist' })
	}
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
