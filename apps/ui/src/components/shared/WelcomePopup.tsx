import {useState} from 'react'
import {motion, AnimatePresence} from 'framer-motion'
import {X} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {cn} from '@/lib/utils'

interface WelcomePopupProps {
	isOpen: boolean
	onClose: () => void
	title?: string
	description?: string
	className?: string
}

export default function WelcomePopup({
	isOpen,
	onClose,
	title = 'BIP 110 soft-fork signaling',
	description = 'A soft-fork proposal to limit datacarrier transactions at the consensus level has started its signaling period. You can signal in favor of this soft fork by choosing "BIP110" under "Bitcoin Knots version" in the settings.',
	className,
}: WelcomePopupProps) {
	const [isClosing, setIsClosing] = useState(false)

	const handleClose = () => {
		setIsClosing(true)
		setTimeout(() => {
			onClose()
		}, 150)
	}

	return (
		<AnimatePresence>
			{isOpen && !isClosing && (
				<>
					{/* Backdrop overlay */}
					<motion.div
						initial={{opacity: 0}}
						animate={{opacity: 1}}
						exit={{opacity: 0}}
						transition={{duration: 0.2}}
						onClick={handleClose}
						className='fixed inset-0 bg-black/50 z-40'
					/>

					{/* Modal popup */}
					<motion.div
						initial={{opacity: 0, scale: 0.95, y: 10}}
						animate={{opacity: 1, scale: 1, y: 0}}
						exit={{opacity: 0, scale: 0.95, y: 10}}
						transition={{duration: 0.3, ease: 'easeOut'}}
						className={cn(
							'fixed z-50 inset-x-4 top-1/2 -translate-y-1/2',
							'sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md',
							'bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700',
							'rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto',
							className,
						)}
					>

						{/* Content */}
						<div className='p-4 pt-6 sm:p-6 sm:pt-8'>
							<h2 className='text-xl sm:text-2xl font-bold text-white mb-3'>{title}</h2>
							<p className='text-sm sm:text-base text-slate-300 mb-6 leading-relaxed'>{description}</p>

							{/* Buttons */}
							<div className='flex flex-col sm:flex-row gap-3'>
								<Button
									onClick={() => window.open('https://bip110.org', '_blank')}
									className='flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold'
								>
									Learn More
								</Button>
								<Button
									onClick={handleClose}
									className='flex-1 bg-gradient-to-r from-grey-500 to-grey-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold'
								>
									Dismiss
								</Button>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}
