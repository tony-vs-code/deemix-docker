import { ref, watch } from '@vue/composition-api'

/**
 * @typedef	{string}	Theme
 */

const THEMES = {
	dark: 'dark',
	light: 'light'
}

let savedTheme = localStorage.getItem('selectedTheme') || document.documentElement.dataset.theme
if (savedTheme !== THEMES.dark && savedTheme !== THEMES.light) {
	savedTheme = THEMES.dark
}

const currentTheme = ref(savedTheme)
document.documentElement.dataset.theme = savedTheme

watch(currentTheme, (newTheme, oldTheme) => {
	if (oldTheme === newTheme) return

	localStorage.setItem('selectedTheme', newTheme)
	document.documentElement.dataset.theme = newTheme

	animateAllElements()
})

function animateAllElements() {
	const allElements = document.querySelectorAll('*')

	allElements.forEach(el => {
		el.classList.add('changing-theme')
	})

	document.documentElement.addEventListener('transitionend', function transitionHandler() {
		allElements.forEach(el => {
			el.classList.remove('changing-theme')
		})

		document.documentElement.removeEventListener('transitionend', transitionHandler)
	})
}

function toggleTheme() {
	currentTheme.value = currentTheme.value === THEMES.dark ? THEMES.light : THEMES.dark
}

export const useTheme = () => ({
	THEMES,
	currentTheme,
	toggleTheme
})
