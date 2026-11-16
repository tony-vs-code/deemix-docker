<template>
	<div class="info-arl-page">
		<!-- Page Header -->
		<div class="page-header">
			<div class="header-titles">
				<div class="breadcrumb-row">
					<router-link :to="{ name: 'Settings' }" class="breadcrumb-link">
						<i class="material-icons text-sm">arrow_back</i>
						<span>Back to Settings</span>
					</router-link>
				</div>
				<h1 class="page-title">
					<i class="material-icons title-icon">vpn_key</i>
					{{ $t('settings.login.arl.question') }}
				</h1>
				<p class="page-subtitle">
					Everything you need to know about Deezer session cookies, 90-day lifespans, and extracting your ARL token
				</p>
			</div>

			<div class="header-actions">
				<router-link :to="{ name: 'Settings' }" class="btn btn-primary action-btn">
					<i class="material-icons btn-icon">tune</i>
					<span>Go to Settings</span>
				</router-link>
			</div>
		</div>

		<div class="info-content space-y-6">
			<!-- Overview & Security Grid -->
			<div class="overview-grid">
				<!-- What is ARL Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-cyan">
							<i class="material-icons">info</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">What is an ARL Cookie?</h3>
							<p class="card-subtitle">How Deezer session authentication works</p>
						</div>
					</div>
					<div class="card-body space-y-3">
						<p class="text-secondary text-sm leading-relaxed">
							{{ $t('settings.login.arl.howTo.prologue.p1') }}
							{{ $t('settings.login.arl.howTo.prologue.p2') }}
						</p>
						<p class="text-secondary text-sm leading-relaxed">
							{{ $t('settings.login.arl.howTo.prologue.p3') }}
						</p>
						<div class="session-duration-pill">
							<i class="material-icons text-emerald-400 text-sm">schedule</i>
							<span>Standard Validity: <strong>90 Days</strong> (3 Months)</span>
						</div>
					</div>
				</div>

				<!-- Security Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-amber">
							<i class="material-icons">security</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">Security & Privacy</h3>
							<p class="card-subtitle">Protecting your account credentials</p>
						</div>
					</div>
					<div class="card-body space-y-3">
						<p class="text-secondary text-sm leading-relaxed">
							Your <strong>ARL</strong> gives direct access to stream and download from your Deezer account. Treat it
							like a password.
						</p>
						<div class="security-warning-box">
							<i class="material-icons text-amber-400 text-base">warning_amber</i>
							<span
								><strong>Do NOT share</strong> your ARL cookie with anyone, in chat channels, or in public GitHub
								issues.</span
							>
						</div>
						<p class="text-secondary text-xs">
							{{ $t('settings.login.arl.howTo.prologue.warning') }}
						</p>
					</div>
				</div>
			</div>

			<!-- Interactive Browser Tutorial Card -->
			<div class="settings-card">
				<div class="card-header">
					<div class="card-icon-box card-icon-indigo">
						<i class="material-icons">web</i>
					</div>
					<div class="card-titles">
						<h3 class="card-title">Step-by-Step Browser Guides</h3>
						<p class="card-subtitle">Choose your preferred browser below to view visual instructions</p>
					</div>
				</div>

				<div class="card-body space-y-5">
					<!-- Browser Tabs Navigation -->
					<div class="guide-tabs-bar">
						<button
							type="button"
							class="guide-tab-item"
							:class="{ 'guide-tab-item--active': activeTab === 'chrome-easy' }"
							@click="activeTab = 'chrome-easy'"
						>
							<i class="material-icons text-sm mr-1.5">lock</i>
							<span>{{ $t('settings.login.arl.howTo.chromeSteps.easyWay.title') }}</span>
						</button>
						<button
							type="button"
							class="guide-tab-item"
							:class="{ 'guide-tab-item--active': activeTab === 'chrome-devtools' }"
							@click="activeTab = 'chrome-devtools'"
						>
							<i class="material-icons text-sm mr-1.5">developer_mode</i>
							<span>{{ $t('settings.login.arl.howTo.chromeSteps.title') }} (DevTools)</span>
						</button>
						<button
							type="button"
							class="guide-tab-item"
							:class="{ 'guide-tab-item--active': activeTab === 'firefox' }"
							@click="activeTab = 'firefox'"
						>
							<i class="material-icons text-sm mr-1.5">tab</i>
							<span>{{ $t('settings.login.arl.howTo.firefoxSteps.title') }}</span>
						</button>
						<button
							type="button"
							class="guide-tab-item"
							:class="{ 'guide-tab-item--active': activeTab === 'safari' }"
							@click="activeTab = 'safari'"
						>
							<i class="material-icons text-sm mr-1.5">extension</i>
							<span>Safari / Extension</span>
						</button>
					</div>

					<!-- Tab Content: Chrome Easy Way -->
					<div v-show="activeTab === 'chrome-easy'" class="tutorial-tab-content space-y-4">
						<div class="steps-list-grid">
							<div class="tutorial-step-card">
								<div class="step-num">1</div>
								<div class="step-text">
									<h4 class="step-heading">Open Deezer</h4>
									<p class="step-instruction">{{ $t('settings.login.arl.howTo.commonSteps.step2') }}</p>
								</div>
							</div>
							<div class="tutorial-step-card">
								<div class="step-num">2</div>
								<div class="step-text">
									<h4 class="step-heading">Click Lock Icon</h4>
									<p class="step-instruction">{{ $t('settings.login.arl.howTo.chromeSteps.easyWay.step3') }}</p>
								</div>
							</div>
							<div class="tutorial-step-card">
								<div class="step-num">3</div>
								<div class="step-text">
									<h4 class="step-heading">Locate ARL Cookie</h4>
									<p class="step-instruction">{{ $t('settings.login.arl.howTo.chromeSteps.easyWay.step4') }}</p>
								</div>
							</div>
							<div class="tutorial-step-card">
								<div class="step-num">4</div>
								<div class="step-text">
									<h4 class="step-heading">Copy Token Value</h4>
									<p class="step-instruction">{{ $t('settings.login.arl.howTo.chromeSteps.easyWay.step5') }}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Tab Content: Chrome DevTools -->
					<div v-show="activeTab === 'chrome-devtools'" class="tutorial-tab-content space-y-4">
						<div class="steps-list-grid">
							<div class="tutorial-step-card">
								<div class="step-num">1</div>
								<div class="step-text">
									<h4 class="step-heading">Log into Deezer</h4>
									<p class="step-instruction">{{ $t('settings.login.arl.howTo.commonSteps.step2') }}</p>
								</div>
							</div>
							<div class="tutorial-step-card">
								<div class="step-num">2</div>
								<div class="step-text">
									<h4 class="step-heading">Open Developer Tools</h4>
									<p class="step-instruction">{{ $t('settings.login.arl.howTo.commonSteps.step3') }}</p>
								</div>
							</div>
							<div class="tutorial-step-card">
								<div class="step-num">3</div>
								<div class="step-text">
									<h4 class="step-heading">Application &gt; Cookies</h4>
									<p class="step-instruction">
										{{ $t('settings.login.arl.howTo.chromeSteps.step4') }} -
										{{ $t('settings.login.arl.howTo.commonSteps.step5') }} &gt;
										{{ $t('settings.login.arl.howTo.commonSteps.step6') }}
									</p>
								</div>
							</div>
							<div class="tutorial-step-card">
								<div class="step-num">4</div>
								<div class="step-text">
									<h4 class="step-heading">Copy ARL</h4>
									<p class="step-instruction">
										{{ $t('settings.login.arl.howTo.commonSteps.step7') }} -
										{{ $t('settings.login.arl.howTo.commonSteps.step8') }}
									</p>
								</div>
							</div>
						</div>

						<div class="video-guide-banner">
							<i class="material-icons text-rose-400 mr-2">smart_display</i>
							<i18n path="settings.login.arl.howTo.chromeSteps.videoGuide.text" tag="span">
								<template #videoGuide>
									<a
										href="https://youtu.be/O6PRT47_yds"
										target="_blank"
										rel="noopener noreferrer"
										class="modern-link-inline font-semibold"
									>
										{{ $t('settings.login.arl.howTo.chromeSteps.videoGuide.link') }}
									</a>
								</template>
							</i18n>
						</div>
					</div>

					<!-- Tab Content: Firefox -->
					<div v-show="activeTab === 'firefox'" class="tutorial-tab-content space-y-4">
						<div class="steps-list-grid">
							<div class="tutorial-step-card">
								<div class="step-num">1</div>
								<div class="step-text">
									<h4 class="step-heading">Log into Deezer</h4>
									<p class="step-instruction">{{ $t('settings.login.arl.howTo.commonSteps.step2') }}</p>
								</div>
							</div>
							<div class="tutorial-step-card">
								<div class="step-num">2</div>
								<div class="step-text">
									<h4 class="step-heading">Open Storage Inspector</h4>
									<p class="step-instruction">
										{{ $t('settings.login.arl.howTo.commonSteps.step3') }} &gt;
										{{ $t('settings.login.arl.howTo.firefoxSteps.step4') }}
									</p>
								</div>
							</div>
							<div class="tutorial-step-card">
								<div class="step-num">3</div>
								<div class="step-text">
									<h4 class="step-heading">Expand Cookies</h4>
									<p class="step-instruction">
										{{ $t('settings.login.arl.howTo.commonSteps.step5') }} &gt;
										{{ $t('settings.login.arl.howTo.commonSteps.step6') }}
									</p>
								</div>
							</div>
							<div class="tutorial-step-card">
								<div class="step-num">4</div>
								<div class="step-text">
									<h4 class="step-heading">Copy Token Value</h4>
									<p class="step-instruction">
										{{ $t('settings.login.arl.howTo.commonSteps.step7') }} -
										{{ $t('settings.login.arl.howTo.commonSteps.step8') }}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Tab Content: Safari / Extension -->
					<div v-show="activeTab === 'safari'" class="tutorial-tab-content space-y-4">
						<div class="steps-list-grid">
							<div class="tutorial-step-card">
								<div class="step-num">1</div>
								<div class="step-text">
									<h4 class="step-heading">Open Deezer</h4>
									<p class="step-instruction">Log into www.deezer.com in Safari or your favorite browser.</p>
								</div>
							</div>
							<div class="tutorial-step-card">
								<div class="step-num">2</div>
								<div class="step-text">
									<h4 class="step-heading">Cookie Inspector</h4>
									<p class="step-instruction">
										Use Safari DevTools (Option+Cmd+I) under Storage &gt; Cookies, or click a browser extension like
										<strong>Cookie-Editor</strong>.
									</p>
								</div>
							</div>
							<div class="tutorial-step-card">
								<div class="step-num">3</div>
								<div class="step-text">
									<h4 class="step-heading">Copy arl Value</h4>
									<p class="step-instruction">
										Search for the cookie named <strong>arl</strong> and copy its 192-character alphanumeric value.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Developer Console Helper Snippet -->
			<div class="settings-card">
				<div class="card-header">
					<div class="card-icon-box card-icon-emerald">
						<i class="material-icons">terminal</i>
					</div>
					<div class="card-titles">
						<h3 class="card-title">Console One-Liner (Fastest Method)</h3>
						<p class="card-subtitle">
							Run this snippet in your browser console on deezer.com to extract and copy your ARL automatically
						</p>
					</div>
					<div class="header-actions">
						<button type="button" class="btn btn-secondary btn-sm" @click="copyCookieName">
							<i class="material-icons btn-icon text-sm">content_copy</i>
							<span>Copy "arl"</span>
						</button>
						<button type="button" class="btn btn-primary btn-sm" @click="copySnippet">
							<i class="material-icons btn-icon text-sm">code</i>
							<span>Copy Snippet</span>
						</button>
					</div>
				</div>
				<div class="card-body">
					<pre class="console-snippet-box"><code>{{ snippetText }}</code></pre>
				</div>
			</div>

			<!-- Direct Paste & Connect Card -->
			<div class="settings-card">
				<div class="card-header">
					<div class="card-icon-box card-icon-blue">
						<i class="material-icons">bolt</i>
					</div>
					<div class="card-titles">
						<h3 class="card-title">Ready to Connect?</h3>
						<p class="card-subtitle">Paste your extracted ARL token here to authenticate deemix immediately</p>
					</div>
				</div>

				<div class="card-body space-y-4">
					<div class="input-field-group">
						<span class="field-label">Deezer ARL Cookie</span>
						<div class="input-with-button">
							<input
								v-model="pastedArl"
								:type="showPassword ? 'text' : 'password'"
								placeholder="Paste your 192-character ARL cookie here..."
								class="modern-input"
								autocomplete="off"
								@keyup.enter="connectArl"
							/>
							<button
								type="button"
								class="btn btn-secondary btn-icon-only"
								:title="showPassword ? 'Hide' : 'Show'"
								@click="showPassword = !showPassword"
							>
								<i class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
							</button>
							<button type="button" class="btn btn-primary" :disabled="!pastedArl || isConnecting" @click="connectArl">
								<i class="material-icons btn-icon text-sm" :class="{ 'spin-animation': isConnecting }">
									{{ isConnecting ? 'sync' : 'login' }}
								</i>
								<span>{{ isConnecting ? 'Connecting...' : 'Save & Connect' }}</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { mapActions } from 'vuex'
