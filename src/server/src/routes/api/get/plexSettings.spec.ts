import { appSendGet } from '../../../../tests/utils'

describe('plexSettings GET endpoint', () => {
	it('should return Plex settings object', async () => {
		const res = await appSendGet('/api/plex/settings')
		expect(res.status).toBe(200)
		expect(res.body).toHaveProperty('enabled')
		expect(res.body).toHaveProperty('serverUrl')
		expect(res.body).toHaveProperty('token')
		expect(res.body).toHaveProperty('sectionId')
		expect(res.body).toHaveProperty('autoScanOnComplete')
	})
})
