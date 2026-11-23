import type { Request } from 'express'
// @ts-expect-error
import { Deezer } from 'deezer-js'
import { sessionDZ } from '../app'

/**
 * Resolves the active Deezer client for an Express request, preferring the session's
 * logged-in instance, then deemix.lastDZ, or falling back to a fresh Deezer client.
 */
export function resolveSessionDz(req: Request<any, any, any, any>, deemix?: any): any {
	let dz: any = null
	if (req.session && req.session.id) {
		if (!sessionDZ[req.session.id]) sessionDZ[req.session.id] = new Deezer()
		dz = sessionDZ[req.session.id]
	}

	if (dz?.logged_in && deemix && !deemix.lastDZ) {
		deemix.lastDZ = dz
	}

	if (dz?.logged_in) return dz
	if (deemix?.lastDZ?.logged_in) return deemix.lastDZ
	return dz || new Deezer()
}
