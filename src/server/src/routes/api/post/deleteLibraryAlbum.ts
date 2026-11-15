import { ApiHandler } from '../../../types'
import { logger } from '../../../helpers/logger'
import { deleteLibraryAlbum } from '../../../helpers/libraryDb'

const pathEndpoint: ApiHandler['path'] = '/deleteLibraryAlbum'

const handler: ApiHandler['handler'] = async (req, res) => {
	try {
		const deemix = req.app.get('deemix')
		const settings = deemix?.getSettings()?.settings || deemix?.settings || {}
		const downloadLocation = settings.downloadLocation || '/downloads'

		const albumPath = req.body?.albumPath
		if (!albumPath || typeof albumPath !== 'string') {
			return res.status(400).send({ success: false, error: 'Missing albumPath parameter' })
		}

		const result = await deleteLibraryAlbum(albumPath, downloadLocation)
		if (!result.success) {
			return res.status(400).send({ success: false, error: result.error })
		}

		deemix?.listener?.send('libraryUpdated', result.library)
		res.send({ success: true, library: result.library })
	} catch (error) {
		logger.error(`Failed to delete library album: ${error}`)
		res.status(500).send({ success: false, error: 'Internal server error' })
	}
}

const apiHandler: ApiHandler = { path: pathEndpoint, handler }

export default apiHandler
