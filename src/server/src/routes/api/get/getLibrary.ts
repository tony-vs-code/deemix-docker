import { ApiHandler } from '../../../types'
import { logger } from '../../../helpers/logger'
import { getOrInitLibrary, scanLibrary } from '../../../helpers/libraryDb'

const pathEndpoint: ApiHandler['path'] = '/getLibrary'

const handler: ApiHandler['handler'] = async (req, res) => {
	try {
		const deemix = req.app.get('deemix')
		const settings = deemix?.getSettings()?.settings || deemix?.settings || {}
		const downloadLocation = settings.downloadLocation || '/downloads'

		const shouldRescan = req.query.rescan === 'true' || req.query.force === 'true'

		const libraryData = shouldRescan
			? await scanLibrary(downloadLocation, req.query.force === 'true')
			: await getOrInitLibrary(downloadLocation)

		res.send(libraryData)
	} catch (error) {
		logger.error(`Failed to get library: ${error}`)
		res.status(500).send({ error: 'Failed to access library' })
	}
}

const apiHandler: ApiHandler = { path: pathEndpoint, handler }

export default apiHandler
