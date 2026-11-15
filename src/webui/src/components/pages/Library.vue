<template>
	<div class="library-page">
		<!-- Page Header -->
		<div class="page-header">
			<div class="header-titles">
				<h1 class="page-title">
					<i class="material-icons title-icon">library_music</i>
					{{ $t('libraryPage.title') }}
				</h1>
				<div class="header-badges-row">
					<div class="folder-badge">
						<i class="material-icons folder-icon">folder</i>
						<span class="folder-label">{{ $t('libraryPage.downloadPath') }}:</span>
						<span class="folder-path">{{ downloadLocation || '/downloads' }}</span>
					</div>
					<div v-if="lastScanned" class="last-scanned-badge" :title="lastScanned">
						<i class="material-icons schedule-icon">update</i>
						<span class="scanned-label">{{ $t('libraryPage.lastScanned') }}:</span>
						<span class="scanned-time">{{ formatTime(lastScanned) }}</span>
					</div>
				</div>
			</div>

			<!-- Rescan Button -->
			<div class="header-actions">
				<button
					class="btn btn-primary action-btn"
					:disabled="isScanning"
					@click="rescanLibrary(false)"
				>
					<i class="material-icons btn-icon" :class="{ 'spin-active': isScanning }">sync</i>
					<span>{{ isScanning ? $t('libraryPage.scanning') : (allAlbums.length > 0 ? $t('libraryPage.rescanLibrary') : $t('libraryPage.scanLibrary')) }}</span>
				</button>
			</div>
		</div>

		<!-- Interactive Stat Filter Cards with Totals -->
		<div class="stats-grid">
			<button
				class="stat-card"
				:class="{ 'stat-card-active active-albums': activeView === 'albums' }"
				@click="activeView = 'albums'"
			>
				<div class="stat-header">
					<span class="stat-label">{{ $t('libraryPage.stats.albums') }}</span>
					<i class="material-icons stat-icon">album</i>
				</div>
				<div class="stat-value text-cyan-val">{{ totalAlbums }}</div>
			</button>

			<button
				class="stat-card"
				:class="{ 'stat-card-active active-artists': activeView === 'artists' }"
				@click="activeView = 'artists'"
			>
				<div class="stat-header">
					<span class="stat-label">{{ $t('libraryPage.stats.artists') }}</span>
					<i class="material-icons stat-icon">person</i>
				</div>
				<div class="stat-value text-primary-val">{{ totalArtists }}</div>
			</button>

			<button
				class="stat-card"
				:class="{ 'stat-card-active active-tracks': activeView === 'tracks' }"
				@click="activeView = 'tracks'"
			>
				<div class="stat-header">
					<span class="stat-label">{{ $t('libraryPage.stats.tracks') }}</span>
					<i class="material-icons stat-icon">audiotrack</i>
				</div>
				<div class="stat-value text-emerald-val">{{ totalTracks }}</div>
			</button>

			<div class="stat-card stat-summary-card">
				<div class="stat-header">
					<span class="stat-label">{{ $t('libraryPage.stats.totalSize') }}</span>
					<i class="material-icons stat-icon">storage</i>
				</div>
				<div class="stat-value text-amber-val">{{ libraryTotalFormattedSize }}</div>
			</div>
		</div>

		<!-- Unified Media Toolbar: Search + Sort Dropdown + View Switcher + Counter -->
		<div class="media-toolbar">
			<div class="search-box">
				<i class="material-icons search-box-icon">search</i>
				<input
					:value="searchInput"
					type="text"
					:placeholder="searchPlaceholder"
					class="search-box-input"
					@input="handleSearchInput($event.target.value)"
				/>
				<button
					v-if="searchInput"
					class="search-clear-btn"
					title="Clear"
					@click="clearSearch"
				>
					<i class="material-icons text-base">close</i>
				</button>
			</div>

			<div class="toolbar-controls">
				<!-- Sort Dropdown -->
				<div class="sort-control">
					<i class="material-icons sort-icon">sort</i>
					<select v-model="sortBy" class="sort-select">
						<option value="title_asc">Title (A - Z)</option>
						<option value="title_desc">Title (Z - A)</option>
						<option value="artist_asc">Artist (A - Z)</option>
						<option value="tracks_desc">Most Tracks</option>
						<option value="size_desc">Largest Size</option>
					</select>
				</div>

				<!-- View Mode Switcher (Grid / List) for Albums -->
				<div v-if="activeView === 'albums'" class="view-switcher">
					<button
						class="view-switch-btn"
						:class="{ active: displayMode === 'grid' }"
						title="Grid View"
						@click="displayMode = 'grid'"
					>
						<i class="material-icons">grid_view</i>
					</button>
					<button
						class="view-switch-btn"
						:class="{ active: displayMode === 'list' }"
						title="List View"
						@click="displayMode = 'list'"
					>
						<i class="material-icons">view_list</i>
					</button>
				</div>

				<!-- Results Count Badge -->
				<div class="results-count-pill">
					<span v-if="activeView === 'albums'">{{ filteredAlbums.length }} {{ filteredAlbums.length === 1 ? 'Album' : 'Albums' }}</span>
					<span v-else-if="activeView === 'artists'">{{ filteredArtists.length }} {{ filteredArtists.length === 1 ? 'Artist' : 'Artists' }}</span>
					<span v-else-if="activeView === 'tracks'">{{ filteredTracks.length }} {{ filteredTracks.length === 1 ? 'Track' : 'Tracks' }}</span>
				</div>
			</div>
		</div>

		<!-- Loading State -->
		<div v-if="isScanning && allAlbums.length === 0" class="scanning-state">
			<div class="spin-icon-box">
				<i class="material-icons spin-large spin-active">sync</i>
			</div>
			<p class="scanning-title">{{ $t('libraryPage.scanningLibrary') }}</p>
			<p class="scanning-subtitle">{{ $t('libraryPage.scanningDescription') }}</p>
		</div>

		<!-- 1. ALBUMS VIEW -->
		<template v-else-if="activeView === 'albums'">
			<!-- Grid Display Mode -->
			<div
				v-if="displayMode === 'grid' && filteredAlbums.length > 0"
				class="albums-grid"
			>
				<div
					v-for="album in paginatedAlbums"
					:key="album.path || `${album.artist}-${album.title}`"
					class="album-card group"
					@click="openAlbumModal(album)"
				>
					<!-- Modern Album Cover Art -->
					<div class="album-cover-box">
						<img
							v-if="album.cover"
							:src="getCoverUrl(album.cover)"
							:alt="album.title"
							class="album-img"
							loading="lazy"
						/>
						<div v-else class="album-placeholder">
							<i class="material-icons album-placeholder-icon">album</i>
						</div>

						<!-- Floating Glass Format Badge (Top-Left) -->
						<div class="badge-floating-left">
							<span class="glass-pill" :class="formatPillClass(getAlbumFormat(album))">
								{{ getAlbumFormat(album) }}
							</span>
						</div>

						<!-- Floating Quick Delete (Top-Right) -->
						<div class="badge-floating-right">
							<button
								class="glass-delete-btn"
								:title="$t('libraryPage.deleteAlbum')"
								@click.stop="confirmDeleteAlbum(album)"
							>
								<i class="material-icons text-xs">delete</i>
							</button>
						</div>

						<!-- Track Count Overlay (Bottom-Right) -->
						<div class="track-count-overlay">
							{{ album.tracksCount }} {{ $t('libraryPage.tracks') }}
						</div>

						<!-- Hover Overlay with Inspect Pill -->
						<div class="album-hover-overlay">
							<div class="inspect-pill">
								<i class="material-icons text-base">visibility</i>
								<span>Inspect</span>
							</div>
						</div>
					</div>

					<!-- Album Info Footer -->
					<div class="album-info">
						<h4 class="album-title" :title="album.title">
							{{ album.title }}
						</h4>
						<p class="album-artist" :title="album.artist">
							{{ album.artist }}
						</p>
						<div
							v-if="album.matchedTracks && album.matchedTracks.length > 0"
							class="track-match-badge"
							:title="album.matchedTracks.join(', ')"
						>
							<i class="material-icons track-match-icon">audiotrack</i>
							<span class="track-match-text truncate">Matches track: {{ album.matchedTracks[0] }}</span>
							<span v-if="album.matchedTracks.length > 1" class="track-match-more">+{{ album.matchedTracks.length - 1 }}</span>
						</div>
						<div class="album-submeta">
							<span v-if="album.formattedTotalSize" class="album-size">
								{{ album.formattedTotalSize }}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- List Display Mode -->
			<div
				v-else-if="displayMode === 'list' && filteredAlbums.length > 0"
				class="albums-list-container"
			>
				<div class="table-container">
					<table class="tracks-table">
						<thead>
							<tr>
								<th class="col-cover">Cover</th>
								<th class="col-title">{{ $t('libraryPage.table.title') }}</th>
								<th class="col-artist">{{ $t('libraryPage.table.artist') }}</th>
								<th class="col-format">{{ $t('libraryPage.table.format') }}</th>
								<th class="col-tracks">{{ $t('libraryPage.tracks') }}</th>
								<th class="col-size">{{ $t('libraryPage.table.size') }}</th>
								<th class="col-actions">{{ $t('libraryPage.table.actions') }}</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="album in paginatedAlbums"
								:key="album.path || `${album.artist}-${album.title}`"
								class="track-row album-list-row"
								@click="openAlbumModal(album)"
							>
								<td class="col-cover">
									<div class="list-thumb-box">
										<img
											v-if="album.cover"
											:src="getCoverUrl(album.cover)"
											:alt="album.title"
											class="list-thumb-img"
											loading="lazy"
										/>
										<i v-else class="material-icons text-sm text-secondary">album</i>
									</div>
								</td>
								<td class="col-title track-title-cell">
									<div class="track-title-text" :title="album.title">
										{{ album.title }}
									</div>
									<div
										v-if="album.matchedTracks && album.matchedTracks.length > 0"
										class="track-match-badge-list"
										:title="album.matchedTracks.join(', ')"
									>
										<i class="material-icons track-match-icon">audiotrack</i>
										<span class="track-match-text truncate">Matches track: {{ album.matchedTracks[0] }}</span>
										<span v-if="album.matchedTracks.length > 1" class="track-match-more">+{{ album.matchedTracks.length - 1 }}</span>
									</div>
								</td>
								<td class="col-artist track-artist-cell" :title="album.artist">
									{{ album.artist }}
								</td>
								<td class="col-format track-format-cell">
									<span class="format-pill" :class="formatPillClass(getAlbumFormat(album))">
										{{ getAlbumFormat(album) }}
									</span>
								</td>
								<td class="col-tracks text-center">
									<span class="meta-pill">{{ album.tracksCount }}</span>
								</td>
								<td class="col-size track-size-cell">
									{{ album.formattedTotalSize }}
								</td>
								<td class="col-actions track-actions-cell" @click.stop>
									<button
										class="track-delete-btn"
										:title="$t('libraryPage.deleteAlbum')"
										@click.stop="confirmDeleteAlbum(album)"
									>
										<i class="material-icons">delete_outline</i>
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<!-- Album Pagination Bar -->
			<div v-if="filteredAlbums.length > albumPageSize" class="pagination-bar">
				<div class="pagination-left">
					<span class="page-range-text">
						Showing {{ ((albumCurrentPage - 1) * albumPageSize) + 1 }} - {{ Math.min(albumCurrentPage * albumPageSize, filteredAlbums.length) }} of {{ filteredAlbums.length.toLocaleString() }} albums
					</span>
				</div>
				<div class="pagination-controls">
					<button class="page-btn" :disabled="albumCurrentPage <= 1" title="First Page" @click="albumCurrentPage = 1">
						<i class="material-icons">first_page</i>
					</button>
					<button class="page-btn" :disabled="albumCurrentPage <= 1" title="Previous Page" @click="albumCurrentPage--">
						<i class="material-icons">chevron_left</i>
					</button>
					<span class="page-info">
						Page {{ albumCurrentPage }} of {{ totalAlbumPages }}
					</span>
					<button class="page-btn" :disabled="albumCurrentPage >= totalAlbumPages" title="Next Page" @click="albumCurrentPage++">
						<i class="material-icons">chevron_right</i>
					</button>
					<button class="page-btn" :disabled="albumCurrentPage >= totalAlbumPages" title="Last Page" @click="albumCurrentPage = totalAlbumPages">
						<i class="material-icons">last_page</i>
					</button>
				</div>
			</div>

			<!-- Empty State -->
			<div v-if="filteredAlbums.length === 0" class="empty-state-card">
				<div class="empty-icon-box">
					<i class="material-icons empty-icon">{{ searchQuery ? 'search_off' : 'library_music' }}</i>
				</div>
				<h3 class="empty-title">
					{{ searchQuery ? $t('libraryPage.empty.noSearchTitle') : $t('libraryPage.empty.emptyTitle') }}
				</h3>
				<p class="empty-description">
					{{ searchQuery ? $t('libraryPage.empty.noSearchMessage') : $t('libraryPage.empty.emptyMessage') }}
				</p>
				<button
					v-if="!searchQuery"
					class="btn btn-primary mt-6"
					@click="rescanLibrary(true)"
				>
					<i class="material-icons mr-1.5 text-base">sync</i>
					{{ $t('libraryPage.scanLibrary') }}
				</button>
			</div>
		</template>

		<!-- 2. ARTISTS VIEW -->
		<template v-else-if="activeView === 'artists'">
			<div
				v-if="filteredArtists.length > 0"
				class="artists-grid"
			>
				<div
					v-for="artist in filteredArtists"
					:key="artist.name"
					class="artist-card"
					@click="selectArtist(artist)"
				>
					<div class="artist-avatar-box">
						<i class="material-icons artist-avatar-icon">person</i>
					</div>
					<div class="artist-info">
						<h4 class="artist-name" :title="artist.name">{{ artist.name }}</h4>
						<div class="artist-meta-badges">
							<span class="badge-pill">
								<i class="material-icons text-xs">album</i>
								{{ artist.albumsCount }} {{ artist.albumsCount === 1 ? 'Album' : 'Albums' }}
							</span>
							<span class="badge-pill">
								<i class="material-icons text-xs">audiotrack</i>
								{{ artist.totalTracks }} {{ artist.totalTracks === 1 ? 'Track' : 'Tracks' }}
							</span>
						</div>
					</div>
					<div class="artist-arrow">
						<i class="material-icons">chevron_right</i>
					</div>
				</div>
			</div>

			<div v-else class="empty-state-card">
				<div class="empty-icon-box">
					<i class="material-icons empty-icon">{{ searchQuery ? 'search_off' : 'person_off' }}</i>
				</div>
				<h3 class="empty-title">No Matching Artists</h3>
				<p class="empty-description">No artists in your library match the current search query.</p>
			</div>
		</template>

		<!-- 3. ALL TRACKS VIEW -->
		<template v-else-if="activeView === 'tracks'">
			<div
				v-if="filteredTracks.length > 0"
				class="tracks-view-container"
			>
				<div class="table-container">
					<table class="tracks-table">
						<thead>
							<tr>
								<th class="col-num">#</th>
								<th class="col-title">{{ $t('libraryPage.table.title') }}</th>
								<th class="col-artist">{{ $t('libraryPage.table.artist') }}</th>
								<th class="col-album">Album</th>
								<th class="col-format">{{ $t('libraryPage.table.format') }}</th>
								<th class="col-size">{{ $t('libraryPage.table.size') }}</th>
								<th class="col-actions">{{ $t('libraryPage.table.actions') }}</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="(track, index) in paginatedTracks"
								:key="track.path || `${track.title}-${index}`"
								class="track-row track-playable-row"
								:class="{ 'row-is-playing': isCurrentTrack(track) }"
								@click="playTrack(track, filteredTracks)"
							>
								<td class="col-num track-num-cell">
									<div class="track-num-wrapper">
										<span v-if="!isCurrentTrack(track)" class="track-num-text">
											{{ track.trackNumber || (((trackCurrentPage - 1) * trackPageSize) + index + 1) }}
										</span>
										<div v-else-if="isPlaying" class="playing-equalizer-icon" title="Playing">
											<span></span><span></span><span></span>
										</div>
										<i v-else class="material-icons play-status-icon">pause</i>
										<button
											class="row-play-btn"
											:title="isCurrentTrack(track) && isPlaying ? 'Pause' : 'Play'"
											@click.stop="playTrack(track, filteredTracks)"
										>
											<i class="material-icons">{{ isCurrentTrack(track) && isPlaying ? 'pause' : 'play_arrow' }}</i>
										</button>
									</div>
								</td>
								<td class="col-title track-title-cell">
									<div class="track-title-text" :title="track.title">
										{{ track.title }}
									</div>
								</td>
								<td class="col-artist track-artist-cell" :title="track.artist">
									{{ track.artist }}
								</td>
								<td class="col-album track-album-cell">
									<a
										href="javascript:void(0)"
										class="album-link"
										:title="track.albumTitle || track.album"
										@click.stop="openTrackAlbum(track)"
									>
										{{ track.albumTitle || track.album }}
									</a>
								</td>
								<td class="col-format track-format-cell">
									<span class="format-pill" :class="formatPillClass(track.format)">
										{{ (track.format || 'MP3').toUpperCase() }}
									</span>
								</td>
								<td class="col-size track-size-cell">
									{{ track.formattedSize }}
								</td>
								<td class="col-actions track-actions-cell" @click.stop>
									<button
										class="track-delete-btn"
										:title="$t('libraryPage.deleteTrack')"
										@click.stop="confirmDeleteTrack(track)"
									>
										<i class="material-icons">delete_outline</i>
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Tracks Pagination Bar -->
				<div class="pagination-bar">
					<div class="pagination-left">
						<span class="page-size-label">Rows:</span>
						<select v-model.number="trackPageSize" class="page-size-select" @change="trackCurrentPage = 1">
							<option :value="25">25</option>
							<option :value="50">50</option>
							<option :value="100">100</option>
							<option :value="250">250</option>
						</select>
						<span class="page-range-text">
							Showing {{ ((trackCurrentPage - 1) * trackPageSize) + 1 }} - {{ Math.min(trackCurrentPage * trackPageSize, filteredTracks.length) }} of {{ filteredTracks.length.toLocaleString() }} tracks
						</span>
					</div>
					<div class="pagination-controls">
						<button class="page-btn" :disabled="trackCurrentPage <= 1" title="First Page" @click="trackCurrentPage = 1">
							<i class="material-icons">first_page</i>
						</button>
						<button class="page-btn" :disabled="trackCurrentPage <= 1" title="Previous Page" @click="trackCurrentPage--">
							<i class="material-icons">chevron_left</i>
						</button>
						<span class="page-info">
							Page {{ trackCurrentPage }} of {{ totalTrackPages }}
						</span>
						<button class="page-btn" :disabled="trackCurrentPage >= totalTrackPages" title="Next Page" @click="trackCurrentPage++">
							<i class="material-icons">chevron_right</i>
						</button>
						<button class="page-btn" :disabled="trackCurrentPage >= totalTrackPages" title="Last Page" @click="trackCurrentPage = totalTrackPages">
							<i class="material-icons">last_page</i>
						</button>
					</div>
				</div>
			</div>

			<div v-else class="empty-state-card">
				<div class="empty-icon-box">
					<i class="material-icons empty-icon">{{ searchQuery ? 'search_off' : 'audiotrack' }}</i>
				</div>
				<h3 class="empty-title">No Matching Tracks</h3>
				<p class="empty-description">No audio tracks match the current search or filter query.</p>
			</div>
		</template>

		<!-- Guaranteed-Visible Album Detail Modal -->
		<div
			v-if="selectedAlbum"
			class="modal-backdrop"
			@click.self="closeAlbumModal"
		>
			<div class="modal-card">
				<!-- Modal Header -->
				<div class="modal-header">
					<div class="modal-header-main">
						<!-- Big Album Cover -->
						<div class="modal-cover-box">
							<img
								v-if="selectedAlbum.cover"
								:src="getCoverUrl(selectedAlbum.cover)"
								:alt="selectedAlbum.title"
								class="modal-cover-img"
							/>
							<div v-else class="modal-cover-placeholder">
								<i class="material-icons text-4xl">album</i>
							</div>
						</div>

						<div class="modal-header-info">
							<span class="modal-type-badge">ALBUM</span>
							<h3 class="modal-album-title" :title="selectedAlbum.title">
								{{ selectedAlbum.title }}
							</h3>
							<p class="modal-album-artist">
								{{ selectedAlbum.artist }}
							</p>
							<div class="modal-pills-row">
								<span class="meta-pill">
									<i class="material-icons pill-icon">audiotrack</i>
									{{ selectedAlbum.tracksCount }} {{ $t('libraryPage.tracks') }}
								</span>
								<span v-if="selectedAlbum.formattedTotalSize" class="meta-pill">
									<i class="material-icons pill-icon">storage</i>
									{{ selectedAlbum.formattedTotalSize }}
								</span>
								<span v-if="selectedAlbum.path" class="meta-pill path-pill" :title="selectedAlbum.path">
									<i class="material-icons pill-icon">folder_open</i>
									{{ selectedAlbum.path }}
								</span>
							</div>
						</div>
					</div>

					<div class="modal-header-actions">
						<button
							class="btn-delete-album"
							:title="$t('libraryPage.deleteAlbum')"
							@click="confirmDeleteAlbum(selectedAlbum)"
						>
							<i class="material-icons text-base">delete_outline</i>
							<span>{{ $t('libraryPage.deleteAlbum') }}</span>
						</button>
						<button
							class="modal-close-btn"
							title="Close (Esc)"
							@click="closeAlbumModal"
						>
							<i class="material-icons">close</i>
						</button>
					</div>
				</div>

				<!-- Tracklist Table -->
				<div class="modal-body">
					<div class="tracklist-header-row">
						<span class="tracklist-heading">{{ $t('libraryPage.tracklist') }}</span>
					</div>

					<div class="table-container">
						<table class="tracks-table">
							<thead>
								<tr>
									<th class="col-num">#</th>
									<th class="col-title">{{ $t('libraryPage.table.title') }}</th>
									<th class="col-artist">{{ $t('libraryPage.table.artist') }}</th>
									<th class="col-format">{{ $t('libraryPage.table.format') }}</th>
									<th class="col-size">{{ $t('libraryPage.table.size') }}</th>
									<th class="col-actions">{{ $t('libraryPage.table.actions') }}</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="(track, index) in selectedAlbum.tracks"
									:key="track.path || `${track.title}-${index}`"
									class="track-row track-playable-row"
									:class="{ 'row-is-playing': isCurrentTrack(track) }"
									@click="playTrack(track, selectedAlbum.tracks)"
								>
									<td class="col-num track-num-cell">
										<div class="track-num-wrapper">
											<span v-if="!isCurrentTrack(track)" class="track-num-text">
												{{ track.trackNumber || (index + 1) }}
											</span>
											<div v-else-if="isPlaying" class="playing-equalizer-icon" title="Playing">
												<span></span><span></span><span></span>
											</div>
											<i v-else class="material-icons play-status-icon">pause</i>
											<button
												class="row-play-btn"
												:title="isCurrentTrack(track) && isPlaying ? 'Pause' : 'Play'"
												@click.stop="playTrack(track, selectedAlbum.tracks)"
											>
												<i class="material-icons">{{ isCurrentTrack(track) && isPlaying ? 'pause' : 'play_arrow' }}</i>
											</button>
										</div>
									</td>
									<td class="col-title track-title-cell">
										<div class="track-title-text" :title="track.title">
											{{ track.title }}
										</div>
										<div class="track-artist-mobile">
											{{ track.artist }}
										</div>
									</td>
									<td class="col-artist track-artist-cell" :title="track.artist">
										{{ track.artist }}
									</td>
									<td class="col-format track-format-cell">
										<span class="format-pill" :class="formatPillClass(track.format)">
											{{ (track.format || 'MP3').toUpperCase() }}
										</span>
									</td>
									<td class="col-size track-size-cell">
										{{ track.formattedSize }}
									</td>
									<td class="col-actions track-actions-cell" @click.stop>
										<button
											class="track-delete-btn"
											:title="$t('libraryPage.deleteTrack')"
											@click.stop="confirmDeleteTrack(track)"
										>
											<i class="material-icons">delete_outline</i>
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<!-- Modal Footer -->
				<div class="modal-footer">
					<button class="btn btn-secondary" @click="closeAlbumModal">
						{{ $t('libraryPage.close') }}
					</button>
				</div>
			</div>
		</div>

		<!-- Danger Confirmation Modal -->
		<div
			v-if="pendingDelete"
			class="confirm-modal-backdrop"
			@click.self="pendingDelete = null"
		>
			<div class="confirm-modal-card">
				<div class="confirm-icon-box">
					<i class="material-icons confirm-danger-icon">warning_amber</i>
				</div>
				<h3 class="confirm-modal-title">
					{{ pendingDelete.type === 'album' ? $t('libraryPage.confirmDeleteAlbumTitle') : $t('libraryPage.confirmDeleteTrackTitle') }}
				</h3>
				<p class="confirm-modal-message">
					{{
						pendingDelete.type === 'album'
							? $t('libraryPage.confirmDeleteAlbumMessage', { title: pendingDelete.item.title })
							: $t('libraryPage.confirmDeleteTrackMessage', { title: pendingDelete.item.title })
					}}
				</p>
				<div class="confirm-modal-actions">
					<button
						class="btn btn-secondary confirm-cancel-btn"
						:disabled="isDeleting"
						@click="pendingDelete = null"
					>
						{{ $t('libraryPage.cancel') }}
					</button>
					<button
						class="btn btn-danger confirm-delete-btn"
						:disabled="isDeleting"
						@click="executeDelete"
					>
						<i v-if="isDeleting" class="material-icons btn-icon spin-active mr-1">sync</i>
						<i v-else class="material-icons btn-icon mr-1">delete_forever</i>
						<span>{{ isDeleting ? $t('libraryPage.deleting') : $t('libraryPage.deletePermanently') }}</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Floating Audio Player Bar -->
		<div v-if="currentTrack" class="floating-audio-player">
			<!-- Hidden native audio element -->
			<audio
				ref="audioPlayer"
				:src="audioStreamUrl"
				preload="auto"
				@play="onAudioPlay"
				@pause="onAudioPause"
				@timeupdate="onAudioTimeUpdate"
				@loadedmetadata="onAudioLoadedMetadata"
				@ended="onAudioEnded"
				@error="onAudioError"
			></audio>

			<!-- Left Track Info -->
			<div class="player-track-info">
				<div class="player-cover-box">
					<img
						v-if="currentTrackCover"
						:src="getCoverUrl(currentTrackCover)"
						:alt="currentTrack.title"
						class="player-cover-img"
					/>
					<i v-else class="material-icons player-cover-placeholder">audiotrack</i>
				</div>
				<div class="player-meta">
					<div class="player-title" :title="currentTrack.title">
						{{ currentTrack.title }}
					</div>
					<div class="player-artist" :title="currentTrack.artist">
						{{ currentTrack.artist }} &bull; {{ currentTrack.album || currentTrack.albumTitle || 'Album' }}
					</div>
				</div>
			</div>

			<!-- Center Controls + Scrubber -->
			<div class="player-controls-center">
				<div class="player-buttons-row">
					<button
						class="player-btn player-nav-btn"
						:disabled="!hasPreviousTrack"
						title="Previous Track"
						@click="playPreviousTrack"
					>
						<i class="material-icons">skip_previous</i>
					</button>
					<button
						class="player-btn player-btn-main"
						:title="isPlaying ? 'Pause' : 'Play'"
						@click="togglePlayPause"
					>
						<i class="material-icons">{{ isPlaying ? 'pause' : 'play_arrow' }}</i>
					</button>
					<button
						class="player-btn player-nav-btn"
						:disabled="!hasNextTrack"
						title="Next Track"
						@click="playNextTrack"
					>
						<i class="material-icons">skip_next</i>
					</button>
				</div>

				<div class="player-scrubber-row">
					<span class="player-time-label">{{ formatDuration(audioCurrentTime) }}</span>
					<input
						type="range"
						min="0"
						:max="audioDuration || 100"
						step="0.5"
						:value="audioCurrentTime"
						class="player-slider scrubber-slider"
						@input="onSeekInput"
					/>
					<span class="player-time-label">{{ formatDuration(audioDuration) }}</span>
				</div>
			</div>

			<!-- Right Volume + Format + Close -->
			<div class="player-actions-right">
				<span class="format-pill mr-2" :class="formatPillClass(currentTrack.format)">
					{{ (currentTrack.format || 'MP3').toUpperCase() }}
				</span>
				<button class="player-btn player-mute-btn" :title="isMuted ? 'Unmute' : 'Mute'" @click="toggleMute">
					<i class="material-icons">{{ isMuted || audioVolume === 0 ? 'volume_off' : (audioVolume < 0.5 ? 'volume_down' : 'volume_up') }}</i>
				</button>
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					:value="isMuted ? 0 : audioVolume"
					class="player-slider volume-slider"
					@input="onVolumeInput"
				/>
				<button class="player-btn player-close-btn ml-2" title="Close Player" @click="closePlayer">
					<i class="material-icons">close</i>
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import { fetchData, postToServer } from '@/utils/api'
import { socket } from '@/utils/socket'

