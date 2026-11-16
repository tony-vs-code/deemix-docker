import { Server as WsServer } from 'ws'
import { logger } from '../../helpers/logger'
import { DeemixApp } from '../../app'

const eventName = 'resumeQueue'

const cb = (_: any, __: any, ___: WsServer, deemix: DeemixApp) => {
	deemix.resumeQueue()
	logger.info('Queue resumed')
}

export default { eventName, cb }
