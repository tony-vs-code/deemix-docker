import { ApiHandler } from '../../../types'
import { logger } from '../../../helpers/logger'
import { searchLibrary } from '../../../helpers/libraryDb'

const pathEndpoint: ApiHandler['path'] = '/searchLibrary'

const handler: ApiHandler['handler'] = async (req, res) => {
	try {
		const deemix = req.app.get('deemix')
		const settings = deemix?.getSettings()?.settings || deemix?.settings || {}
		const downloadLocation = settings.downloadLocation || '/downloads'

		const query = String(req.query.query || req.query.q || '')
		const type = String(req.query.type || 'all')
		const sortBy = String(req.query.sortBy || 'title_asc')
		const page = Number(req.query.page) || 1
		const limit = Number(req.query.limit) || 0

		const result = await searchLibrary(downloadLocation, {
			query,
			type,
			sortBy,
			page,
			limit
		})

		res.send(result)
	} catch (error) {
		logger.error(`Failed to search library: ${error}`)
		res.status(500).send({ error: 'Failed to search library' })
	}
}

const apiHandler: ApiHandler = { path: pathEndpoint, handler }

export default apiHandler
