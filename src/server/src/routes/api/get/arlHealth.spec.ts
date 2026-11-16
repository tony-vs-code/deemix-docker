import { appSendGet } from '../../../../tests/utils'

describe('arlHealth request', () => {
	it('should return health diagnostics object', async () => {
		const res = await appSendGet('/api/arlHealth')
		expect(res.status).toBe(200)
		expect(res.body).toHaveProperty('valid')
		expect(res.body).toHaveProperty('hasArl')
		expect(res.body).toHaveProperty('source')
		expect(res.body).toHaveProperty('tier')
		expect(res.body).toHaveProperty('canStreamLossless')
		expect(res.body).toHaveProperty('canStreamHq')
		expect(res.body).toHaveProperty('estimatedTotalDays', 90)
		expect(res.body).toHaveProperty('expiringSoon')
	})

	it('should handle verify parameter gracefully', async () => {
		const res = await appSendGet('/api/arlHealth?verify=true')
		expect(res.status).toBe(200)
		expect(res.body).toHaveProperty('valid')
		expect(res.body).toHaveProperty('deezerReachable')
	})
})
