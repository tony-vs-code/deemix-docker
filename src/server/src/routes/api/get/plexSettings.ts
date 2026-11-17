import { ApiHandler } from '../../../types'
import { getPlexSettings } from '../../../helpers/plex'

const path: ApiHandler['path'] = '/plex/settings'

const handler: ApiHandler['handler'] = (_req, res) => {
	res.send(getPlexSettings())
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
