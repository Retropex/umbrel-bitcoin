import Client from 'bitcoin-core'

export const rpcClient = new Client({
	host: `http://${process.env['BITCOIND_IP'] || '127.0.0.1'}:${process.env['RPC_PORT'] || '8332'}`,
	username: process.env['RPC_USER'] || 'umbrel',
	password: process.env['RPC_PASS'] || 'moneyprintergobrrr',
})

// Type for getgeneralinfo RPC response
export type GeneralInfo = {
	subversion: string
}

// Helper function to get version info from RPC
export async function getVersionFromRPC(): Promise<{implementation: string; version: string}> {
	try {
		const info = await rpcClient.command<GeneralInfo>('getnetworkinfo')
		
		// Extract implementation from useragent (e.g., "/Satoshi:29.2.0/Knots:20251010/" -> "Bitcoin Knots")
		const subversion = info.subversion || ''
		const implementation = subversion.includes('Knots') ? 'Bitcoin Knots' : 'Bitcoin Core'
		
		// Use clientversion directly (e.g., "v29.2.0.knots20251010")
		const version = info.subversion || 'unknown'
		
		return {implementation, version}
	} catch (error) {
		console.error('[rpc-client] Failed to get version from RPC:', error)
		return {implementation: 'unknown', version: 'unknown'}
	}
}
