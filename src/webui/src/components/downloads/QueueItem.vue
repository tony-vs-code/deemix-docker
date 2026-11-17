<template>
	<div class="download-object queue-item-card" :data-link-only="generateLink">
		<div class="download-info">
			<!-- Cover Art with Tag -->
			<div class="coverart-wrapper">
				<img :src="queueItem.cover" :alt="`Cover ${queueItem.title}`" class="coverart-img" />
				<span v-if="showTags" class="tag-pill" :class="tagColorClass">{{ bitrateText }}</span>
			</div>

			<!-- Metadata -->
			<div class="download-info-data">
				<div class="download-title-row">
					<i v-if="queueItem.explicit" class="material-icons explicit-icon" title="Explicit">explicit</i>
					<span class="download-title" :title="queueItem.title">{{ queueItem.title }}</span>
				</div>
				<span class="download-slim-separator"> - </span>
				<span class="download-artist" :title="queueItem.artist">{{ queueItem.artist }}</span>
			</div>

			<!-- Status & Error Indicator -->
			<div class="download-info-status">
				<span class="status-counter-pill"> {{ queueItem.downloaded + queueItem.failed }}/{{ queueItem.size }} </span>

				<button
					v-if="hasFails"
					type="button"
					class="status-fail-btn"
					:title="`${queueItem.failed} errors - click to view`"
					@click="hasFails ? $emit('show-errors', queueItem) : null"
				>
					<span>{{ queueItem.failed }}</span>
					<i class="material-icons fail-icon">error_outline</i>
				</button>
			</div>
		</div>

		<!-- Progress Bar & Action Icon -->
		<div class="download-bar">
			<div class="progress-track">
				<div :class="barClass" :style="barStyle"></div>
			</div>
			<button
				v-if="!isLoading"
				type="button"
				class="queue-action-btn"
				:class="actionBtnClass"
				:title="actionBtnHint"
				@click="onResultIconClick"
			>
				<i class="material-icons queue-action-icon">{{ resultIconText }}</i>
			</button>
			<div v-else class="circle-loader-modern">
				<i class="material-icons spin-active loading-spinner">sync</i>
			</div>
		</div>
	</div>
</template>

<script>
const possibleStates = ['converting', 'downloading', 'download finished', 'completed']

