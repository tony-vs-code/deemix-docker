import { ApiHandler } from '../../../types'
import { logger } from '../../../helpers/logger'
import { getMonitoredSummary } from '../../../helpers/monitoringDb'

const path: ApiHandler['path'] = '/monitored'

const handler: ApiHandler['handler'] = (_req, res) => {
	try {
		const summary = getMonitoredSummary()
		res.send(summary)
	} catch (err: any) {
		logger.error(`Failed to get monitored artists: ${err?.message || err}`)
		res.status(500).send({ error: 'Failed to load monitored artists' })
	}
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
