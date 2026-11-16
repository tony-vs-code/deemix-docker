import { ApiHandler } from '../../../types'

const path: ApiHandler['path'] = '/pauseQueue'

const handler: ApiHandler['handler'] = (req, res) => {
	const deemix = req.app.get('deemix')
	deemix.pauseQueue()
	res.send({ result: true, queuePaused: true })
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