export default {
	name: 'QueueItem',
	props: {
		queueItem: {
			type: Object,
			default: () => ({})
		},
		showTags: Boolean
	},
	data() {
		return {
			isLoading: false
		}
	},
	computed: {
		hasFails() {
			return this.queueItem.failed >= 1
		},
		hasErrors() {
			return this.queueItem.errors && this.queueItem.errors.length >= 1
		},
		allFailed() {
			let allFailed = false

			if (this.queueItem.status === 'download finished') {
				allFailed = this.queueItem.size !== 0 && this.queueItem.failed === this.queueItem.size
			}

			return allFailed
		},
		finishedWithFails() {
			return this.queueItem.status === 'download finished' && (this.hasFails || this.hasErrors)
		},
		isDeterminateStatus() {
			return possibleStates.includes(this.queueItem.status)
		},
		barClass() {
			return {
				converting: this.queueItem.status === 'converting',
				indeterminate: !this.isDeterminateStatus,
				determinate: this.isDeterminateStatus
			}
		},
		barStyle() {
			let width = 0
			let background = 'var(--primary-gradient)'

			if (this.hasFails || this.hasErrors) {
				background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
			} else if (this.queueItem.status === 'download finished') {
				background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
			}

			if (this.allFailed) {
				background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
			}

			if (this.queueItem.status === 'download finished') {
				width = 100
			}

			if (this.queueItem.status === 'downloading') {
				width = this.queueItem.progress || 0
				background = 'var(--primary-gradient)'
			}

			if (this.queueItem.status === 'converting') {
				width = 100 - (this.queueItem.conversion || 0)
				background = 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)'
			}

			return {
				width: `${width}%`,
				background
			}
		},
		resultIconText() {
			let text = 'delete_forever'

			if (this.queueItem.status === 'download finished') {
				if (!(this.hasFails || this.hasErrors)) {
					text = 'done'
				} else if (this.queueItem.failed >= this.queueItem.size) {
					text = 'error'
				} else {
					text = 'warning'
				}
			}

			return text
		},
		actionBtnClass() {
			return {
				'icon-success': this.resultIconText === 'done',
				'icon-warning': this.resultIconText === 'warning',
				'icon-error': this.resultIconText === 'error',
				'icon-delete': this.resultIconText === 'delete_forever',
				clickable: this.finishedWithFails || this.resultIconText === 'delete_forever'
			}
		},
		actionBtnHint() {
			if (this.finishedWithFails) return 'Retry download'
			if (this.resultIconText === 'delete_forever') return 'Remove from queue'
			if (this.resultIconText === 'done') return 'Completed'
			return ''
		},
		tagColorClass() {
			const b = parseInt(this.queueItem.bitrate)
			if (b === 9) return 'tag-flac'
			if (b === 3) return 'tag-320'
			return 'tag-default'
		},
		generateLink() {
			switch (this.queueItem.type) {
				case 'track':
					return `https://deezer.com/track/${this.queueItem.id}`
				case 'album':
					return `https://deezer.com/album/${this.queueItem.id}`
				case 'playlist':
					if (this.queueItem.id && this.queueItem.id.endsWith('_top_track')) {
						return `https://www.deezer.com/artist/${this.queueItem.id.slice(0, -10)}/top_track`
					}
					return `https://deezer.com/playlist/${this.queueItem.id}`
				case 'spotify_playlist':
					return `https://open.spotify.com/playlist/${this.queueItem.id}`
				default:
					return ''
			}
		},
		bitrateText() {
			switch (parseInt(this.queueItem.bitrate)) {
				case 9:
					return 'FLAC'
				case 3:
					return '320'
				case 1:
					return '128'
				case 15:
					return '360HQ'
				case 14:
					return '360MQ'
				case 13:
					return '360LQ'
				default:
					return 'MISC'
			}
		}
	},
	methods: {
		onResultIconClick() {
			if (this.isDeterminateStatus) {
				if (this.finishedWithFails) {
					this.$emit('retry-download', this.queueItem.uuid)
				}

				if (this.queueItem.status === 'downloading') {
					this.isLoading = true
					this.$emit('remove-item', this.queueItem.uuid)
				}
			} else {
				this.isLoading = true
				this.$emit('remove-item', this.queueItem.uuid)
			}
		}
	}
}
</script>

