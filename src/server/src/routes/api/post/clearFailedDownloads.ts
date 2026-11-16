import { ApiHandler } from '../../../types'

const path: ApiHandler['path'] = '/clearFailedDownloads'

const handler: ApiHandler['handler'] = (req, res) => {
	const deemix = req.app.get('deemix')
	deemix.clearFailedDownloads()
	res.send({ result: true })
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
