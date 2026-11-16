import connect from './connect'
import analyzeLink from './analyzeLink'
import getHome from './getHome'
import getCharts from './getCharts'
import mainSearch from './mainSearch'
import search from './search'
import newReleases from './newReleases'
import getTracklist from './getTracklist'
import { apiHandler as albumSearch } from './albumSearch'
import getChartTracks from './getChartTracks'
import getSettings from './getSettings'
import getUserTracks from './getUserTracks'
import getUserAlbums from './getUserAlbums'
import getUserArtists from './getUserArtists'
import getUserPlaylists from './getUserPlaylists'
import getUserSpotifyPlaylists from './getUserSpotifyPlaylists'
import getUserFavorites from './getUserFavorites'
import getQueue from './getQueue'
import spotifyStatus from './spotifyStatus'
import checkForUpdates from './checkForUpdates'
import getLibrary from './getLibrary'
import getLibraryCover from './getLibraryCover'
import streamLibraryTrack from './streamLibraryTrack'
import searchLibrary from './searchLibrary'
import checkPermissions from './checkPermissions'
import getLogs from './getLogs'
import exportLogs from './exportLogs'

export default [
	connect,
	albumSearch,
	analyzeLink,
	getHome,
	getCharts,
	getChartTracks,
	mainSearch,
	search,
	newReleases,
	getTracklist,
	getSettings,
	getUserTracks,
	getUserAlbums,
	getUserArtists,
	getUserPlaylists,
	getUserSpotifyPlaylists,
	getUserFavorites,
	getQueue,
	spotifyStatus,
	checkForUpdates,
	getLibrary,
	getLibraryCover,
	streamLibraryTrack,
	searchLibrary,
	checkPermissions,
	getLogs,
	exportLogs
]
