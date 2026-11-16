import { Server as WsServer } from 'ws'
import { logger } from '../../helpers/logger'
import { DeemixApp } from '../../app'

const eventName = 'pauseQueue'

const cb = (_: any, __: any, ___: WsServer, deemix: DeemixApp) => {
	deemix.pauseQueue()
	logger.info('Queue paused')
}

export default { eventName, cb }
