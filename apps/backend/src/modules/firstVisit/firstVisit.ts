import {readFile, writeFile} from 'node:fs/promises'
import {ensureFile} from 'fs-extra'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {APP_STATE_DIR} from '../../lib/paths.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIRST_VISIT_FILE = path.join(APP_STATE_DIR, 'visit.json')

interface FirstVisitData {
	hasVisited: boolean
}

export async function checkAndMarkFirstVisit(): Promise<{isFirstVisit: boolean}> {
	try {
		await ensureFile(FIRST_VISIT_FILE)

		const fileContent = await readFile(FIRST_VISIT_FILE, 'utf-8')
		const data = JSON.parse(fileContent) as FirstVisitData

		if (data.hasVisited == true){
			return {isFirstVisit: false}
		} else {
			return {isFirstVisit: true}
		}
	} catch {
		const data: FirstVisitData = {
			hasVisited: true,
		}

		try {
			await writeFile(FIRST_VISIT_FILE, JSON.stringify(data, null, 2))
		} catch (error) {
			console.error('Failed to write first visit marker:', error)
		}

		return {isFirstVisit: true}
	}
}
