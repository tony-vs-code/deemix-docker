<template>
	<header id="search-container" aria-label="searchbar" :class="{ 'with-button': showSearchButton }">
		<div class="search-wrapper">
			<div class="search-icon-wrapper">
				<i class="material-icons search-icon">search</i>
			</div>

			<input
				id="searchbar"
				ref="searchbar"
				class="search-input"
				autocomplete="off"
				type="search"
				name="searchbar"
				:value="inputValue"
				:placeholder="$t('searchbar')"
				autofocus
				@input="inputValue = $event.target.value"
				@keyup="keyPerformSearch($event)"
			/>

			<!-- Clear Button -->
			<button
				v-if="inputValue"
				class="clear-btn"
				title="Clear search"
				@click="clearSearch"
			>
				<i class="material-icons text-base">close</i>
			</button>

			<!-- Ctrl+K Keyboard Hint -->
			<div class="shortcut-badge hidden sm:flex">
				<span>Ctrl</span>
				<span>K</span>
			</div>

			<!-- Optional Search Action Button -->
			<button
				v-if="showSearchButton"
				class="search-action-btn"
				title="Search"
				@contextmenu="rightClickPerformSearch"
				@click="clickPerformSearch"
			>
				<i class="material-icons">arrow_forward</i>
			</button>
		</div>
	</header>
</template>

<script>
import { mapGetters } from 'vuex'
import { defineComponent, ref } from '@vue/composition-api'
import { isValidURL } from '@/utils/utils'
import { sendAddToQueue } from '@/utils/downloads'
import { fetchData } from '@/utils/api'
import EventBus from '@/utils/EventBus'

export default defineComponent({
	name: 'TheSearchBar',
	setup() {
		return {
			lastTextSearch: ref(''),
			inputValue: ref('')
		}
	},
	computed: {
		...mapGetters({
			showSearchButton: 'getShowSearchButton'
		})
	},
	created() {
		const focusSearchBar = keyEvent => {
			// Ctrl+F or Ctrl+K or Cmd+K
			if ((keyEvent.keyCode === 70 && keyEvent.ctrlKey) || (keyEvent.keyCode === 75 && (keyEvent.ctrlKey || keyEvent.metaKey))) {
				keyEvent.preventDefault()
				this.$refs.searchbar.focus()
			}
		}

		const deleteSearchBarContent = keyEvent => {
			if (!(keyEvent.key === 'Backspace' && keyEvent.ctrlKey && keyEvent.shiftKey)) return
			this.clearSearch()
		}

		document.addEventListener('keydown', focusSearchBar)
		document.addEventListener('keyup', deleteSearchBarContent)

		this.$on('hook:destroyed', () => {
			document.removeEventListener('keydown', focusSearchBar)
			document.removeEventListener('keyup', deleteSearchBarContent)
		})
	},
	methods: {
		clearSearch() {
			this.inputValue = ''
			if (this.$refs.searchbar) {
				this.$refs.searchbar.value = ''
				this.$refs.searchbar.focus()
			}
		},
		async clickPerformSearch(ev) {
			ev.preventDefault()
			const term = this.$refs.searchbar.value
			if (!term) return
			await this.performSearch(term, false)
		},
		async rightClickPerformSearch(ev) {
			ev.preventDefault()
			ev.stopPropagation()
			const term = this.$refs.searchbar.value
			if (!term) return
			await this.performSearch(term, true)
		},
		async keyPerformSearch(keyEvent) {
			if (keyEvent.key === 'Escape') {
				this.clearSearch()
				return
			}
			const isEnterPressed = keyEvent.keyCode === 13
			if (!isEnterPressed) return

			const term = this.$refs.searchbar.value
			if (!term) return

			const isCtrlPressed = keyEvent.ctrlKey
			await this.performSearch(term, isCtrlPressed)
		},
		async performSearch(term, modifierKey) {
			const isSearchingURL = isValidURL(term)
			const isShowingAnalyzer = this.$route.name === 'Link Analyzer'
			const isShowingSearch = this.$route.name === 'Search'
			const isSameAsLastSearch = term === this.lastTextSearch

			if (isSearchingURL) {
				if (modifierKey) {
					this.$root.$emit('ContextMenu:searchbar', term)
					return
				}

				if (isShowingAnalyzer) {
					try {
						const analyzedData = await fetchData('analyzeLink', { term })
						const isError = !!analyzedData.errorCode

						if (isError) {
							EventBus.$emit('analyze_notSupported', analyzedData)
							return
						}

						if (analyzedData.type === 'track') {
							EventBus.$emit('analyze_track', analyzedData)
						}

						if (analyzedData.type === 'album') {
							EventBus.$emit('analyze_album', analyzedData)
						}
						return
					} catch (error) {
						console.error(error)
						return
					}
				}

				sendAddToQueue(term)
			} else {
				if (isShowingSearch && isSameAsLastSearch) return

				this.lastTextSearch = term
				await this.$router.push({
					name: 'Search',
					query: {
						term
					}
				})
			}
		}
	}
})
</script>

<style scoped>
#search-container {
	padding: 0.85rem 1.5rem 0.85rem 1.5rem;
	width: 100%;
	display: flex;
	align-items: center;
	position: relative;
	z-index: 20;
}

.search-wrapper {
	width: 100%;
	display: flex;
	align-items: center;
	background: var(--surface-glass);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	border: 1px solid var(--border-color);
	border-radius: 0.875rem;
	padding: 0 0.85rem;
	height: 2.85rem;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.search-wrapper:focus-within {
	border-color: var(--primary-color);
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25), 0 4px 12px rgba(0, 0, 0, 0.2);
}

.search-icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--secondary-text);
	margin-right: 0.5rem;
}

.search-icon {
	font-size: 1.35rem;
	transition: color 0.2s ease;
}

.search-wrapper:focus-within .search-icon {
	color: var(--primary-color);
}

.search-input {
	flex: 1;
	min-width: 0;
	height: 100%;
	border: none !important;
	outline: none !important;
	background: transparent !important;
	color: var(--foreground) !important;
	font-size: 0.9375rem !important;
	font-weight: 400 !important;
	padding: 0 !important;
	box-shadow: none !important;
}

.search-input::placeholder {
	color: var(--muted-text);
}

/* Hide default webkit search cancel button */
.search-input::-webkit-search-cancel-button {
	-webkit-appearance: none;
	appearance: none;
	display: none;
}

.clear-btn {
	background: transparent;
	border: none;
	color: var(--secondary-text);
	padding: 0.25rem;
	border-radius: 9999px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	margin-right: 0.5rem;
	transition: color 0.15s ease, background-color 0.15s ease;
}

.clear-btn:hover {
	color: var(--foreground);
	background-color: var(--border-color);
}

.shortcut-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	padding: 0.2rem 0.5rem;
	border-radius: 0.375rem;
	background: var(--border-color);
	border: 1px solid var(--border-color-hover);
	color: var(--muted-text);
	font-size: 0.6875rem;
	font-weight: 600;
	letter-spacing: 0.05em;
	user-select: none;
}

.search-action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--primary-gradient);
	color: #ffffff;
	border: none;
	height: 2rem;
	width: 2rem;
	border-radius: 0.5rem;
	margin-left: 0.5rem;
	cursor: pointer;
	transition: all 0.2s ease;
}

.search-action-btn:hover {
	transform: scale(1.05);
	filter: brightness(1.1);
}

.search-action-btn i {
	font-size: 1.15rem;
}
</style>