import { toast } from '@/utils/toasts'
import { copyToClipboard } from '@/utils/utils'
import { postToServer } from '@/utils/api'

export default {
	name: 'InfoArl',
	data() {
		return {
			activeTab: 'chrome-easy',
			pastedArl: '',
			showPassword: false,
			isConnecting: false,
			snippetText: `copy(document.cookie.split('; ').find(r => r.startsWith('arl='))?.split('=')[1] || '')`
		}
	},
	methods: {
		...mapActions({
			dispatchLogin: 'login',
			dispatchARL: 'setARL'
		}),
		copyCookieName() {
			copyToClipboard('arl')
			toast('Cookie name "arl" copied to clipboard!', 'assignment')
		},
		copySnippet() {
			copyToClipboard(this.snippetText)
			toast('Console snippet copied to clipboard!', 'code')
		},
		async connectArl() {
			const arl = (this.pastedArl || '').trim()
			if (!arl) return

			this.isConnecting = true
			toast(this.$t('toasts.loggingIn'), 'loading', false, 'login-toast')

			try {
				const data = await postToServer('loginArl', { arl, force: true })
				if (data && (data.status === 1 || data.status === 3)) {
					toast(this.$t('toasts.loggedIn'), 'done', true, 'login-toast')
					this.dispatchLogin(data)
					this.$router.push({ name: 'Settings' })
				} else if (data && data.status === 2) {
					toast(this.$t('toasts.alreadyLogged'), 'done', true, 'login-toast')
					this.$router.push({ name: 'Settings' })
				} else {
					toast(this.$t('toasts.loginFailed'), 'close', true, 'login-toast')
				}
			} catch (err) {
				console.error('ARL login error:', err)
				toast(this.$t('toasts.loginFailed'), 'close', true, 'login-toast')
			} finally {
				this.isConnecting = false
			}
		}
	}
}
</script>

