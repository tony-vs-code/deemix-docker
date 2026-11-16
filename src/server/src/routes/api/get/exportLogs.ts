import { ApiHandler } from '../../../types'
import { exportLogsText } from '../../../helpers/logDb'

const path: ApiHandler['path'] = '/logs/export'

const handler: ApiHandler['handler'] = async (_req, res) => {
	const text = exportLogsText()
	res.setHeader('Content-Type', 'text/plain; charset=utf-8')
	res.setHeader('Content-Disposition', `attachment; filename="deemix-logs-${new Date().toISOString().substring(0, 10)}.log"`)
	res.send(text)
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
