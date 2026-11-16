import { ApiHandler, Settings, SpotifySettings } from '../../../types'
import { sessionDZ } from '../../../app'

const path = '/saveSettings'

export interface SaveSettingsData {
	settings: Settings
	spotifySettings: SpotifySettings
}

const handler: ApiHandler['handler'] = (req, res) => {
	const deemix = req.app.get('deemix')
	const queryData: any = req.body?.settings ? req.body : req.query
	const { settings, spotifySettings }: SaveSettingsData = queryData
	if (req.session?.id && sessionDZ[req.session.id]) {
		deemix.lastDZ = sessionDZ[req.session.id]
	}
	deemix.saveSettings(settings, spotifySettings)
	deemix.listener.send('updateSettings', { settings, spotifySettings })
	res.send({ result: true })
}

const apiHandler = { path, handler }

export default apiHandler