<style scoped>
.info-arl-page {
	padding: 1.5rem 2rem 4rem 2rem;
	max-width: 68rem;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

/* Page Header */
.page-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1.5rem;
	flex-wrap: wrap;
	padding-bottom: 0.5rem;
}

.breadcrumb-row {
	margin-bottom: 0.4rem;
}

.breadcrumb-link {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	color: #06b6d4;
	font-size: 0.8rem;
	font-weight: 600;
	text-decoration: none;
	transition: color 0.15s ease;
}

.breadcrumb-link:hover {
	color: #38bdf8;
	text-decoration: underline;
}

.page-title {
	font-size: 1.75rem;
	font-weight: 800;
	color: #f8fafc;
	margin: 0;
	display: flex;
	align-items: center;
	gap: 0.65rem;
}

.title-icon {
	font-size: 1.85rem;
	color: #f59e0b;
}

.page-subtitle {
	font-size: 0.875rem;
	color: #94a3b8;
	margin: 0.25rem 0 0 0;
	line-height: 1.5;
}

/* Overview Grid */
.overview-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
	gap: 1.25rem;
}

.session-duration-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	background: rgba(16, 185, 129, 0.12);
	border: 1px solid rgba(16, 185, 129, 0.25);
	color: #34d399;
	font-size: 0.8rem;
	padding: 0.35rem 0.75rem;
	border-radius: 9999px;
	margin-top: 0.25rem;
}

