import {BitcoindManager} from './manager.js'
import {ensureConfig} from '../config/config.js'
import {getVersionFromRPC} from './rpc-client.js'

import type {BitcoindVersion, BitcoindStatus, BitcoindLifecycleResponse, ExitInfo} from '#types'
import type WebSocket from 'ws'

// Check if we should connect to an external bitcoind instance
const externalMode = process.env['BITCOIND_EXTERNAL_MODE'] === 'true'

// Single bitcoind manager instance that is used throughout the backend
export const bitcoind = new BitcoindManager({externalMode})

// Boot up bitcoind
export async function bootBitcoind(): Promise<void> {
	// Ensure that the bitcoind configuration files are written and up-to-date before starting bitcoind
	await ensureConfig()

	bitcoind.start()
}

// Public façade for the singleton BitcoindManager.
// Gives routes a one-liner API: `app.post('/restart', bitcoind.restart)`.

export const version = async (): Promise<BitcoindVersion> => {
	// Try to get version from RPC first (works for both external and local)
	const rpcVersion = await getVersionFromRPC()
	return rpcVersion
}

export const status = (): BitcoindStatus => bitcoind.status()

export const start = (): BitcoindLifecycleResponse => {
	if (status().running) return {...status(), result: 'no_op'}
	bitcoind.start()
	return {...status(), result: 'started'}
}

export const stop = async (): Promise<BitcoindLifecycleResponse> => {
	if (!status().running) return {...status(), result: 'no_op'}
	await bitcoind.stop()
	return {...status(), result: 'stopped'}
}

export const restart = async (): Promise<BitcoindLifecycleResponse> => {
	await bitcoind.restart()
	return {...status(), result: 'started'}
}

export const exitInfo = (): ExitInfo | null => bitcoind.exitInfo

export const events = () => bitcoind.events

// WebSocket stream for bitcoind exit events
export function wsExitStream(socket: WebSocket) {
	const send = (payload: unknown) => socket.send(JSON.stringify(payload))

	// Sends a snapshot immediately after the client connects
	send({
		type: 'snapshot',
		running: bitcoind.status().running,
		exit: bitcoind.exitInfo, // null if never crashed
	})

	// Pushes "exit" events whenever bitcoind stops unexpectedly
	const handler = (info: ExitInfo) => send({type: 'exit', ...info})

	bitcoind.events.on('exit', handler)
	socket.on('close', () => bitcoind.events.off('exit', handler))
}
