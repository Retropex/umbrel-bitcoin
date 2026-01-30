import {useEffect, useState} from 'react'

export function useFirstVisit(): boolean {
	const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false)
	const [isHydrated, setIsHydrated] = useState<boolean>(false)

	useEffect(() => {
		const checkFirstVisit = async () => {
			try {
				const response = await fetch('/api/first-visit/check')
				const data = (await response.json()) as {isFirstVisit: boolean}
				setIsFirstVisit(data.isFirstVisit)
			} catch (error) {
				console.error('Failed to check first visit status:', error)
				setIsFirstVisit(false)
			} finally {
				setIsHydrated(true)
			}
		}

		checkFirstVisit()
	}, [])

	return isHydrated && isFirstVisit
}