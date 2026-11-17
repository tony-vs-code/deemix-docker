import { ApiHandler } from '../../../types'
import { savePlexSettings } from '../../../helpers/plex'

const path: ApiHandler['path'] = '/plex/settings'

const handler: ApiHandler['handler'] = (req, res) => {
	const partial = req.body || {}
	const updated = savePlexSettings(partial)
	res.send(updated)
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
