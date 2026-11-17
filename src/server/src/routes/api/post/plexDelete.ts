import { ApiHandler } from '../../../types'
import { deletePlexItem, fetchPlexLibrary } from '../../../helpers/plex'
import { logger } from '../../../helpers/logger'

const path: ApiHandler['path'] = '/plex/delete'

const handler: ApiHandler['handler'] = async (req, res) => {
	try {
		const ratingKey = req.body?.ratingKey
		if (ratingKey === undefined || ratingKey === null || String(ratingKey).trim() === '') {
			return res.status(400).send({ success: false, error: 'Missing ratingKey parameter' })
		}

		const result = await deletePlexItem(String(ratingKey).trim())
		if (!result.success) {
			return res.status(400).send({ success: false, error: result.error || 'Failed to delete Plex item' })
		}

		const library = await fetchPlexLibrary(true)
		return res.send({ success: true, library })
	} catch (err: any) {
		const message = err?.message || 'Failed to delete Plex item'
		logger.error(`POST /api/plex/delete failed: ${message}`)
		return res.status(500).send({ success: false, error: message })
	}
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
