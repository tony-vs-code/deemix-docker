<template>
	<div class="home-page">
		<!-- Page Header -->
		<div class="page-header">
			<div class="header-titles">
				<h1 class="page-title">
					<i class="material-icons title-icon">home</i>
					{{ $t('globals.welcome') }}
				</h1>
				<p class="page-subtitle">
					Discover trending releases, featured albums, and popular playlists
				</p>
			</div>
		</div>

		<!-- Login Alert Banner -->
		<section v-if="!isLoggedIn" ref="notLogged" class="login-banner glass-panel">
			<div class="login-banner-content">
				<div class="login-icon-box">
					<i class="material-icons login-icon">lock</i>
				</div>
				<div class="login-info">
					<h3 class="login-title">{{ $t('home.needTologin') }}</h3>
					<p class="login-desc">Configure your Deezer account or ARL token in Settings to enable lossless downloads and your personal library.</p>
				</div>
			</div>
			<router-link custom v-slot="{ navigate }" :to="{ name: 'Settings' }">
				<button class="btn btn-primary login-btn" @click="navigate" @keypress.enter="navigate">
					<i class="material-icons btn-icon">settings</i>
					<span>{{ $t('home.openSettings') }}</span>
				</button>
			</router-link>
		</section>

		<!-- Popular Playlists Section -->
		<section v-if="playlists.length" class="home-section">
			<div class="section-header">
				<div class="section-title-wrapper">
					<i class="material-icons section-icon section-icon-playlists">queue_music</i>
					<h2 class="section-title">{{ $t('home.sections.popularPlaylists') }}</h2>
				</div>
				<span class="section-count-badge">{{ playlists.length }}</span>
			</div>

			<div class="media-grid">
				<router-link
					v-for="release in playlists"
					:key="release.id"
					custom
					v-slot="{ navigate }"
					:to="{ name: 'Playlist', params: { id: release.id } }"
					tabindex="0"
					@keyup.enter.native="$router.push({ name: 'Playlist', params: { id: release.id } })"
				>
					<div class="media-card" @click="navigate" @keypress.enter="navigate" role="link">
						<div class="media-cover-wrapper">
							<img
								:src="release.picture_medium"
								:alt="release.title"
								class="media-cover-img"
								loading="lazy"
							/>
							<div class="media-overlay">
								<button
									type="button"
									class="quick-download-btn"
									:data-link="release.link"
									:title="$t('globals.download_hint')"
									@click.stop="addToQueue"
								>
									<i class="material-icons">cloud_download</i>
								</button>
							</div>
						</div>
						<div class="media-details">
							<h3 class="media-title" :title="release.title">{{ release.title }}</h3>
							<p class="media-meta" :title="release.user ? release.user.name : ''">
								{{ release.user ? release.user.name : '' }}
								<span v-if="release.nb_tracks" class="meta-dot">•</span>
								<span v-if="release.nb_tracks">{{ $tc('globals.listTabs.trackN', release.nb_tracks) }}</span>
							</p>
						</div>
					</div>
				</router-link>
			</div>
		</section>

		<!-- Popular Albums Section -->
		<section v-if="albums.length" class="home-section">
			<div class="section-header">
				<div class="section-title-wrapper">
					<i class="material-icons section-icon section-icon-albums">album</i>
					<h2 class="section-title">{{ $t('home.sections.popularAlbums') }}</h2>
				</div>
				<span class="section-count-badge">{{ albums.length }}</span>
			</div>

			<div class="media-grid">
				<router-link
					v-for="release in albums"
					:key="release.id"
					custom
					v-slot="{ navigate }"
					:to="{ name: 'Album', params: { id: release.id } }"
					:data-id="release.id"
					tabindex="0"
					@keyup.enter.native="$router.push({ name: 'Album', params: { id: release.id } })"
				>
					<div class="media-card" @click="navigate" @keypress.enter="navigate" role="link">
						<div class="media-cover-wrapper">
							<img
								:src="release.cover_medium"
								:alt="release.title"
								class="media-cover-img"
								loading="lazy"
							/>
							<div class="media-overlay">
								<button
									type="button"
									class="quick-download-btn"
									:data-link="release.link"
									:title="$t('globals.download_hint')"
									@click.stop="addToQueue"
								>
									<i class="material-icons">cloud_download</i>
								</button>
							</div>
						</div>
						<div class="media-details">
							<h3 class="media-title" :title="release.title">{{ release.title }}</h3>
							<p class="media-meta" :title="release.artist ? release.artist.name : ''">
								{{ release.artist ? release.artist.name : '' }}
							</p>
						</div>
					</div>
				</router-link>
			</div>
		</section>
	</div>
</template>

<script>
import { mapGetters } from 'vuex'
import { sendAddToQueue } from '@/utils/downloads'
import { getHomeData } from '@/data/home'

