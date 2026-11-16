import { Server as WsServer } from 'ws'
import { logger } from '../../helpers/logger'
import { DeemixApp } from '../../app'

const eventName = 'clearFailedDownloads'

const cb = (_: any, __: any, ___: WsServer, deemix: DeemixApp) => {
	deemix.clearFailedDownloads()
	logger.info('Failed downloads cleared')
}

export default { eventName, cb }
