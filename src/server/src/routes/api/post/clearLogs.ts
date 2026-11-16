import { ApiHandler } from '../../../types'
import { clearLogs } from '../../../helpers/logDb'

const path: ApiHandler['path'] = '/logs/clear'

const handler: ApiHandler['handler'] = async (_req, res) => {
	clearLogs()
	res.send({ success: true })
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
