// @ts-expect-error
import { Deezer } from 'deezer-js'
import { ApiHandler } from '../../../types'
import { sessionDZ } from '../../../app'

const path: ApiHandler['path'] = '/resumeQueue'

const handler: ApiHandler['handler'] = (req, res) => {
	if (!sessionDZ[req.session.id]) sessionDZ[req.session.id] = new Deezer()
	const deemix = req.app.get('deemix')
	const dz = sessionDZ[req.session.id]
	deemix.resumeQueue(dz)
	res.send({ result: true, queuePaused: false })
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
