<template>
	<main
		id="content"
		ref="content"
		aria-label="main content"
		@scroll="$route.name === 'Search' ? handleContentScroll($event) : null"
	>
		<div id="container">
			<BackButton v-if="showBackButton" class="sticky -ml-20" style="top: 1rem" />

			<keep-alive>
				<router-view
					v-if="!$route.meta.notKeepAlive"
					:key="$route.fullPath"
					:class="{ '-mt-16': showBackButton }"
					:perform-scrolled-search="performScrolledSearch"
				></router-view>
			</keep-alive>

			<router-view
				v-if="$route.meta.notKeepAlive"
				:key="$route.fullPath"
				:class="{ '-mt-16': showBackButton }"
				:perform-scrolled-search="performScrolledSearch"
			></router-view>
		</div>
	</main>
</template>

<script>
import BackButton from '@components/globals/BackButton.vue'
import { debounce } from '@/utils/utils'

export default {
	components: {
		BackButton
	},
	data: () => ({
		performScrolledSearch: false
	}),
	computed: {
		showBackButton() {
			return ['Tracklist', 'Artist', 'Album', 'Playlist', 'Spotify Playlist'].includes(this.$route.name)
		}
	},
	mounted() {
		this.$router.beforeEach((_, __, next) => {
			this.$refs.content.scrollTo(0, 0)
			next()
		})
	},
	methods: {
		handleContentScroll: debounce(async function () {
			if (this.$refs.content.scrollTop + this.$refs.content.clientHeight < this.$refs.content.scrollHeight) return
			this.performScrolledSearch = true

			await this.$nextTick()

			this.performScrolledSearch = false
		}, 100)
	}
}
</script>

<style>
#container {
	margin: 0 auto;
	max-width: 1400px;
	width: 94%;
	padding-bottom: 3rem;
}

@media only screen and (min-width: 768px) {
	#container {
		width: 92%;
	}
}

@media only screen and (min-width: 1280px) {
	#container {
		width: 90%;
	}
}

main {
	background-color: var(--main-background);
	padding: 0 1rem;
	width: 100%;
	flex: 1 1 auto;
	overflow-y: auto;
	overflow-x: hidden;
}

main::-webkit-scrollbar {
	width: 8px;
}

main::-webkit-scrollbar-track {
	background: transparent;
}

main::-webkit-scrollbar-thumb {
	background: var(--main-scroll);
	border-radius: 9999px;
}

main::-webkit-scrollbar-thumb:hover {
	background: var(--secondary-text);
}
</style>
