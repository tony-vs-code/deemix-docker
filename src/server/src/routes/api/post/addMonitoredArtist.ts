import { ApiHandler } from '../../../types'
import { logger } from '../../../helpers/logger'
import { resolveSessionDz } from '../../../helpers/sessionDz'
import { addOrUpdateMonitoredArtist, checkMonitoredArtist, getMonitoredSummary } from '../../../helpers/monitoringDb'

const path: ApiHandler['path'] = '/monitored/artist'

const handler: ApiHandler['handler'] = async (req, res) => {
	try {
		const deemix = req.app.get('deemix')
		const body = req.body || {}
		const id = body.id != null ? String(body.id).trim() : ''

		if (!id) {
			return res.status(400).send({ error: 'Artist id is required' })
		}

		const activeDz = resolveSessionDz(req, deemix)

		const artist = addOrUpdateMonitoredArtist(
			{
				id,
				name: body.name,
				picture: body.picture,
				monitored: body.monitored
			},
			deemix
		)

		if (activeDz?.logged_in && artist.monitored !== false) {
			try {
				await checkMonitoredArtist(artist.id, activeDz, deemix)
			} catch (checkErr: any) {
				logger.warn(`[Monitoring] Initial check failed for artist ${artist.id}: ${checkErr?.message || checkErr}`)
			}
		}

		const { artists, totalMissing } = getMonitoredSummary()
		return res.send({ artists, totalMissing })
	} catch (err: any) {
		logger.error(`Failed to add monitored artist: ${err?.message || err}`)
		return res.status(500).send({ error: 'Failed to add monitored artist' })
	}
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
