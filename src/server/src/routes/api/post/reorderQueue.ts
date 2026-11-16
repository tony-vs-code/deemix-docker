import { ApiHandler } from '../../../types'

const path: ApiHandler['path'] = '/reorderQueue'

const handler: ApiHandler['handler'] = (req, res) => {
	const deemix = req.app.get('deemix')
	const newOrder = req.body?.newOrder || req.query?.newOrder || req.body?.queueOrder || req.query?.queueOrder
	const uuid = req.body?.uuid || req.query?.uuid
	const direction = req.body?.direction || req.query?.direction

	if (Array.isArray(newOrder)) {
		deemix.reorderQueue(newOrder)
		res.send({ result: true, queueOrder: deemix.queueOrder })
	} else if (uuid && (direction === 'up' || direction === 'down')) {
		deemix.moveQueueItem(uuid, direction)
		res.send({ result: true, queueOrder: deemix.queueOrder })
	} else {
		res.send({ result: false, error: 'Invalid parameters for reorderQueue' })
	}
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