.security-warning-box {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	background: rgba(245, 158, 11, 0.12);
	border: 1px solid rgba(245, 158, 11, 0.25);
	color: #fbbf24;
	font-size: 0.8rem;
	padding: 0.6rem 0.85rem;
	border-radius: 0.5rem;
	line-height: 1.4;
}

/* Guide Tabs Bar */
.guide-tabs-bar {
	display: flex;
	gap: 0.5rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	padding-bottom: 0.75rem;
	overflow-x: auto;
}

.guide-tab-item {
	display: inline-flex;
	align-items: center;
	padding: 0.55rem 0.95rem;
	border-radius: 0.5rem;
	border: 1px solid transparent;
	background: transparent;
	color: #94a3b8;
	font-size: 0.85rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.15s ease;
	white-space: nowrap;
}

.guide-tab-item:hover {
	color: #f8fafc;
	background: rgba(255, 255, 255, 0.05);
}

.guide-tab-item--active {
	color: #06b6d4;
	background: rgba(6, 182, 212, 0.12);
	border-color: rgba(6, 182, 212, 0.35);
}

/* Steps List Grid */
.steps-list-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 1rem;
}

.tutorial-step-card {
	background: rgba(30, 41, 59, 0.45);
	border: 1px solid rgba(255, 255, 255, 0.07);
	border-radius: 0.75rem;
	padding: 1.15rem;
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
}

