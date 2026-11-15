import { ApiHandler } from '../../../types'
import { logger } from '../../../helpers/logger'
import { scanLibrary } from '../../../helpers/libraryDb'

const pathEndpoint: ApiHandler['path'] = '/scanLibrary'

const handler: ApiHandler['handler'] = (req, res) => {
	try {
		const deemix = req.app.get('deemix')
		const settings = deemix?.getSettings()?.settings || deemix?.settings || {}
		const downloadLocation = settings.downloadLocation || '/downloads'
		const force = req.body?.force === true

		const libraryData = scanLibrary(downloadLocation, force)
		deemix?.listener?.send('libraryUpdated', libraryData)

		res.send({ success: true, library: libraryData })
	} catch (error) {
		logger.error(`Failed to scan library: ${error}`)
		res.status(500).send({ error: 'Failed to scan library' })
	}
}

const apiHandler: ApiHandler = { path: pathEndpoint, handler }

export default apiHandler
