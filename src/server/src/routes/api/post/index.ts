import changeAccount from './changeAccount'
import loginArl from './loginArl'
import addToQueue from './addToQueue'
import loginEmail from './loginEmail'
import cancelAllDownloads from './cancelAllDownloads'
import removeFinishedDownloads from './removeFinishedDownloads'
import removeFromQueue from './removeFromQueue'
import logout from './logout'
import saveSettings from './saveSettings'
import retryDownload from './retryDownload'
import scanLibrary from './scanLibrary'
import deleteLibraryTrack from './deleteLibraryTrack'
import deleteLibraryAlbum from './deleteLibraryAlbum'
import clearLogs from './clearLogs'
import pauseQueue from './pauseQueue'
import resumeQueue from './resumeQueue'
import clearFailedDownloads from './clearFailedDownloads'
import reorderQueue from './reorderQueue'
import plexSettings from './plexSettings'
import plexTest from './plexTest'
import plexScan from './plexScan'
import plexAuthPin from './plexAuthPin'
import plexDelete from './plexDelete'
import updateMonitoredConfig from './updateMonitoredConfig'
import addMonitoredArtist from './addMonitoredArtist'
import removeMonitoredArtist from './removeMonitoredArtist'
import checkMonitored from './checkMonitored'
import downloadMissing from './downloadMissing'

export default [
	changeAccount,
	loginArl,
	addToQueue,
	loginEmail,
	cancelAllDownloads,
	removeFinishedDownloads,
	removeFromQueue,
	logout,
	saveSettings,
	retryDownload,
	scanLibrary,
	deleteLibraryTrack,
	deleteLibraryAlbum,
	clearLogs,
	pauseQueue,
	resumeQueue,
	clearFailedDownloads,
	reorderQueue,
	plexSettings,
	plexTest,
	plexScan,
	plexAuthPin,
	plexDelete,
	updateMonitoredConfig,
	addMonitoredArtist,
	removeMonitoredArtist,
	checkMonitored,
	downloadMissing
]
