import saveSettings from './saveSettings'
import removeFinishedDownloads from './removeFinishedDownloads'
import removeFromQueue from './removeFromQueue'
import cancelAllDownloads from './cancelAllDownloads'
import pauseQueue from './pauseQueue'
import resumeQueue from './resumeQueue'
import clearFailedDownloads from './clearFailedDownloads'
import reorderQueue from './reorderQueue'

export default [
	saveSettings,
	removeFinishedDownloads,
	removeFromQueue,
	cancelAllDownloads,
	pauseQueue,
	resumeQueue,
	clearFailedDownloads,
	reorderQueue
]
