import {useNavigate} from 'react-router-dom'
import {TriangleAlert} from 'lucide-react'

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {GradientBorderFromTop} from '@/components/shared/GradientBorders'

import {useSettings} from '@/hooks/useSettings'
import {AVAILABLE_BITCOIN_KNOTS_VERSIONS, resolveVersion, type SelectedVersion} from '#settings'

export default function ConsensusRulesNotice() {
	const {data: settings, isLoading} = useSettings()
	const navigate = useNavigate()

	const resolved = settings?.version ? resolveVersion(settings.version as SelectedVersion) : undefined
	const versionIdx = resolved ? AVAILABLE_BITCOIN_KNOTS_VERSIONS.indexOf(resolved) : -1
	const introducedIdx = AVAILABLE_BITCOIN_KNOTS_VERSIONS.indexOf('v29.3.knots20260508')

	const isApplicableVersion = versionIdx !== -1 && versionIdx <= introducedIdx

	const open = !isLoading && !!settings && isApplicableVersion && settings.consensusrules !== true

	return (
		<Dialog open={open}>
			<DialogContent
				className='bg-card-gradient backdrop-blur-2xl border-white/10 border-[0.5px] rounded-2xl sm:max-w-[480px]'
				showCloseButton={false}
				// Prevent closing by clicking overlay or pressing Escape
				onPointerDownOutside={(e) => e.preventDefault()}
				onEscapeKeyDown={(e) => e.preventDefault()}
			>
				<GradientBorderFromTop />
				<DialogHeader className='items-center text-center gap-3 pt-2'>
					<div className='w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center'>
						<TriangleAlert className='w-6 h-6 text-amber-500' />
					</div>
					<DialogTitle className='text-white text-lg'>Consensus Rules Required</DialogTitle>
					<DialogDescription className='text-white/60 text-sm leading-relaxed'>
						Bitcoin Knots requires RDTS consensus rules to be enabled in order to start. Please enable RDTS in your
						settings to continue using your node.
					</DialogDescription>
				</DialogHeader>
				<div className='flex flex-col sm:flex-row gap-3 mt-2'>
					<Button
						className='flex-1 cursor-pointer rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-[13px] font-[500] border-0'
						onClick={() => window.open('https://bip110.org', '_blank', 'noopener,noreferrer')}
					>
						Learn More
					</Button>
					<Button
						className='flex-1 cursor-pointer rounded-full bg-button-gradient backdrop-blur-xl text-white/80 text-[13px] font-[500] relative'
						onClick={() => navigate('/settings?tab=version')}
					>
						<GradientBorderFromTop />
						Go to Settings
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
