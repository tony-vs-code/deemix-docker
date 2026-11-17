import { ApiHandler } from '../../../types'
import { triggerPlexScan } from '../../../helpers/plex'

const path: ApiHandler['path'] = '/plex/scan'

const handler: ApiHandler['handler'] = async (req, res) => {
	const override = req.body || {}
	const result = await triggerPlexScan(override)
	res.send(result)
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
