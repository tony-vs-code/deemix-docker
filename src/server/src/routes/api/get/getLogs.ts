import { ApiHandler } from '../../../types'
import { getLogs } from '../../../helpers/logDb'

const path: ApiHandler['path'] = '/logs'

const handler: ApiHandler['handler'] = async (req, res) => {
	const deemix = req.app.get('deemix')
	const level = req.query.level ? String(req.query.level) : undefined
	const search = req.query.search ? String(req.query.search) : undefined
	const limit = req.query.limit ? Number(req.query.limit) : undefined
	const offset = req.query.offset ? Number(req.query.offset) : undefined

	const result = getLogs({ level, search, limit, offset })
	const permissions = deemix ? deemix.checkPermissions() : null

	res.send({
		...result,
		permissions
	})
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