.step-num {
	width: 2rem;
	height: 2rem;
	border-radius: 9999px;
	background: rgba(6, 182, 212, 0.2);
	color: #06b6d4;
	font-weight: 800;
	font-size: 0.85rem;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(6, 182, 212, 0.4);
}

.step-heading {
	font-size: 0.95rem;
	font-weight: 700;
	color: #f8fafc;
	margin: 0 0 0.25rem 0;
}

.step-instruction {
	font-size: 0.825rem;
	color: #94a3b8;
	margin: 0;
	line-height: 1.45;
}

.video-guide-banner {
	display: flex;
	align-items: center;
	background: rgba(244, 63, 94, 0.1);
	border: 1px solid rgba(244, 63, 94, 0.25);
	border-radius: 0.5rem;
	padding: 0.65rem 1rem;
	font-size: 0.85rem;
	color: #cbd5e1;
}

/* Console Snippet Box */
.console-snippet-box {
	background: rgba(0, 0, 0, 0.55);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 0.5rem;
	padding: 0.85rem 1.15rem;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	font-size: 0.825rem;
	color: #38bdf8;
	overflow-x: auto;
	margin: 0;
	line-height: 1.5;
}

/* Card Styles */
.settings-card {
	background: rgba(15, 23, 42, 0.75);
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 1rem;
	box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
	overflow: hidden;
}

.card-header {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 1.25rem 1.5rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	background: rgba(30, 41, 59, 0.25);
}

.card-titles {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
	flex: 1;
}

.card-title {
	font-size: 1.15rem;
	font-weight: 600;
	color: #f8fafc;
	margin: 0;
}

.card-subtitle {
	font-size: 0.825rem;
	color: #94a3b8;
	margin: 0;
	line-height: 1.35;
}

.card-body {
	padding: 1.5rem;
}

.card-icon-box {
	width: 2.75rem;
	height: 2.75rem;
	border-radius: 0.75rem;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.card-icon-cyan {
	background: rgba(6, 182, 212, 0.15);
	color: #06b6d4;
	border: 1px solid rgba(6, 182, 212, 0.3);
}

.card-icon-amber {
	background: rgba(245, 158, 11, 0.15);
	color: #fbbf24;
	border: 1px solid rgba(245, 158, 11, 0.3);
}

.card-icon-indigo {
	background: rgba(99, 102, 241, 0.15);
	color: #818cf8;
	border: 1px solid rgba(99, 102, 241, 0.3);
}

.card-icon-emerald {
	background: rgba(16, 185, 129, 0.15);
	color: #34d399;
	border: 1px solid rgba(16, 185, 129, 0.3);
}

.card-icon-blue {
	background: rgba(59, 130, 246, 0.15);
	color: #60a5fa;
	border: 1px solid rgba(59, 130, 246, 0.3);
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.spin-animation {
	animation: spin 1s linear infinite;
}
</style>
