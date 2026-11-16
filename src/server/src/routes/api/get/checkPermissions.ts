import { ApiHandler } from '../../../types'

const path: ApiHandler['path'] = '/checkPermissions'

const handler: ApiHandler['handler'] = async (req, res) => {
	const deemix = req.app.get('deemix')
	const perms = deemix.checkPermissions()
	res.send(perms)
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
