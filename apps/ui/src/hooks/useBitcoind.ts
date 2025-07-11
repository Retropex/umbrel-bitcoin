import {useQuery} from '@tanstack/react-query'
import {api} from '@/lib/api'
import type {BitcoindStatus, BitcoindVersion} from '#types'

// TODO: settle on cache times
export function useBitcoindVersion() {
	return useQuery({
		queryKey: ['bitcoind', 'version'],
		queryFn: () => api<BitcoindVersion>('/bitcoind/version'),
		// refetchInterval: 5_000,
		staleTime: Infinity, // never changes until user updates
	})
}

export function useBitcoindStatus() {
	return useQuery({
		queryKey: ['bitcoind', 'status'],
		queryFn: () => api<BitcoindStatus>('/bitcoind/status'),
		refetchInterval: 5_000,
		staleTime: 2_500,
	})
}