function fastCompare(a, b) {
	const s1 = (a || '').toLowerCase()
	const s2 = (b || '').toLowerCase()
	return s1 < s2 ? -1 : s1 > s2 ? 1 : 0
}

export default {
	name: 'Library',
	data() {
		return {
			activeView: 'albums',
			displayMode: 'grid',
			sortBy: 'title_asc',
			isScanning: false,
			isDeleting: false,
			downloadLocation: '',
			lastScanned: null,
			artists: [],
			totalTracks: 0,
			totalAlbums: 0,
			totalArtists: 0,
			searchInput: '',
			searchQuery: '',
			searchDebounceTimer: null,
			selectedAlbum: null,
			pendingDelete: null,
			albumCurrentPage: 1,
			albumPageSize: 48,
			trackCurrentPage: 1,
			trackPageSize: 50,
			currentTrack: null,
			isPlaying: false,
			audioCurrentTime: 0,
			audioDuration: 0,
			audioVolume: 0.8,
			isMuted: false,
			playbackQueue: [],
			queueIndex: -1,
			cachedAlbums: [],
			cachedTracks: []
		}
	},
	watch: {
		searchQuery() {
			this.albumCurrentPage = 1
			this.trackCurrentPage = 1
		},
		sortBy() {
			this.albumCurrentPage = 1
			this.trackCurrentPage = 1
		},
		activeView() {
			this.albumCurrentPage = 1
			this.trackCurrentPage = 1
		}
	},
	computed: {
		searchPlaceholder() {
			if (this.activeView === 'artists') return 'Search artists...'
			if (this.activeView === 'tracks') return 'Search tracks, artists, or albums...'
			return 'Search albums by title, artist, or track name...'
		},
		totalAlbumPages() {
			return Math.ceil(this.filteredAlbums.length / this.albumPageSize) || 1
		},
		paginatedAlbums() {
			const start = (this.albumCurrentPage - 1) * this.albumPageSize
			return this.filteredAlbums.slice(start, start + this.albumPageSize)
		},
		totalTrackPages() {
			return Math.ceil(this.filteredTracks.length / this.trackPageSize) || 1
		},
		paginatedTracks() {
			const start = (this.trackCurrentPage - 1) * this.trackPageSize
			return this.filteredTracks.slice(start, start + this.trackPageSize)
		},
		audioStreamUrl() {
			if (!this.currentTrack || !this.currentTrack.path) return ''
			const base = location.base.endsWith('/') ? location.base : `${location.base}/`
			return `${base}api/streamLibraryTrack?path=${encodeURIComponent(this.currentTrack.path)}`
		},
		currentTrackCover() {
			if (!this.currentTrack) return ''
			return this.currentTrack.albumCover || (this.selectedAlbum && this.selectedAlbum.cover) || ''
		},
		hasPreviousTrack() {
			return this.playbackQueue.length > 1 && (this.queueIndex > 0 || this.audioCurrentTime > 3)
		},
		hasNextTrack() {
			return this.playbackQueue.length > 1 && this.queueIndex < this.playbackQueue.length - 1
		},
		allAlbums() {
			return this.cachedAlbums
		},
		filteredAlbums() {
			let albums = this.cachedAlbums
			if (this.searchQuery && this.searchQuery.trim()) {
				const query = this.searchQuery.toLowerCase().trim()
				albums = albums.filter(album => {
					if (album._searchIndex) {
						return album._searchIndex.includes(query)
					}
					const titleMatch = (album.title || '').toLowerCase().includes(query)
					const artistMatch = (album.artist || '').toLowerCase().includes(query)
					const trackMatch = (album.tracks || []).some(t => (t.title || '').toLowerCase().includes(query))
					return titleMatch || artistMatch || trackMatch
				}).map(album => {
					const titleMatch = (album.title || '').toLowerCase().includes(query)
					const artistMatch = (album.artist || '').toLowerCase().includes(query)
					const matchingTracks = (album.tracks || [])
						.filter(t => (t.title || '').toLowerCase().includes(query))
						.map(t => t.title)
					return {
						...album,
						matchedTracks: matchingTracks,
						matchedByTrack: !titleMatch && !artistMatch && matchingTracks.length > 0
					}
				})
			} else {
				albums = [...albums]
			}

			switch (this.sortBy) {
				case 'title_desc':
					albums.sort((a, b) => fastCompare(b.title, a.title))
					break
				case 'artist_asc':
					albums.sort((a, b) => fastCompare(a.artist, b.artist) || fastCompare(a.title, b.title))
					break
				case 'tracks_desc':
					albums.sort((a, b) => (b.tracksCount || 0) - (a.tracksCount || 0))
					break
				case 'size_desc':
					albums.sort((a, b) => (b.totalSize || 0) - (a.totalSize || 0))
					break
				case 'title_asc':
				default:
					albums.sort((a, b) => fastCompare(a.title, b.title))
					break
			}
			return albums
		},
		allTracks() {
			return this.cachedTracks
		},
		filteredTracks() {
			if (this.activeView !== 'tracks') return []
			let tracks = this.cachedTracks
			if (this.searchQuery.trim()) {
				const q = this.searchQuery.toLowerCase().trim()
				tracks = tracks.filter(
					t =>
						(t.title || '').toLowerCase().includes(q) ||
						(t.artist || '').toLowerCase().includes(q) ||
						(t.album || '').toLowerCase().includes(q) ||
						(t.albumTitle || '').toLowerCase().includes(q)
				)
			} else {
				tracks = [...tracks]
			}

			switch (this.sortBy) {
				case 'title_desc':
					tracks.sort((a, b) => fastCompare(b.title, a.title))
					break
				case 'artist_asc':
					tracks.sort((a, b) => fastCompare(a.artist, b.artist) || fastCompare(a.title, b.title))
					break
				case 'size_desc':
					tracks.sort((a, b) => (b.size || 0) - (a.size || 0))
					break
				case 'title_asc':
				default:
					tracks.sort((a, b) => fastCompare(a.title, b.title))
					break
			}
			return tracks
		},
		filteredArtists() {
			let artists = [...this.artists]
			if (this.searchQuery.trim()) {
				const q = this.searchQuery.toLowerCase().trim()
				artists = artists.filter(a => (a.name || '').toLowerCase().includes(q))
			}

			switch (this.sortBy) {
				case 'title_desc':
					artists.sort((a, b) => fastCompare(b.name, a.name))
					break
				case 'tracks_desc':
					artists.sort((a, b) => (b.totalTracks || 0) - (a.totalTracks || 0))
					break
				case 'size_desc':
				case 'title_asc':
				case 'artist_asc':
				default:
					artists.sort((a, b) => fastCompare(a.name, b.name))
					break
			}
			return artists
		},
		libraryTotalFormattedSize() {
			let totalBytes = 0
			this.allAlbums.forEach(album => {
				if (album.totalSize) totalBytes += album.totalSize
			})
			if (totalBytes === 0) return '0 B'
			const k = 1024
			const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
			const i = Math.floor(Math.log(totalBytes) / Math.log(k))
			return `${parseFloat((totalBytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
		}
	},
	mounted() {
		this.loadLibrary()
		socket.on('libraryUpdated', this.handleLibraryUpdated)
		document.addEventListener('keydown', this.handleKeyDown)
	},
	destroyed() {
		socket.off('libraryUpdated', this.handleLibraryUpdated)
		document.removeEventListener('keydown', this.handleKeyDown)
		if (this.searchDebounceTimer) {
			clearTimeout(this.searchDebounceTimer)
		}
		if (this.$refs.audioPlayer) {
			this.$refs.audioPlayer.pause()
		}
	},
	methods: {
		isCurrentTrack(track) {
			return !!(this.currentTrack && track && this.currentTrack.path === track.path)
		},
		playTrack(track, queue = []) {
			if (this.currentTrack && this.currentTrack.path === track.path) {
				this.togglePlayPause()
				return
			}
			this.currentTrack = track
			if (queue && queue.length > 0) {
				this.playbackQueue = queue
				this.queueIndex = queue.findIndex(t => t.path === track.path)
			} else {
				this.playbackQueue = [track]
				this.queueIndex = 0
			}
			this.audioCurrentTime = 0
			this.$nextTick(() => {
				const audio = this.$refs.audioPlayer
				if (audio) {
					audio.load()
					audio.volume = this.isMuted ? 0 : this.audioVolume
					audio.play().catch(e => {
						console.warn('Playback error or autoplay blocked:', e)
					})
				}
			})
		},
		togglePlayPause() {
			const audio = this.$refs.audioPlayer
			if (!audio) return
			if (this.isPlaying) {
				audio.pause()
			} else {
				audio.play().catch(e => console.warn('Play error:', e))
			}
		},
		playNextTrack() {
			if (this.queueIndex >= 0 && this.queueIndex < this.playbackQueue.length - 1) {
				this.queueIndex++
				const nextTrack = this.playbackQueue[this.queueIndex]
				this.playTrack(nextTrack, this.playbackQueue)
			}
		},
		playPreviousTrack() {
			if (this.audioCurrentTime > 3) {
				const audio = this.$refs.audioPlayer
				if (audio) audio.currentTime = 0
				return
			}
			if (this.queueIndex > 0) {
				this.queueIndex--
				const prevTrack = this.playbackQueue[this.queueIndex]
				this.playTrack(prevTrack, this.playbackQueue)
			}
		},
		onAudioPlay() {
			this.isPlaying = true
		},
		onAudioPause() {
			this.isPlaying = false
		},
		onAudioTimeUpdate() {
			const audio = this.$refs.audioPlayer
			if (audio) {
				this.audioCurrentTime = audio.currentTime
			}
		},
		onAudioLoadedMetadata() {
			const audio = this.$refs.audioPlayer
			if (audio) {
				this.audioDuration = audio.duration || 0
			}
		},
		onAudioEnded() {
			if (this.hasNextTrack) {
				this.playNextTrack()
			} else {
				this.isPlaying = false
			}
		},
		onAudioError(e) {
			console.error('Audio playback error:', e)
			this.isPlaying = false
		},
		onSeekInput(event) {
			const newTime = parseFloat(event.target.value)
			this.audioCurrentTime = newTime
			const audio = this.$refs.audioPlayer
			if (audio) {
				audio.currentTime = newTime
			}
		},
		onVolumeInput(event) {
			const vol = parseFloat(event.target.value)
			this.audioVolume = vol
			this.isMuted = vol === 0
			const audio = this.$refs.audioPlayer
			if (audio) {
				audio.volume = vol
			}
		},
		toggleMute() {
			this.isMuted = !this.isMuted
			const audio = this.$refs.audioPlayer
			if (audio) {
				audio.volume = this.isMuted ? 0 : this.audioVolume
			}
		},
		closePlayer() {
			const audio = this.$refs.audioPlayer
			if (audio) {
				audio.pause()
			}
			this.isPlaying = false
			this.currentTrack = null
			this.playbackQueue = []
			this.queueIndex = -1
		},
		formatDuration(seconds) {
			if (!seconds || isNaN(seconds) || seconds < 0) return '0:00'
			const s = Math.floor(seconds)
			const mins = Math.floor(s / 60)
			const rem = s % 60
			return `${mins}:${rem < 10 ? '0' : ''}${rem}`
		},
		getAlbumFormat(album) {
			if (!album.tracks || album.tracks.length === 0) return 'MP3'
			return (album.tracks[0].format || 'MP3').toUpperCase()
		},
		applyLibraryData(data) {
			if (!data) return
			this.downloadLocation = data.downloadLocation || ''
			this.lastScanned = data.lastScanned || null
			this.artists = data.artists || []
			this.totalTracks = data.totalTracks || 0
			this.totalAlbums = data.totalAlbums || 0
			this.totalArtists = data.totalArtists || 0

			const albums = []
			const tracks = []
			;(data.artists || []).forEach(artist => {
				if (Array.isArray(artist.albums)) {
					artist.albums.forEach(album => {
						const tracksTitleStr = Array.isArray(album.tracks)
							? album.tracks.map(t => t.title || '').join(' ')
							: ''
						album._searchIndex = `${album.title || ''} ${album.artist || ''} ${tracksTitleStr}`.toLowerCase()
						albums.push(album)
						if (Array.isArray(album.tracks)) {
							album.tracks.forEach(track => {
								tracks.push({
									...track,
									albumTitle: album.title,
									albumCover: album.cover
								})
							})
						}
					})
				}
			})
			this.cachedAlbums = albums
			this.cachedTracks = tracks

			// Refresh selectedAlbum reference if modal is open
			if (this.selectedAlbum) {
				const found = this.allAlbums.find(
					a => a.path === this.selectedAlbum.path || (a.title === this.selectedAlbum.title && a.artist === this.selectedAlbum.artist)
				)
				if (found && found.tracks && found.tracks.length > 0) {
					this.selectedAlbum = found
				} else {
					this.selectedAlbum = null
				}
			}
		},
		async loadLibrary() {
			try {
				const data = await fetchData('getLibrary')
				this.applyLibraryData(data)
			} catch (error) {
				console.error('Failed to load library:', error)
			}
		},
		async rescanLibrary(force = false) {
			this.isScanning = true
			try {
				const result = await postToServer('scanLibrary', { force })
				if (result && result.library) {
					this.applyLibraryData(result.library)
				} else {
					await this.loadLibrary()
				}
			} catch (error) {
				console.error('Failed to rescan library:', error)
			} finally {
				this.isScanning = false
			}
		},
		handleLibraryUpdated(updatedLib) {
			if (updatedLib) {
				this.applyLibraryData(updatedLib)
			} else {
				this.loadLibrary()
			}
		},
		handleSearchInput(value) {
			this.searchInput = value
			if (this.searchDebounceTimer) {
				clearTimeout(this.searchDebounceTimer)
			}
			this.searchDebounceTimer = setTimeout(() => {
				this.searchQuery = this.searchInput
			}, 150)
		},
		clearSearch() {
			if (this.searchDebounceTimer) {
				clearTimeout(this.searchDebounceTimer)
			}
			this.searchInput = ''
			this.searchQuery = ''
		},
		selectArtist(artist) {
			if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer)
			this.searchInput = artist.name
			this.searchQuery = artist.name
			this.activeView = 'albums'
		},
		openTrackAlbum(track) {
			const found = this.allAlbums.find(
				a => (track.albumTitle && a.title === track.albumTitle) || (track.path && a.path === track.path.split('/')[0])
			)
			if (found) {
				this.openAlbumModal(found)
			}
		},
		confirmDeleteAlbum(album) {
			this.pendingDelete = { type: 'album', item: album }
		},
		confirmDeleteTrack(track) {
			this.pendingDelete = { type: 'track', item: track }
		},
		async executeDelete() {
			if (!this.pendingDelete) return
			this.isDeleting = true
			try {
				if (this.pendingDelete.type === 'album') {
					const res = await postToServer('deleteLibraryAlbum', { albumPath: this.pendingDelete.item.path })
					if (res && res.library) {
						this.applyLibraryData(res.library)
					}
					if (this.selectedAlbum && this.selectedAlbum.path === this.pendingDelete.item.path) {
						this.closeAlbumModal()
					}
				} else if (this.pendingDelete.type === 'track') {
					const res = await postToServer('deleteLibraryTrack', { trackPath: this.pendingDelete.item.path })
					if (res && res.library) {
						this.applyLibraryData(res.library)
					}
				}
			} catch (error) {
				console.error('Failed to delete library record:', error)
			} finally {
				this.isDeleting = false
				this.pendingDelete = null
			}
		},
		formatTime(isoString) {
			if (!isoString) return ''
			try {
				const d = new Date(isoString)
				return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
			} catch {
				return isoString
			}
		},
		getCoverUrl(coverPath) {
			if (!coverPath) return ''
			if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
				return coverPath
			}
			const base = location.base.endsWith('/') ? location.base : `${location.base}/`
			const normalizedCover = coverPath.startsWith('/') ? coverPath.slice(1) : coverPath
			return `${base}${normalizedCover}`
		},
		openAlbumModal(album) {
			this.selectedAlbum = album
		},
		closeAlbumModal() {
			this.selectedAlbum = null
		},
		handleKeyDown(event) {
			if (event.key === 'Escape') {
				if (this.pendingDelete) {
					this.pendingDelete = null
				} else if (this.selectedAlbum) {
					this.closeAlbumModal()
				}
			} else if (
				event.code === 'Space' &&
				event.target &&
				event.target.tagName !== 'INPUT' &&
				event.target.tagName !== 'SELECT' &&
				event.target.tagName !== 'TEXTAREA'
			) {
				if (this.currentTrack) {
					event.preventDefault()
					this.togglePlayPause()
				}
			}
		},
		formatPillClass(format) {
			const f = (format || '').toLowerCase()
			if (f.includes('flac')) return 'pill-flac'
			if (f.includes('wav')) return 'pill-wav'
			return 'pill-mp3'
		}
	}
}
</script>

<style scoped>
.library-page {
	width: 100%;
	padding: 1.5rem 0 6.5rem 0;
}

/* Page Header */
.page-header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 1.75rem;
	gap: 1rem;
}

.title-icon {
	font-size: 2.25rem;
	color: var(--primary-color);
	margin-right: 0.75rem;
}

.page-title {
	font-size: 2rem;
	font-weight: 800;
	letter-spacing: -0.025em;
	display: flex;
	align-items: center;
	color: var(--foreground);
	margin: 0;
}

.header-badges-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 0.75rem;
	margin-top: 0.35rem;
}

.folder-badge,
.last-scanned-badge {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	color: var(--secondary-text);
	font-size: 0.8125rem;
}

.folder-icon,
.schedule-icon {
	font-size: 1rem;
	color: var(--muted-text);
}

.folder-label,
.scanned-label {
	font-weight: 500;
}

.folder-path,
.scanned-time {
	font-family: monospace;
	font-size: 0.75rem;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	padding: 0.15rem 0.5rem;
	border-radius: 0.375rem;
	color: var(--foreground);
}

.scanned-time {
	color: #06b6d4;
	border-color: rgba(6, 182, 212, 0.3);
}

.header-actions {
	display: flex;
	align-items: center;
}

.action-btn {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0 1rem;
	height: 2.5rem;
	border-radius: 0.75rem;
}

.btn-icon {
	font-size: 1.15rem;
}

.spin-active {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Stats Cards as Buttons */
.stats-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
	margin-bottom: 1.5rem;
}

@media (min-width: 640px) {
	.stats-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
}

.stat-card {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 1rem;
	padding: 1.25rem 1rem;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	position: relative;
	overflow: hidden;
	cursor: pointer;
	text-align: left;
	width: 100%;
	display: flex;
	flex-direction: column;
}

.stat-card:hover {
	border-color: var(--border-color-hover);
	transform: translateY(-2px);
	box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.25);
}

.stat-card-active {
	border-color: var(--primary-color) !important;
	background: rgba(var(--primary-color-rgb, 124, 58, 237), 0.1) !important;
	box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 124, 58, 237), 0.35), 0 10px 20px -5px rgba(0, 0, 0, 0.3);
}

.stat-card-active.active-albums {
	border-color: #06b6d4 !important;
	background: rgba(6, 182, 212, 0.1) !important;
	box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.35), 0 10px 20px -5px rgba(0, 0, 0, 0.3);
}

.stat-card-active.active-artists {
	border-color: var(--primary-color) !important;
	background: rgba(var(--primary-color-rgb, 124, 58, 237), 0.1) !important;
	box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 124, 58, 237), 0.35), 0 10px 20px -5px rgba(0, 0, 0, 0.3);
}

.stat-card-active.active-tracks {
	border-color: #10b981 !important;
	background: rgba(16, 185, 129, 0.1) !important;
	box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.35), 0 10px 20px -5px rgba(0, 0, 0, 0.3);
}

.stat-summary-card {
	cursor: default;
}

.stat-summary-card:hover {
	transform: none;
	border-color: var(--border-color);
	box-shadow: none;
}

.stat-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}

.stat-label {
	font-size: 0.75rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--secondary-text);
}

.stat-icon {
	font-size: 1.25rem;
	color: var(--secondary-text);
	opacity: 0.7;
}

.stat-value {
	font-size: 1.85rem;
	font-weight: 800;
	margin-top: 0.5rem;
	letter-spacing: -0.02em;
}

.text-primary-val { color: var(--primary-color); }
.text-cyan-val { color: #06b6d4; }
.text-emerald-val { color: #10b981; }
.text-amber-val { color: #f59e0b; }

/* Unified Media Toolbar */
.media-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 1.75rem;
	flex-wrap: wrap;
	background: var(--surface-glass, rgba(255, 255, 255, 0.03));
	padding: 0.75rem 1rem;
	border: 1px solid var(--border-color);
	border-radius: 1rem;
	backdrop-filter: blur(12px);
}

.search-box {
	position: relative;
	flex: 1;
	min-width: 16rem;
	display: flex;
	align-items: center;
}

.search-box-icon {
	position: absolute;
	left: 0.85rem;
	font-size: 1.2rem;
	color: var(--secondary-text);
	pointer-events: none;
}

.search-box-input {
	width: 100%;
	padding: 0.6rem 2.25rem 0.6rem 2.5rem;
	border-radius: 0.75rem;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	color: var(--foreground);
	font-size: 0.875rem;
	transition: all 0.2s ease;
}

.search-box-input:focus {
	outline: none;
	border-color: var(--primary-color);
	box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 124, 58, 237), 0.2);
}

.search-clear-btn {
	position: absolute;
	right: 0.75rem;
	background: transparent;
	border: none;
	color: var(--secondary-text);
	cursor: pointer;
	padding: 0.2rem;
	display: flex;
	align-items: center;
	border-radius: 9999px;
}

.search-clear-btn:hover {
	color: var(--foreground);
}

.toolbar-controls {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	flex-wrap: wrap;
}

.sort-control {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 0.625rem;
	padding: 0 0.5rem;
	height: 2.35rem;
}

.sort-icon {
	font-size: 1.1rem;
	color: var(--secondary-text);
}

.sort-select {
	background: transparent;
	border: none;
	color: var(--foreground);
	font-size: 0.8125rem;
	font-weight: 600;
	cursor: pointer;
	outline: none;
	padding-right: 0.25rem;
}

.sort-select option {
	background: var(--card-background);
	color: var(--foreground);
}

.view-switcher {
	display: flex;
	align-items: center;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 0.625rem;
	padding: 0.15rem;
	gap: 0.15rem;
}

.view-switch-btn {
	background: transparent;
	border: none;
	color: var(--secondary-text);
	padding: 0.35rem;
	border-radius: 0.45rem;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.15s ease;
}

.view-switch-btn:hover {
	color: var(--foreground);
}

.view-switch-btn.active {
	background: var(--primary-color);
	color: #fff;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.results-count-pill {
	font-size: 0.75rem;
	font-weight: 700;
	color: var(--secondary-text);
	background: var(--card-background);
	border: 1px solid var(--border-color);
	padding: 0.4rem 0.75rem;
	border-radius: 0.625rem;
	white-space: nowrap;
}

/* Scanning State */
.scanning-state {
	padding: 5rem 1rem;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.spin-icon-box {
	width: 4rem;
	height: 4rem;
	border-radius: 9999px;
	background: rgba(var(--primary-color-rgb, 124, 58, 237), 0.1);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 1.25rem;
}

.spin-large {
	font-size: 2.25rem;
	color: var(--primary-color);
}

.scanning-title {
	font-size: 1.15rem;
	font-weight: 700;
	color: var(--foreground);
	margin-bottom: 0.35rem;
}

.scanning-subtitle {
	font-size: 0.875rem;
	color: var(--secondary-text);
	max-width: 24rem;
}

/* Modern Albums Grid */
.albums-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: 1.25rem;
}

.album-card {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 1rem;
	overflow: hidden;
	cursor: pointer;
	transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	display: flex;
	flex-direction: column;
	position: relative;
}

.album-card:hover {
	border-color: var(--border-color-hover);
	transform: translateY(-4px);
	box-shadow: 0 16px 28px -6px rgba(0, 0, 0, 0.35);
}

.album-cover-box {
	position: relative;
	width: 100%;
	aspect-ratio: 1 / 1;
	background: #111;
	overflow: hidden;
}

.album-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.35s ease;
}

.album-card:hover .album-img {
	transform: scale(1.04);
}

.album-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%);
}

.album-placeholder-icon {
	font-size: 3.5rem;
	color: var(--secondary-text);
	opacity: 0.3;
}

.badge-floating-left {
	position: absolute;
	top: 0.6rem;
	left: 0.6rem;
	z-index: 2;
}

.glass-pill {
	padding: 0.15rem 0.5rem;
	border-radius: 0.375rem;
	font-size: 0.65rem;
	font-weight: 800;
	letter-spacing: 0.06em;
	backdrop-filter: blur(8px);
	background: rgba(0, 0, 0, 0.6);
	border: 1px solid rgba(255, 255, 255, 0.15);
	color: #fff;
}

.badge-floating-right {
	position: absolute;
	top: 0.6rem;
	right: 0.6rem;
	z-index: 2;
}

.glass-delete-btn {
	width: 1.75rem;
	height: 1.75rem;
	border-radius: 9999px;
	border: none;
	background: rgba(0, 0, 0, 0.6);
	backdrop-filter: blur(8px);
	color: var(--secondary-text);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all 0.2s ease;
}

.glass-delete-btn:hover {
	background: #f43f5e;
	color: #fff;
	transform: scale(1.1);
}

.track-count-overlay {
	position: absolute;
	bottom: 0.6rem;
	right: 0.6rem;
	background: rgba(0, 0, 0, 0.7);
	backdrop-filter: blur(6px);
	color: #e2e8f0;
	padding: 0.15rem 0.5rem;
	border-radius: 0.375rem;
	font-size: 0.6875rem;
	font-weight: 600;
	letter-spacing: 0.02em;
	z-index: 2;
}

.album-hover-overlay {
	position: absolute;
	inset: 0;
	background: rgba(0, 0, 0, 0.55);
	backdrop-filter: blur(2px);
	opacity: 0;
	transition: opacity 0.2s ease;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 3;
}

.album-card:hover .album-hover-overlay {
	opacity: 1;
}

.inspect-pill {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	background: var(--primary-color);
	color: #fff;
	padding: 0.4rem 0.85rem;
	border-radius: 9999px;
	font-size: 0.8125rem;
	font-weight: 600;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.album-info {
	padding: 0.85rem;
	display: flex;
	flex-direction: column;
	flex: 1;
}

.album-title {
	font-size: 0.875rem;
	font-weight: 700;
	color: var(--foreground);
	margin: 0 0 0.25rem 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.album-artist {
	font-size: 0.75rem;
	color: var(--secondary-text);
	margin: 0 0 0.5rem 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.album-submeta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: auto;
}

.album-size {
	font-size: 0.6875rem;
	color: var(--muted-text);
	font-variant-numeric: tabular-nums;
}

/* Albums List Mode */
.albums-list-container {
	width: 100%;
}

.album-list-row {
	cursor: pointer;
}

.col-cover {
	width: 3.5rem;
	text-align: center;
}

.list-thumb-box {
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 0.5rem;
	overflow: hidden;
	background: #111;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.list-thumb-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.col-tracks {
	width: 6rem;
	text-align: center;
}

/* Artists View */
.artists-grid {
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 1rem;
}

@media (min-width: 640px) {
	.artists-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (min-width: 1024px) {
	.artists-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

.artist-card {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 1rem;
	padding: 1.25rem 1rem;
	display: flex;
	align-items: center;
	gap: 1rem;
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.artist-card:hover {
	border-color: var(--primary-color);
	transform: translateY(-2px);
	box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.25);
}

.artist-avatar-box {
	width: 3.25rem;
	height: 3.25rem;
	border-radius: 9999px;
	background: rgba(var(--primary-color-rgb, 124, 58, 237), 0.15);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.artist-avatar-icon {
	font-size: 1.75rem;
	color: var(--primary-color);
}

.artist-info {
	flex: 1;
	min-width: 0;
}

.artist-name {
	font-size: 1rem;
	font-weight: 700;
	color: var(--foreground);
	margin: 0 0 0.35rem 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.artist-meta-badges {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex-wrap: wrap;
}

.badge-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	font-size: 0.6875rem;
	font-weight: 600;
	color: var(--secondary-text);
	background: rgba(255, 255, 255, 0.05);
	border: 1px solid var(--border-color);
	padding: 0.15rem 0.45rem;
	border-radius: 0.375rem;
}

.artist-arrow {
	color: var(--secondary-text);
	display: flex;
	align-items: center;
	transition: transform 0.2s ease;
}

.artist-card:hover .artist-arrow {
	transform: translateX(4px);
	color: var(--primary-color);
}

/* All Tracks View */
.tracks-view-container {
	width: 100%;
}

.col-album {
	width: 25%;
}

.track-album-cell {
	font-size: 0.8125rem;
	color: var(--secondary-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 12rem;
}

.album-link {
	color: var(--secondary-text);
	text-decoration: none;
	transition: color 0.15s ease;
}

.album-link:hover {
	color: var(--primary-color);
	text-decoration: underline;
}

/* Empty State */
.empty-state-card {
	padding: 5rem 1.5rem;
	text-align: center;
	background: var(--card-background);
	border: 1px dashed var(--border-color);
	border-radius: 1.25rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.empty-icon-box {
	width: 4rem;
	height: 4rem;
	border-radius: 1rem;
	background: rgba(255, 255, 255, 0.04);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 1.25rem;
}

.empty-icon {
	font-size: 2.25rem;
	color: var(--secondary-text);
	opacity: 0.6;
}

.empty-title {
	font-size: 1.25rem;
	font-weight: 800;
	color: var(--foreground);
	margin-bottom: 0.5rem;
}

.empty-description {
	font-size: 0.875rem;
	color: var(--secondary-text);
	max-width: 26rem;
	line-height: 1.5;
}

/* Detail Modal */
.modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.8);
	backdrop-filter: blur(8px);
	z-index: 99999;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1.5rem;
}

.modal-card {
	background: var(--background);
	border: 1px solid var(--border-color);
	border-radius: 1.25rem;
	width: 100%;
	max-width: 48rem;
	max-height: 85vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
	animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
	from {
		opacity: 0;
		transform: scale(0.96) translateY(8px);
	}
	to {
		opacity: 1;
		transform: scale(1) translateY(0);
	}
}

.modal-header {
	padding: 1.5rem;
	border-bottom: 1px solid var(--border-color);
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1.5rem;
	background: var(--secondary-background);
}

.modal-header-main {
	display: flex;
	align-items: center;
	gap: 1.25rem;
	flex: 1;
	min-width: 0;
}

.modal-cover-box {
	width: 6rem;
	height: 6rem;
	border-radius: 0.75rem;
	overflow: hidden;
	background: #111;
	flex-shrink: 0;
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.modal-cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.modal-cover-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--secondary-text);
}

.modal-header-info {
	flex: 1;
	min-width: 0;
}

.modal-type-badge {
	font-size: 0.6875rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	color: var(--primary-color);
	text-transform: uppercase;
}

.modal-album-title {
	font-size: 1.35rem;
	font-weight: 800;
	color: var(--foreground);
	margin: 0.15rem 0 0.25rem 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.modal-album-artist {
	font-size: 0.875rem;
	color: var(--secondary-text);
	font-weight: 500;
	margin: 0 0 0.75rem 0;
}

.modal-pills-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.meta-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	font-size: 0.75rem;
	background: var(--card-background);
	border: 1px solid var(--border-color);
	padding: 0.2rem 0.55rem;
	border-radius: 0.375rem;
	color: var(--foreground);
	font-weight: 500;
}

.path-pill {
	max-width: 14rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-family: monospace;
	font-size: 0.6875rem;
}

.pill-icon {
	font-size: 0.85rem;
	color: var(--secondary-text);
}

.modal-header-actions {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.btn-delete-album {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	background: rgba(244, 63, 94, 0.12);
	border: 1px solid rgba(244, 63, 94, 0.35);
	color: #f43f5e;
	padding: 0.4rem 0.75rem;
	border-radius: 0.5rem;
	font-size: 0.75rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
}

.btn-delete-album:hover {
	background: #f43f5e;
	color: #fff;
}

.modal-close-btn {
	background: transparent;
	border: none;
	color: var(--secondary-text);
	cursor: pointer;
	padding: 0.4rem;
	border-radius: 9999px;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.15s ease;
}

.modal-close-btn:hover {
	background: rgba(255, 255, 255, 0.08);
	color: var(--foreground);
}

/* Modal Body / Tracklist */
.modal-body {
	padding: 1.25rem 1.5rem;
	overflow-y: auto;
	flex: 1;
}

.tracklist-header-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 0.85rem;
}

.tracklist-heading {
	font-size: 0.875rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--secondary-text);
}

.table-container {
	border: 1px solid var(--border-color);
	border-radius: 0.75rem;
	overflow: hidden;
}

.tracks-table {
	width: 100%;
	border-collapse: collapse;
	text-align: left;
}

.tracks-table th {
	background: var(--secondary-background);
	padding: 0.65rem 0.85rem;
	font-size: 0.75rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--secondary-text);
	border-bottom: 1px solid var(--border-color);
}

.track-row {
	border-bottom: 1px solid var(--border-color);
	transition: background-color 0.15s ease;
}

.track-row:last-child {
	border-bottom: none;
}

.track-row:hover {
	background-color: var(--table-highlight);
}

.tracks-table td {
	padding: 0.65rem 0.85rem;
	vertical-align: middle;
}

.col-num {
	width: 3.5rem;
	text-align: center;
}

.col-title {
	width: auto;
}

.col-artist {
	width: 20%;
}

.col-format {
	width: 5rem;
	text-align: center;
}

.col-size {
	width: 5.5rem;
	text-align: right;
}

.col-actions {
	width: 4rem;
	text-align: center;
}

.track-num-cell {
	font-size: 0.75rem;
	color: var(--secondary-text);
	font-weight: 600;
}

.track-title-cell {
	color: var(--foreground);
	font-size: 0.875rem;
	font-weight: 600;
}

.track-title-text {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 18rem;
}

.track-artist-mobile {
	display: none;
	font-size: 0.7rem;
	color: var(--secondary-text);
	margin-top: 0.1rem;
}

@media (max-width: 640px) {
	.col-artist { display: none; }
	.track-artist-mobile { display: block; }
}

.track-artist-cell {
	font-size: 0.8125rem;
	color: var(--secondary-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 12rem;
}

.track-format-cell {
	text-align: center;
}

.format-pill {
	display: inline-block;
	padding: 0.1rem 0.4rem;
	border-radius: 0.375rem;
	font-size: 0.625rem;
	font-weight: 800;
	letter-spacing: 0.05em;
}

.pill-flac {
	background: rgba(6, 182, 212, 0.15);
	color: #06b6d4;
	border: 1px solid rgba(6, 182, 212, 0.3);
}

.pill-wav {
	background: rgba(16, 185, 129, 0.15);
	color: #10b981;
	border: 1px solid rgba(16, 185, 129, 0.3);
}

.pill-mp3 {
	background: var(--border-color);
	color: var(--secondary-text);
	border: 1px solid var(--border-color-hover);
}

.track-size-cell {
	font-size: 0.75rem;
	color: var(--secondary-text);
	font-variant-numeric: tabular-nums;
}

.track-actions-cell {
	text-align: center;
}

.track-delete-btn {
	background: transparent;
	border: none;
	color: var(--secondary-text);
	cursor: pointer;
	padding: 0.25rem;
	border-radius: 0.375rem;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition: all 0.15s ease;
}

.track-delete-btn:hover {
	color: #f43f5e;
	background: rgba(244, 63, 94, 0.15);
}

/* Modal Footer */
.modal-footer {
	padding: 1rem 1.5rem;
	border-top: 1px solid var(--border-color);
	background: var(--secondary-background);
	display: flex;
	justify-content: flex-end;
}

/* Danger Confirmation Modal */
.confirm-modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.85);
	backdrop-filter: blur(10px);
	z-index: 100000;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1.5rem;
}

.confirm-modal-card {
	background: var(--card-background);
	border: 1px solid rgba(244, 63, 94, 0.35);
	border-radius: 1.25rem;
	width: 100%;
	max-width: 28rem;
	padding: 1.75rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(244, 63, 94, 0.15);
	animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.confirm-icon-box {
	width: 3.5rem;
	height: 3.5rem;
	border-radius: 9999px;
	background: rgba(244, 63, 94, 0.15);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 1rem;
}

.confirm-danger-icon {
	font-size: 2rem;
	color: #f43f5e;
}

.confirm-modal-title {
	font-size: 1.25rem;
	font-weight: 800;
	color: var(--foreground);
	margin: 0 0 0.5rem 0;
}

.confirm-modal-message {
	font-size: 0.875rem;
	color: var(--secondary-text);
	margin: 0 0 1.5rem 0;
	line-height: 1.5;
}

.confirm-modal-actions {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	width: 100%;
}

.confirm-cancel-btn {
	flex: 1;
	height: 2.6rem;
	border-radius: 0.75rem;
}

.confirm-delete-btn {
	flex: 1.4;
	height: 2.6rem;
	border-radius: 0.75rem;
	background: #f43f5e;
	color: #fff;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
}

.confirm-delete-btn:hover:not(:disabled) {
	background: #e11d48;
}

/* Pagination Bar */
.pagination-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 1rem;
	padding: 1rem 0.5rem;
	margin-top: 1rem;
	border-top: 1px solid var(--border-color);
}

.pagination-left {
	display: flex;
	align-items: center;
	gap: 0.65rem;
	color: var(--secondary-text);
	font-size: 0.8125rem;
}

.page-size-label {
	font-weight: 500;
}

.page-size-select {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	color: var(--foreground);
	padding: 0.25rem 0.5rem;
	border-radius: 0.5rem;
	font-size: 0.8125rem;
	font-weight: 600;
	cursor: pointer;
	outline: none;
}

.page-size-select:focus {
	border-color: var(--primary-color);
}

.page-range-text {
	font-family: monospace;
	font-size: 0.8125rem;
	color: var(--secondary-text);
}

.pagination-controls {
	display: flex;
	align-items: center;
	gap: 0.35rem;
}

.page-btn {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	color: var(--foreground);
	width: 2.2rem;
	height: 2.2rem;
	border-radius: 0.5rem;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all 0.15s ease;
}

.page-btn:hover:not(:disabled) {
	background: rgba(6, 182, 212, 0.15);
	border-color: var(--primary-color);
	color: var(--primary-color);
}

.page-btn:disabled {
	opacity: 0.35;
	cursor: not-allowed;
}

.page-info {
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--foreground);
	padding: 0 0.5rem;
}

/* Playable Row Styling */
.track-playable-row {
	cursor: pointer;
	user-select: none;
	transition: background-color 0.15s ease;
}

.track-playable-row:hover {
	background: rgba(255, 255, 255, 0.04);
}

.row-is-playing {
	background: rgba(6, 182, 212, 0.12) !important;
	border-left: 3px solid var(--primary-color, #06b6d4);
}

.row-is-playing .track-title-text {
	color: var(--primary-color, #06b6d4) !important;
	font-weight: 700;
}

.track-num-wrapper {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	margin: 0 auto;
}

.track-num-text {
	font-size: 0.8125rem;
	color: var(--secondary-text);
	font-family: monospace;
}

.row-play-btn {
	display: none;
	background: transparent;
	border: none;
	color: var(--primary-color);
	cursor: pointer;
	padding: 0;
	width: 1.75rem;
	height: 1.75rem;
	align-items: center;
	justify-content: center;
}

.track-playable-row:hover .track-num-text {
	display: none;
}

.track-playable-row:hover .row-play-btn {
	display: flex;
}

.track-playable-row:hover .playing-equalizer-icon {
	display: none;
}

.play-status-icon {
	font-size: 1.15rem;
	color: var(--primary-color);
}

/* Equalizer Bars Animation */
.playing-equalizer-icon {
	display: flex;
	align-items: flex-end;
	justify-content: center;
	gap: 2px;
	width: 1rem;
	height: 1rem;
}

.playing-equalizer-icon span {
	width: 3px;
	background: var(--primary-color, #06b6d4);
	border-radius: 1px;
	animation: eqBounce 0.9s infinite ease-in-out;
}

.playing-equalizer-icon span:nth-child(1) {
	height: 50%;
	animation-delay: 0.2s;
}

.playing-equalizer-icon span:nth-child(2) {
	height: 100%;
	animation-delay: 0.4s;
}

.playing-equalizer-icon span:nth-child(3) {
	height: 65%;
	animation-delay: 0.1s;
}

@keyframes eqBounce {
	0%, 100% { height: 25%; }
	50% { height: 100%; }
}

/* Floating Audio Player Bar */
.floating-audio-player {
	position: fixed;
	bottom: 1.25rem;
	left: 50%;
	transform: translateX(-50%);
	width: calc(100% - 2.5rem);
	max-width: 62rem;
	background: rgba(15, 23, 42, 0.94);
	backdrop-filter: blur(20px);
	border: 1px solid rgba(255, 255, 255, 0.12);
	box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.85), 0 0 30px rgba(6, 182, 212, 0.2);
	border-radius: 1.25rem;
	padding: 0.75rem 1.25rem;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1.5rem;
	z-index: 99999;
	animation: slideUpPlayer 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUpPlayer {
	from {
		opacity: 0;
		transform: translate(-50%, 25px);
	}
	to {
		opacity: 1;
		transform: translate(-50%, 0);
	}
}

/* Player Left: Track info */
.player-track-info {
	display: flex;
	align-items: center;
	gap: 0.85rem;
	min-width: 14rem;
	max-width: 20rem;
	flex-shrink: 0;
}

.player-cover-box {
	width: 3.25rem;
	height: 3.25rem;
	border-radius: 0.65rem;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.05);
	border: 1px solid rgba(255, 255, 255, 0.1);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.player-cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.player-cover-placeholder {
	font-size: 1.75rem;
	color: var(--secondary-text);
}

.player-meta {
	overflow: hidden;
	display: flex;
	flex-direction: column;
	gap: 0.2rem;
}

.player-title {
	font-size: 0.875rem;
	font-weight: 700;
	color: var(--foreground);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.player-artist {
	font-size: 0.75rem;
	color: var(--secondary-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Player Center: Controls + Scrubber */
.player-controls-center {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.4rem;
	flex: 1;
	max-width: 32rem;
}

.player-buttons-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.player-btn {
	background: transparent;
	border: none;
	color: var(--foreground);
	cursor: pointer;
	padding: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.15s ease;
	border-radius: 9999px;
}

.player-nav-btn {
	width: 2rem;
	height: 2rem;
	color: var(--secondary-text);
}

.player-nav-btn:hover:not(:disabled) {
	color: var(--foreground);
	background: rgba(255, 255, 255, 0.08);
}

.player-nav-btn:disabled {
	opacity: 0.3;
	cursor: not-allowed;
}

.player-btn-main {
	width: 2.6rem;
	height: 2.6rem;
	background: var(--primary-color, #06b6d4);
	color: #0f172a;
	box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
}

.player-btn-main:hover {
	transform: scale(1.08);
	background: #22d3ee;
}

.player-btn-main i {
	font-size: 1.6rem;
}

.player-scrubber-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	width: 100%;
}

.player-time-label {
	font-size: 0.75rem;
	font-family: monospace;
	color: var(--secondary-text);
	min-width: 2.5rem;
	text-align: center;
}

/* Custom Sliders */
.player-slider {
	-webkit-appearance: none;
	appearance: none;
	background: rgba(255, 255, 255, 0.15);
	border-radius: 9999px;
	height: 4px;
	outline: none;
	cursor: pointer;
	transition: height 0.15s ease;
}

.player-slider:hover {
	height: 6px;
}

.scrubber-slider {
	flex: 1;
}

.volume-slider {
	width: 5.5rem;
}

.player-slider::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: var(--primary-color, #06b6d4);
	cursor: pointer;
	box-shadow: 0 0 8px rgba(6, 182, 212, 0.6);
	transition: transform 0.15s ease;
}

.player-slider::-webkit-slider-thumb:hover {
	transform: scale(1.25);
}

.player-slider::-moz-range-thumb {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: var(--primary-color, #06b6d4);
	cursor: pointer;
	border: none;
	box-shadow: 0 0 8px rgba(6, 182, 212, 0.6);
}

/* Player Right: Volume + Close */
.player-actions-right {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	min-width: 11rem;
	justify-content: flex-end;
	flex-shrink: 0;
}

.player-mute-btn {
	width: 2rem;
	height: 2rem;
	color: var(--secondary-text);
}

.player-mute-btn:hover {
	color: var(--foreground);
}

.player-close-btn {
	width: 2rem;
	height: 2rem;
	color: var(--secondary-text);
	border-radius: 0.5rem;
}

.player-close-btn:hover {
	color: #f43f5e;
	background: rgba(244, 63, 94, 0.15);
}

@media (max-width: 768px) {
	.floating-audio-player {
		bottom: 0.75rem;
		width: calc(100% - 1rem);
		padding: 0.65rem 0.85rem;
		gap: 0.75rem;
	}

	.player-actions-right {
		display: none;
	}

	.player-track-info {
		min-width: 0;
		max-width: 9rem;
	}
}

/* Track Match Badges on Album Cards */
.track-match-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	margin-top: 0.35rem;
	padding: 0.15rem 0.45rem;
	border-radius: 0.375rem;
	background: rgba(6, 182, 212, 0.15);
	border: 1px solid rgba(6, 182, 212, 0.35);
	color: #06b6d4;
	font-size: 0.6875rem;
	font-weight: 600;
	max-width: 100%;
}

.track-match-badge-list {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	margin-top: 0.2rem;
	padding: 0.1rem 0.4rem;
	border-radius: 0.375rem;
	background: rgba(6, 182, 212, 0.15);
	border: 1px solid rgba(6, 182, 212, 0.35);
	color: #06b6d4;
	font-size: 0.6875rem;
	font-weight: 600;
	max-width: 22rem;
}

.track-match-icon {
	font-size: 0.8rem;
	flex-shrink: 0;
}

.track-match-text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.track-match-more {
	font-size: 0.625rem;
	background: rgba(6, 182, 212, 0.3);
	padding: 0 0.25rem;
	border-radius: 0.25rem;
	flex-shrink: 0;
}
</style>
