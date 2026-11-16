import { Server as WsServer } from 'ws'
import { logger } from '../../helpers/logger'
import { DeemixApp } from '../../app'

const eventName = 'reorderQueue'

const cb = (data: any, _: any, ___: WsServer, deemix: DeemixApp) => {
	if (Array.isArray(data)) {
		deemix.reorderQueue(data)
	} else if (data?.newOrder && Array.isArray(data.newOrder)) {
		deemix.reorderQueue(data.newOrder)
	} else if (data?.uuid && (data.direction === 'up' || data.direction === 'down')) {
		deemix.moveQueueItem(data.uuid, data.direction)
	}
	logger.info('Queue order updated via websocket')
}

export default { eventName, cb }
