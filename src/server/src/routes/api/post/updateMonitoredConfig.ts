import { ApiHandler } from '../../../types'
import { logger } from '../../../helpers/logger'
import { updateMonitoredConfig } from '../../../helpers/monitoringDb'

const path: ApiHandler['path'] = '/monitored/config'

const handler: ApiHandler['handler'] = (req, res) => {
	try {
		const deemix = req.app.get('deemix')
		const config = updateMonitoredConfig(req.body || {}, deemix)
		res.send({ config })
	} catch (err: any) {
		logger.error(`Failed to update monitored config: ${err?.message || err}`)
		res.status(500).send({ error: 'Failed to update monitoring configuration' })
	}
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