<style scoped>
.queue-item-card {
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid var(--border-color);
	border-radius: 0.75rem;
	padding: 0.65rem 0.75rem;
	margin-bottom: 0.65rem;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.queue-item-card:hover {
	border-color: var(--border-color-hover);
	background: rgba(255, 255, 255, 0.05);
}

.download-info {
	display: flex;
	align-items: center;
	gap: 0.65rem;
	margin-bottom: 0.5rem;
}

/* Cover Art with Tag */
.coverart-wrapper {
	position: relative;
	width: 3.5rem;
	height: 3.5rem;
	border-radius: 0.5rem;
	overflow: hidden;
	flex-shrink: 0;
	background: #090d16;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.35);
}

.coverart-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.tag-pill {
	position: absolute;
	bottom: 0.15rem;
	right: 0.15rem;
	font-size: 0.5625rem;
	font-weight: 800;
	padding: 0.05rem 0.3rem;
	border-radius: 0.25rem;
	letter-spacing: 0.05em;
	text-transform: uppercase;
}

.tag-flac {
	background: rgba(6, 182, 212, 0.9);
	color: #ffffff;
}

.tag-320 {
	background: rgba(59, 130, 246, 0.9);
	color: #ffffff;
}

.tag-default {
	background: rgba(100, 116, 139, 0.9);
	color: #ffffff;
}

/* Metadata */
.download-info-data {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
}

.download-title-row {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}

.download-title {
	font-size: 0.8125rem;
	font-weight: 700;
	color: var(--foreground);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.explicit-icon {
	font-size: 0.95rem;
	color: #ef4444;
	flex-shrink: 0;
}

.download-artist {
	font-size: 0.75rem;
	color: var(--secondary-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.download-slim-separator {
	display: none;
}

/* Status & Errors */
.download-info-status {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 0.25rem;
	flex-shrink: 0;
}

.status-counter-pill {
	font-size: 0.6875rem;
	font-family: monospace;
	font-weight: 700;
	color: var(--secondary-text);
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid var(--border-color);
	padding: 0.15rem 0.4rem;
	border-radius: 0.35rem;
	white-space: nowrap;
}

.status-fail-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.2rem;
	font-size: 0.6875rem;
	font-weight: 700;
	color: #f43f5e;
	background: rgba(244, 63, 94, 0.12);
	border: 1px solid rgba(244, 63, 94, 0.3);
	padding: 0.1rem 0.35rem;
	border-radius: 0.35rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.status-fail-btn:hover {
	background: rgba(244, 63, 94, 0.2);
}

.fail-icon {
	font-size: 0.85rem;
}

/* Progress Bar & Actions */
.download-bar {
	display: flex;
	align-items: center;
	gap: 0.65rem;
	height: 1.5rem;
}

.progress-track {
	position: relative;
	height: 5px;
	flex: 1;
	background-color: rgba(255, 255, 255, 0.08);
	border-radius: 9999px;
	overflow: hidden;
}

.determinate {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	border-radius: 9999px;
	transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.converting {
	transition: none !important;
}

.indeterminate {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	width: 100%;
	border-radius: 9999px;
	background: var(--primary-gradient);
}

.indeterminate::before {
	content: '';
	position: absolute;
	background-color: inherit;
	top: 0;
	left: 0;
	bottom: 0;
	will-change: left, right;
	animation: indeterminate 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
}

.indeterminate::after {
	content: '';
	position: absolute;
	background-color: inherit;
	top: 0;
	left: 0;
	bottom: 0;
	will-change: left, right;
	animation: indeterminate-short 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
	animation-delay: 1.15s;
}

@keyframes indeterminate {
	0% {
		left: -35%;
		right: 100%;
	}
	60% {
		left: 100%;
		right: -90%;
	}
	100% {
		left: 100%;
		right: -90%;
	}
}

@keyframes indeterminate-short {
	0% {
		left: -200%;
		right: 100%;
	}
	60% {
		left: 107%;
		right: -8%;
	}
	100% {
		left: 107%;
		right: -8%;
	}
}

/* Action Icon */
.queue-action-btn {
	background: transparent;
	border: none;
	width: 1.65rem;
	height: 1.65rem;
	border-radius: 0.375rem;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: var(--secondary-text);
	transition: all 0.15s ease;
	flex-shrink: 0;
}

.queue-action-icon {
	font-size: 1.15rem;
}

.queue-action-btn.icon-success {
	color: #10b981;
}

.queue-action-btn.icon-warning {
	color: #f59e0b;
}

.queue-action-btn.icon-error {
	color: #ef4444;
}

.queue-action-btn.icon-delete:hover {
	color: #ef4444;
	background: rgba(239, 68, 68, 0.12);
}

.circle-loader-modern {
	width: 1.65rem;
	height: 1.65rem;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--primary-color);
	flex-shrink: 0;
}

.loading-spinner {
	font-size: 1.15rem;
}

.spin-active {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

/* Slim Mode Support */
#download_list.slim .download-info {
	display: block;
}

#download_list.slim .coverart-wrapper {
	display: none;
}

#download_list.slim .download-title {
	display: inline-block;
}

#download_list.slim .download-slim-separator {
	display: inline-block;
}

#download_list.slim .download-artist {
	display: inline-block;
}

#download_list.slim .download-info-data {
	width: calc(75% - 8px);
	display: inline-block;
}

#download_list.slim .download-info-status {
	width: 25%;
	display: inline-block;
	float: right;
}
</style>