export default {
	name: 'Home',
	data() {
		return {
			playlists: [],
			albums: []
		}
	},
	computed: {
		...mapGetters(['isLoggedIn'])
	},
	async created() {
		try {
			const homeData = await getHomeData()
			this.initHome(homeData)
		} catch (err) {
			console.error('Failed to load home data:', err)
		}
	},
	methods: {
		addToQueue(e) {
			const link = e.currentTarget.dataset.link
			if (link) {
				sendAddToQueue(link)
			}
		},
		initHome(data) {
			if (!data) return
			const {
				playlists: { data: playlistData = [] } = {},
				albums: { data: albumData = [] } = {}
			} = data

			this.playlists = playlistData
			this.albums = albumData
		}
	}
}
</script>

<style scoped>
.home-page {
	padding-bottom: 3rem;
}

/* Page Header */
.page-header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 2rem;
	gap: 1rem;
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

.title-icon {
	font-size: 2.25rem;
	color: var(--primary-color);
	margin-right: 0.75rem;
}

.page-subtitle {
	font-size: 0.875rem;
	color: var(--secondary-text);
	margin-top: 0.35rem;
	margin-bottom: 0;
}

/* Login Banner */
.login-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1.5rem;
	padding: 1.25rem 1.5rem;
	border-radius: 1rem;
	margin-bottom: 2.5rem;
	background: rgba(245, 158, 11, 0.08);
	border: 1px solid rgba(245, 158, 11, 0.25);
}

.login-banner-content {
	display: flex;
	align-items: center;
	gap: 1.25rem;
}

.login-icon-box {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 3rem;
	height: 3rem;
	border-radius: 0.75rem;
	background: rgba(245, 158, 11, 0.15);
	color: #f59e0b;
	flex-shrink: 0;
}

.login-icon {
	font-size: 1.75rem;
}

.login-title {
	font-size: 1rem;
	font-weight: 700;
	color: var(--foreground);
	margin: 0 0 0.25rem 0;
}

.login-desc {
	font-size: 0.8125rem;
	color: var(--secondary-text);
	margin: 0;
	line-height: 1.4;
}

.login-btn {
	flex-shrink: 0;
	gap: 0.5rem;
}

/* Sections */
.home-section {
	margin-bottom: 2.5rem;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 1.25rem;
	padding-bottom: 0.75rem;
	border-bottom: 1px solid var(--border-color);
}

.section-title-wrapper {
	display: flex;
	align-items: center;
	gap: 0.625rem;
}

.section-icon {
	font-size: 1.5rem;
}

.section-icon-playlists {
	color: #06b6d4;
}

.section-icon-albums {
	color: var(--primary-color);
}

.section-title {
	font-size: 1.35rem;
	font-weight: 700;
	color: var(--foreground);
	margin: 0;
	letter-spacing: -0.015em;
}

.section-count-badge {
	font-size: 0.75rem;
	font-weight: 700;
	color: var(--secondary-text);
	background: var(--card-background);
	border: 1px solid var(--border-color);
	padding: 0.2rem 0.6rem;
	border-radius: 9999px;
}

/* Media Card Grid */
.media-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr));
	gap: 1.25rem;
}

.media-card {
	background: var(--card-background);
	border: 1px solid var(--border-color);
	border-radius: 1rem;
	padding: 0.875rem;
	cursor: pointer;
	transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
	display: flex;
	flex-direction: column;
	outline: none;
	height: 100%;
}

.media-card:hover {
	transform: translateY(-4px);
	border-color: var(--border-color-hover);
	box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.35);
}

.media-card:focus-visible {
	border-color: var(--primary-color);
	box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
}

.media-cover-wrapper {
	position: relative;
	width: 100%;
	aspect-ratio: 1 / 1;
	border-radius: 0.75rem;
	overflow: hidden;
	background: #090d16;
	margin-bottom: 0.875rem;
}

.media-cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.35s ease;
}

.media-card:hover .media-cover-img {
	transform: scale(1.05);
}

.media-overlay {
	position: absolute;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: opacity 0.2s ease;
	backdrop-filter: blur(2px);
}

.media-card:hover .media-overlay {
	opacity: 1;
}

.quick-download-btn {
	width: 3rem;
	height: 3rem;
	border-radius: 9999px;
	background: var(--primary-gradient);
	border: none;
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
	transition: transform 0.2s ease, filter 0.2s ease;
}

.quick-download-btn:hover {
	transform: scale(1.1);
	filter: brightness(1.1);
}

.quick-download-btn i {
	font-size: 1.4rem;
}

.media-details {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	min-width: 0;
}

.media-title {
	font-size: 0.9375rem;
	font-weight: 700;
	color: var(--foreground);
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	transition: color 0.15s ease;
}

.media-card:hover .media-title {
	color: var(--primary-color);
}

.media-meta {
	font-size: 0.8125rem;
	color: var(--secondary-text);
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	display: flex;
	align-items: center;
	gap: 0.35rem;
}

.meta-dot {
	font-size: 0.65rem;
	opacity: 0.6;
}

@media (max-width: 640px) {
	.login-banner {
		flex-direction: column;
		align-items: flex-start;
	}
	.media-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.875rem;
	}
}
</style>
