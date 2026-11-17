import { ApiHandler } from '../../../types'
import { testPlexConnection } from '../../../helpers/plex'

const path: ApiHandler['path'] = '/plex/test'

const handler: ApiHandler['handler'] = async (req, res) => {
	const { serverUrl, token } = req.body || {}
	const result = await testPlexConnection(serverUrl, token)
	res.send(result)
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
