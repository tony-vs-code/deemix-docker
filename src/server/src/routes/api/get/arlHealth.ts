import fs from 'fs'
import { ApiHandler, ArlHealthResponse } from '../../../types'
import { getLoginCredentials, configFolder } from '../../../helpers/loginStorage'
import { sessionDZ } from '../../../app'

const path: ApiHandler['path'] = '/arlHealth'

const handler: ApiHandler['handler'] = async (req, res) => {
	const dz = req.session ? sessionDZ[req.session.id] : null
	const creds = getLoginCredentials()
	const envArl = process.env.ARL && process.env.ARL.trim().length > 0 ? process.env.ARL.trim() : null
	const savedArl = creds?.arl && creds.arl.trim().length > 0 ? creds.arl.trim() : null

	const valid = Boolean(dz?.logged_in)
	const hasArl = Boolean(valid || savedArl || envArl)

	let source: 'env' | 'saved' | 'session' | 'none' = 'none'
	if (envArl && (savedArl === envArl || (!savedArl && valid) || !savedArl)) {
		source = 'env'
	} else if (savedArl) {
		source = 'saved'
	} else if (valid) {
		source = 'session'
	} else {
		source = 'none'
	}

	let tier: 'hifi' | 'premium' | 'free' | 'unknown' = 'unknown'
	if (valid) {
		if (dz?.current_user?.can_stream_lossless) {
			tier = 'hifi'
		} else if (dz?.current_user?.can_stream_hq) {
			tier = 'premium'
		} else {
			tier = 'free'
		}
	}

	const canStreamLossless = Boolean(dz?.current_user?.can_stream_lossless)
	const canStreamHq = Boolean(dz?.current_user?.can_stream_hq)

	let arlUpdatedAt: number | null = null
	if (savedArl) {
		if (typeof creds.arlUpdatedAt === 'number') {
			arlUpdatedAt = creds.arlUpdatedAt
		} else {
			try {
				const loginPath = configFolder.endsWith('/') || configFolder.endsWith('\\')
					? `${configFolder}login.json`
					: `${configFolder}/login.json`
				if (fs.existsSync(loginPath)) {
					arlUpdatedAt = Math.round(fs.statSync(loginPath).mtimeMs)
				}
			} catch {
				arlUpdatedAt = null
			}
		}
	}

	const estimatedTotalDays = 90
	let estimatedRemainingDays: number | null = null
	if (arlUpdatedAt !== null) {
		const diffMs = Date.now() - arlUpdatedAt
		const diffDays = diffMs / (1000 * 60 * 60 * 24)
		estimatedRemainingDays = Math.max(0, Math.min(estimatedTotalDays, Math.round(estimatedTotalDays - diffDays)))
	}

	const expiringSoon = estimatedRemainingDays !== null && estimatedRemainingDays <= 14

	const responseData: ArlHealthResponse = {
		valid,
		hasArl,
		source,
		tier,
		canStreamLossless,
		canStreamHq,
		arlUpdatedAt,
		estimatedTotalDays,
		estimatedRemainingDays,
		expiringSoon
	}

	if (req.query && req.query.verify === 'true') {
		if (valid) {
			try {
				let reachable = true
				const deemix = req.app.get('deemix')
				if (deemix && typeof deemix.isDeezerAvailable === 'function') {
					const avail = await deemix.isDeezerAvailable()
					if (avail === 'no-network' || avail === 'no') {
						reachable = false
					}
				}
				if (dz?.api && typeof dz.api.get_user_data === 'function') {
					const userData = await dz.api.get_user_data()
					if (!userData || userData.error) {
						reachable = false
					}
				}
				responseData.deezerReachable = reachable
			} catch {
				responseData.deezerReachable = false
			}
		} else {
			responseData.deezerReachable = false
		}
	}

	res.send(responseData)
}

const apiHandler: ApiHandler = { path, handler }

export default apiHandler
