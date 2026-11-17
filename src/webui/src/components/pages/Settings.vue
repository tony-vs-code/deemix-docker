<template>
	<div class="settings-page">
		<!-- Page Header -->
		<div class="page-header">
			<div class="header-titles">
				<div class="page-breadcrumb">
					<i class="material-icons breadcrumb-icon">settings</i>
					<span>{{ $t('settings.title') }}</span>
				</div>
				<h1 class="page-title">
					<i class="material-icons title-icon">{{ activeSection.icon }}</i>
					{{ activeSection.label }}
				</h1>
				<p class="page-subtitle">
					{{ activeSection.subtitle }}
				</p>
			</div>

			<!-- Top Header Actions -->
			<div class="header-actions">
				<button class="btn btn-secondary action-btn" @click="resetToDefault">
					<i class="material-icons btn-icon">restore</i>
					<span>{{ $t('settings.reset') }}</span>
				</button>
				<button class="btn btn-primary action-btn save-btn" @click="saveSettings">
					<i class="material-icons btn-icon">save</i>
					<span>{{ $t('settings.save') }}</span>
				</button>
			</div>
		</div>

		<!-- Category Views Content -->
		<div class="settings-content">
			<!-- TAB 1: ACCOUNT -->
			<div v-show="currentTab === 'account'" class="tab-content-panel space-y-6">
				<!-- Session & ARL Health Status Panel -->
				<div class="settings-card arl-health-card">
					<div class="card-header arl-health-header">
						<div class="card-icon-box" :class="healthIconBoxClass">
							<i class="material-icons">{{ healthIcon }}</i>
						</div>
						<div class="card-titles">
							<div class="flex-align-center gap-2 flex-wrap">
								<h3 class="card-title">{{ $t('settings.arlHealth.title') }}</h3>
								<span class="health-status-pill" :class="healthStatusPillClass">
									<span class="status-dot"></span>
									{{ healthStatusText }}
								</span>
								<span
									v-if="arlHealth.deezerReachable !== undefined"
									class="health-reachability-pill"
									:class="arlHealth.deezerReachable ? 'reachability-online' : 'reachability-offline'"
								>
									<i class="material-icons text-xs">{{ arlHealth.deezerReachable ? 'cloud_done' : 'cloud_off' }}</i>
									{{
										arlHealth.deezerReachable ? $t('settings.arlHealth.verified') : $t('settings.arlHealth.unreachable')
									}}
								</span>
							</div>
							<p class="card-subtitle">{{ $t('settings.arlHealth.subtitle') }}</p>
						</div>
						<div class="header-actions-end">
							<button
								type="button"
								class="btn btn-secondary btn-sm verify-session-btn"
								:disabled="isVerifyingArl"
								:title="$t('settings.arlHealth.verifySession')"
								@click="verifyArlHealth"
							>
								<i class="material-icons btn-icon text-sm" :class="{ 'spin-animation': isVerifyingArl }">refresh</i>
								<span>{{
									isVerifyingArl ? $t('settings.arlHealth.verifying') : $t('settings.arlHealth.verifySession')
								}}</span>
							</button>
						</div>
					</div>

					<div class="card-body">
						<div class="health-metrics-grid">
							<!-- Account Quality Tier Card -->
							<div class="health-metric-box">
								<div class="metric-label">
									<i class="material-icons text-sm">workspace_premium</i>
									Account Quality Tier
								</div>
								<div class="metric-value-row">
									<span class="quality-tier-badge" :class="'tier-' + (arlHealth.tier || 'unknown')">
										<i class="material-icons text-sm">{{ tierIcon }}</i>
										{{ tierBadgeText }}
									</span>
								</div>
								<!-- Capability Pills -->
								<div class="capability-pills-row">
									<span class="cap-pill" :class="{ 'cap-pill--enabled': arlHealth.canStreamLossless }">
										<i class="material-icons text-xs">{{
											arlHealth.canStreamLossless ? 'check_circle' : 'remove_circle_outline'
										}}</i>
										{{ $t('settings.arlHealth.capabilities.flac') }}
									</span>
									<span class="cap-pill" :class="{ 'cap-pill--enabled': arlHealth.canStreamHq }">
										<i class="material-icons text-xs">{{
											arlHealth.canStreamHq ? 'check_circle' : 'remove_circle_outline'
										}}</i>
										{{ $t('settings.arlHealth.capabilities.hq') }}
									</span>
									<span class="cap-pill" :class="{ 'cap-pill--enabled': arlHealth.valid }">
										<i class="material-icons text-xs">{{
											arlHealth.valid ? 'check_circle' : 'remove_circle_outline'
										}}</i>
										{{ $t('settings.arlHealth.capabilities.standard') }}
									</span>
								</div>
							</div>

							<!-- Session Life & Token Expiration -->
							<div class="health-metric-box">
								<div class="metric-label">
									<i class="material-icons text-sm">hourglass_bottom</i>
									{{ $t('settings.arlHealth.sessionLife.title') }}
								</div>
								<div class="metric-value-row">
									<span class="session-days-text">
										{{ sessionLifeText }}
									</span>
									<span v-if="arlHealth.source" class="source-tag">
										{{ sourceBadgeText }}
									</span>
								</div>
								<!-- Progress Bar -->
								<div class="session-progress-wrapper">
									<div class="session-progress-bar">
										<div
											class="session-progress-fill"
											:class="sessionProgressColorClass"
											:style="{ width: sessionProgressPercent + '%' }"
										></div>
									</div>
									<span class="progress-percent-label">{{ sessionProgressPercent }}%</span>
								</div>
								<div class="session-meta-note">
									<span v-if="formattedArlDate">
										<i class="material-icons text-xs mr-1">history</i>
										{{ $t('settings.arlHealth.sessionLife.updated', { date: formattedArlDate }) }}
									</span>
									<span v-else-if="arlHealth.valid && arlHealth.source === 'env'">
										<i class="material-icons text-xs mr-1">code</i>
										Loaded via Docker container environment variable
									</span>
									<span v-else-if="arlHealth.valid">
										<i class="material-icons text-xs mr-1">info_outline</i>
										Token active (expiration timestamp not tracked)
									</span>
									<span v-else>
										<i class="material-icons text-xs mr-1">warning_amber</i>
										Please connect with your Deezer account or ARL cookie
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Deezer Profile & Session Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-cyan">
							<i class="material-icons">person</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.login.title') }}</h3>
							<p class="card-subtitle">Manage active Deezer session, subscription tier, and connected profiles</p>
						</div>
					</div>

					<div class="card-body">
						<!-- Logged In Profile -->
						<div v-if="isLoggedIn" id="logged_in_info" ref="loggedInInfo" class="user-profile-wrapper">
							<div class="user-avatar-container">
								<img
									id="settings_picture"
									ref="userpicture"
									:src="pictureHref"
									alt="Profile Picture"
									class="user-avatar-img"
								/>
								<div class="avatar-badge-online" title="Active Session">
									<i class="material-icons text-xs">check</i>
								</div>
							</div>

							<div class="user-details-column">
								<div class="user-greeting">
									<i18n path="settings.login.loggedIn" tag="span">
										<template #username>
											<strong id="settings_username" ref="username" class="user-name-strong">{{
												user.name || 'not logged'
											}}</strong>
										</template>
									</i18n>
								</div>

								<div class="user-status-badges">
									<span class="user-badge badge-tier" :class="'tier-' + userLicense.toLowerCase()">
										<i class="material-icons text-xs">verified</i>
										{{ userLicense }}
									</span>
									<span v-if="user.country" class="user-badge badge-country">
										<i class="material-icons text-xs">public</i>
										{{ user.country }}
									</span>
								</div>

								<div class="user-actions-row">
									<button class="btn btn-danger btn-sm action-btn" @click="logout">
										<i class="material-icons btn-icon text-sm">logout</i>
										<span>{{ $t('settings.login.logout') }}</span>
									</button>
								</div>
							</div>

							<div v-if="accounts.length > 1" class="family-account-selector">
								<label class="field-label-sm">Family Account Switcher</label>
								<select id="family_account" v-model="accountNum" class="modern-select" @change="changeAccount">
									<option v-for="(account, i) in accounts" :key="account.id || account.name || i" :value="i.toString()">
										{{ account.name }}
									</option>
								</select>
							</div>
						</div>

						<!-- Logged Out Credentials Form -->
						<div v-else class="login-form-wrapper">
							<form ref="loginWithCredentialsForm" class="credentials-form" @submit.prevent="loginWithCredentials">
								<div class="form-grid-2">
									<label class="input-field-group">
										<span class="field-label">{{ $t('settings.login.email') }}</span>
										<input type="text" name="email" placeholder="email@example.com" class="modern-input" />
									</label>
									<label class="input-field-group">
										<span class="field-label">{{ $t('settings.login.password') }}</span>
										<input type="password" name="password" placeholder="●●●●●●●●" class="modern-input" />
									</label>
								</div>
								<div class="form-actions-right">
									<button class="btn btn-primary login-button" type="submit">
										<i class="material-icons btn-icon text-sm">login</i>
										<span>{{ $t('settings.login.login') }}</span>
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>

				<!-- ARL Authentication Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-amber">
							<i class="material-icons">vpn_key</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.login.arl.title') }}</h3>
							<p class="card-subtitle">
								Authenticate or update your session token directly using your Deezer ARL cookie
							</p>
						</div>
					</div>

					<div class="card-body space-y-4">
						<div class="input-field-group">
							<span class="field-label">ARL Cookie Token</span>
							<div class="input-with-button">
								<input
									id="login_input_arl"
									ref="loginInput"
									:value="arl"
									autocomplete="off"
									placeholder="Paste your Deezer ARL cookie here..."
									:type="showArlText ? 'text' : 'password'"
									class="modern-input"
								/>
								<button
									type="button"
									class="btn btn-secondary btn-icon-only"
									:title="showArlText ? 'Hide ARL' : 'Show ARL'"
									@click="showArlText = !showArlText"
								>
									<i class="material-icons">{{ showArlText ? 'visibility_off' : 'visibility' }}</i>
								</button>
								<button
									class="btn btn-secondary btn-icon-only"
									title="Copy ARL to clipboard"
									@click="copyARLtoClipboard"
								>
									<i class="material-icons">assignment</i>
								</button>
							</div>
						</div>

						<div class="arl-help-link">
							<button type="button" class="modern-link-inline btn-link-reset" @click="showArlModal = true">
								<i class="material-icons text-sm mr-1">help_outline</i>
								{{ $t('settings.login.arl.question') }}
							</button>
							<router-link :to="{ name: 'ARL' }" class="modern-link-inline ml-4">
								<i class="material-icons text-sm mr-1">open_in_new</i>
								Full Guide
							</router-link>
						</div>

						<button class="btn btn-primary w-full" @click="loginButton">
							<i class="material-icons btn-icon text-sm">sync</i>
							<span>{{ $t('settings.login.arl.update') }}</span>
						</button>
					</div>
				</div>
			</div>

			<!-- TAB 2: GENERAL & INTERFACE -->
			<div v-show="currentTab === 'general'" class="tab-content-panel space-y-6">
				<!-- Appearance Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-purple">
							<i class="material-icons">palette</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.appearance.title') }}</h3>
							<p class="card-subtitle">Sidebar layout density, visual feature tags, and audio preview controls</p>
						</div>
					</div>

					<div class="card-body space-y-5">
						<div class="toggles-list space-y-3">
							<label class="modern-toggle-item">
								<input v-model="modelSlimSidebar" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.appearance.slimSidebar') }}</span>
									<span class="toggle-desc">Use a compact, icon-only navigation sidebar</span>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="modelShowBitrateTags" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.appearance.bitrateTags') }}</span>
									<span class="toggle-desc">Display visual audio quality tags across search and charts</span>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="modelShowSearchButton" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.appearance.searchButton') }}</span>
									<span class="toggle-desc">Show dedicated search action trigger</span>
								</div>
							</label>
						</div>

						<div class="toggles-divider"></div>

						<div class="input-field-group max-w-md">
							<div class="slider-header">
								<span class="field-label">{{ $t('settings.other.previewVolume') }}</span>
								<span class="slider-value-badge">{{ previewVolume }}%</span>
							</div>
							<input v-model.number="modelVolume" class="modern-slider" max="100" min="0" step="1" type="range" />
						</div>
					</div>
				</div>

				<!-- Language Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-indigo">
							<i class="material-icons">language</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.languages') }}</h3>
							<p class="card-subtitle">Select the interface display language for deemix</p>
						</div>
					</div>

					<div class="card-body">
						<div class="languages-grid">
							<div
								v-for="locale in locales"
								:key="locale"
								:class="{ 'locale-card--active': currentLocale === locale }"
								:title="`${flags[locale].eng} (${flags[locale].name})`"
								tabindex="0"
								class="locale-card"
								@click="changeLocale(locale)"
								@keyup.enter="changeLocale(locale)"
							>
								<div class="locale-flag-box" v-html="flags[locale].flag" />
								<div class="locale-names">
									<span class="locale-name-native">{{ flags[locale].name }}</span>
									<span class="locale-name-eng">{{ flags[locale].eng }}</span>
								</div>
								<div v-if="currentLocale === locale" class="locale-check-badge">
									<i class="material-icons text-xs">check</i>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- TAB 3: DOWNLOADS & QUALITY -->
			<div v-show="currentTab === 'downloads'" class="tab-content-panel space-y-6">
				<!-- Storage Location Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-emerald">
							<i class="material-icons">folder</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.downloadPath.title') }}</h3>
							<p class="card-subtitle">Storage directory where audio files and metadata will be saved</p>
						</div>
					</div>

					<div class="card-body">
						<div class="input-field-group">
							<span class="field-label">{{ $t('settings.downloadPath.title') }}</span>
							<div class="input-with-button">
								<input v-model="settings.downloadLocation" autocomplete="off" type="text" class="modern-input" />
								<button
									v-if="clientMode"
									class="btn btn-secondary btn-icon-only"
									title="Browse folder"
									@click="selectDownloadFolder"
								>
									<i class="material-icons">folder_open</i>
								</button>
							</div>
							<span class="field-hint">Default docker volume path: /downloads</span>
						</div>
					</div>
				</div>

				<!-- Quality & Engine Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-cyan">
							<i class="material-icons">cloud_download</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.downloads.title') }}</h3>
							<p class="card-subtitle">Queue concurrency, audio bitrates, overwrite policies, and fallbacks</p>
						</div>
					</div>

					<div class="card-body space-y-5">
						<div class="form-grid-3">
							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.downloads.queueConcurrency') }}</span>
								<input v-model.number="settings.queueConcurrency" min="1" type="number" class="modern-input" />
							</div>

							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.downloads.maxBitrate.title') }}</span>
								<select v-model="settings.maxBitrate" class="modern-select">
									<option value="9" :disabled="!canDownload(9)">{{ $t('settings.downloads.maxBitrate.9') }}</option>
									<option value="3" :disabled="!canDownload(3)">{{ $t('settings.downloads.maxBitrate.3') }}</option>
									<option value="1" :disabled="!canDownload(1)">{{ $t('settings.downloads.maxBitrate.1') }}</option>
								</select>
							</div>

							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.downloads.overwriteFile.title') }}</span>
								<select v-model="settings.overwriteFile" class="modern-select">
									<option value="y">{{ $t('settings.downloads.overwriteFile.y') }}</option>
									<option value="n">{{ $t('settings.downloads.overwriteFile.n') }}</option>
									<option value="e">{{ $t('settings.downloads.overwriteFile.e') }}</option>
									<option value="b">{{ $t('settings.downloads.overwriteFile.b') }}</option>
									<option value="t">{{ $t('settings.downloads.overwriteFile.t') }}</option>
									<option value="l">{{ $t('settings.downloads.overwriteFile.l') }}</option>
								</select>
							</div>
						</div>

						<div class="toggles-divider"></div>

						<div class="form-grid-3">
							<label class="modern-toggle-item">
								<input v-model="settings.fallbackBitrate" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.downloads.fallbackBitrate') }}</span>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.fallbackSearch" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.downloads.fallbackSearch') }}</span>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.fallbackISRC" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.downloads.fallbackISRC') }}</span>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.logErrors" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.downloads.logErrors') }}</span>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.logSearched" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.downloads.logSearched') }}</span>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.feelingLucky" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.downloads.feelingLucky') }}</span>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.syncedLyrics" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.downloads.syncedLyrics') }}</span>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.createM3U8File" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.downloads.createM3U8File') }}</span>
								</div>
							</label>

							<label v-if="clientMode" class="modern-toggle-item">
								<input v-model="settings.clearQueueOnExit" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.downloads.clearQueueOnExit') }}</span>
								</div>
							</label>
						</div>

						<div v-if="settings.createM3U8File" class="nested-input-group mt-3">
							<span class="field-label-sm">{{ $t('settings.downloads.playlistFilenameTemplate') }}</span>
							<input v-model="settings.playlistFilenameTemplate" type="text" class="modern-input" />
						</div>
					</div>
				</div>
			</div>

			<!-- TAB 4: FOLDERS & NAMING -->
			<div v-show="currentTab === 'folders'" class="tab-content-panel space-y-6">
				<!-- Naming Templates Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-blue">
							<i class="material-icons">font_download</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.templates.title') }}</h3>
							<p class="card-subtitle">Pattern formatting for track filenames across tracks, albums, and playlists</p>
						</div>
					</div>

					<div class="card-body space-y-6">
						<div class="input-field-group">
							<span class="field-label">{{ $t('settings.templates.tracknameTemplate') }}</span>
							<input v-model="settings.tracknameTemplate" type="text" class="modern-input mb-3" />
							<TemplateVariablesList
								:template-variables="trackTemplateVariables"
								@variable-click="onTemplateVariableClick"
							>
								<template #title>
									{{ $t('settings.templates.tracknameAvailableVariables') }}
								</template>
							</TemplateVariablesList>
						</div>

						<div class="input-field-group">
							<span class="field-label">{{ $t('settings.templates.albumTracknameTemplate') }}</span>
							<input v-model="settings.albumTracknameTemplate" type="text" class="modern-input mb-3" />
							<TemplateVariablesList
								:template-variables="trackTemplateVariables"
								@variable-click="onTemplateVariableClick"
							>
								<template #title>
									{{ $t('settings.templates.albumTracknameAvailableVariables') }}
								</template>
							</TemplateVariablesList>
						</div>

						<div class="input-field-group">
							<span class="field-label">{{ $t('settings.templates.playlistTracknameTemplate') }}</span>
							<input v-model="settings.playlistTracknameTemplate" type="text" class="modern-input mb-3" />
							<TemplateVariablesList
								:template-variables="trackTemplateVariables"
								@variable-click="onTemplateVariableClick"
							>
								<template #title>
									{{ $t('settings.templates.playlistTracknameAvailableVariables') }}
								</template>
							</TemplateVariablesList>
						</div>
					</div>
				</div>

				<!-- Folder Structure Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-amber">
							<i class="material-icons">create_new_folder</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.folders.title') }}</h3>
							<p class="card-subtitle">Automatic directory creation for artists, albums, CDs, and playlists</p>
						</div>
					</div>

					<div class="card-body space-y-5">
						<div class="form-grid-3">
							<div class="folder-option-block">
								<label class="modern-toggle-item">
									<input v-model="settings.createPlaylistFolder" type="checkbox" class="modern-checkbox" />
									<div class="toggle-text-block">
										<span class="toggle-title">{{ $t('settings.folders.createPlaylistFolder') }}</span>
									</div>
								</label>
								<div v-if="settings.createPlaylistFolder" class="nested-input-group mt-3">
									<span class="field-label-sm">{{ $t('settings.folders.playlistNameTemplate') }}</span>
									<input v-model="settings.playlistNameTemplate" type="text" class="modern-input" />
								</div>
							</div>

							<div class="folder-option-block">
								<label class="modern-toggle-item">
									<input v-model="settings.createArtistFolder" type="checkbox" class="modern-checkbox" />
									<div class="toggle-text-block">
										<span class="toggle-title">{{ $t('settings.folders.createArtistFolder') }}</span>
									</div>
								</label>
								<div v-if="settings.createArtistFolder" class="nested-input-group mt-3">
									<span class="field-label-sm">{{ $t('settings.folders.artistNameTemplate') }}</span>
									<input v-model="settings.artistNameTemplate" type="text" class="modern-input" />
								</div>
							</div>

							<div class="folder-option-block">
								<label class="modern-toggle-item">
									<input v-model="settings.createAlbumFolder" type="checkbox" class="modern-checkbox" />
									<div class="toggle-text-block">
										<span class="toggle-title">{{ $t('settings.folders.createAlbumFolder') }}</span>
									</div>
								</label>
								<div v-if="settings.createAlbumFolder" class="nested-input-group mt-3">
									<span class="field-label-sm">{{ $t('settings.folders.albumNameTemplate') }}</span>
									<input v-model="settings.albumNameTemplate" type="text" class="modern-input" />
								</div>
							</div>
						</div>

						<div class="toggles-divider"></div>

						<div class="form-grid-3">
							<label class="modern-toggle-item">
								<input v-model="settings.createCDFolder" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.folders.createCDFolder') }}</span>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.createStructurePlaylist" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.folders.createStructurePlaylist') }}</span>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.createSingleFolder" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.folders.createSingleFolder') }}</span>
								</div>
							</label>
						</div>
					</div>
				</div>

				<!-- Track Numbering & Character Safety Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-rose">
							<i class="material-icons">title</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.trackTitles.title') }}</h3>
							<p class="card-subtitle">Track numbering padding and filesystem character safety</p>
						</div>
					</div>

					<div class="card-body">
						<div class="form-grid-3">
							<label class="modern-toggle-item">
								<input v-model="settings.padTracks" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.trackTitles.padTracks') }}</span>
								</div>
							</label>

							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.trackTitles.paddingSize') }}</span>
								<input v-model="settings.paddingSize" max="10" type="number" class="modern-input" />
							</div>

							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.trackTitles.illegalCharacterReplacer') }}</span>
								<input v-model="settings.illegalCharacterReplacer" type="text" class="modern-input" />
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- TAB 5: METADATA & TAGS -->
			<div v-show="currentTab === 'metadata'" class="tab-content-panel space-y-6">
				<!-- Embedded Audio Tags Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-indigo">
							<i class="material-icons">bookmarks</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.tags.head') }}</h3>
							<p class="card-subtitle">Configure metadata tags embedded into downloaded audio files</p>
						</div>
					</div>

					<div class="card-body space-y-4">
						<div class="tags-checkbox-grid">
							<label class="modern-toggle-item"
								><input v-model="settings.tags.title" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.title') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.artist" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.artist') }}</span
								></label
							>
							<label v-if="settings.tags.multiArtistSeparator != 'default'" class="modern-toggle-item"
								><input v-model="settings.tags.artists" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.artists') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.album" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.album') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.cover" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.cover') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.trackNumber" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.trackNumber') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.trackTotal" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.trackTotal') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.discNumber" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.discNumber') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.discTotal" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.discTotal') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.albumArtist" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.albumArtist') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.genre" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.genre') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.year" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.year') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.date" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.date') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.explicit" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.explicit') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.isrc" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.isrc') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.length" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.length') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.barcode" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.barcode') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.bpm" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.bpm') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.replayGain" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.replayGain') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.label" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.label') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.lyrics" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.lyrics') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.syncedLyrics" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.syncedLyrics') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.copyright" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.copyright') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.composer" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.composer') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.involvedPeople" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.involvedPeople') }}</span
								></label
							>
							<label class="modern-toggle-item"
								><input v-model="settings.tags.source" type="checkbox" class="modern-checkbox" /><span
									class="toggle-title"
									>{{ $t('settings.tags.source') }}</span
								></label
							>
						</div>

						<p
							v-if="settings.tags.multiArtistSeparator != 'default' && !settings.tags.artists"
							class="input-warning-msg mt-3"
						>
							⚠️ {{ $t('settings.tags.artistsWarning') }}
						</p>
					</div>
				</div>

				<!-- Tag Formatting & Cleanup Rules Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-slate">
							<i class="material-icons">tune</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.other.title') }}</h3>
							<p class="card-subtitle">Casing transformations, artist separators, and metadata formatting</p>
						</div>
					</div>

					<div class="card-body space-y-5">
						<div class="form-grid-3">
							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.other.multiArtistSeparator.title') }}</span>
								<select v-model="settings.tags.multiArtistSeparator" class="modern-select">
									<option value="nothing">{{ $t('settings.other.multiArtistSeparator.nothing') }}</option>
									<option value="default">{{ $t('settings.other.multiArtistSeparator.default') }}</option>
									<option value="andFeat">{{ $t('settings.other.multiArtistSeparator.andFeat') }}</option>
									<option value=" & ">
										{{ $t('settings.other.multiArtistSeparator.using', { separator: ' & ' }) }}
									</option>
									<option value=",">{{ $t('settings.other.multiArtistSeparator.using', { separator: ',' }) }}</option>
									<option value=", ">{{ $t('settings.other.multiArtistSeparator.using', { separator: ', ' }) }}</option>
									<option value="/">{{ $t('settings.other.multiArtistSeparator.using', { separator: '/' }) }}</option>
									<option value=" / ">
										{{ $t('settings.other.multiArtistSeparator.using', { separator: ' / ' }) }}
									</option>
									<option value=";">{{ $t('settings.other.multiArtistSeparator.using', { separator: ';' }) }}</option>
									<option value="; ">{{ $t('settings.other.multiArtistSeparator.using', { separator: '; ' }) }}</option>
								</select>
								<p v-if="settings.tags.multiArtistSeparator != 'default'" class="input-warning-msg">
									⚠️ {{ $t('settings.other.multiArtistSeparator.warning') }}
								</p>
							</div>

							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.other.dateFormat.title') }}</span>
								<select v-model="settings.dateFormat" class="modern-select">
									<option value="Y-M-D">
										{{
											`${$t('settings.other.dateFormat.year')}-${$t('settings.other.dateFormat.month')}-${$t(
												'settings.other.dateFormat.day'
											)}`
										}}
									</option>
									<option value="Y-D-M">
										{{
											`${$t('settings.other.dateFormat.year')}-${$t('settings.other.dateFormat.day')}-${$t(
												'settings.other.dateFormat.month'
											)}`
										}}
									</option>
									<option value="D-M-Y">
										{{
											`${$t('settings.other.dateFormat.day')}-${$t('settings.other.dateFormat.month')}-${$t(
												'settings.other.dateFormat.year'
											)}`
										}}
									</option>
									<option value="M-D-Y">
										{{
											`${$t('settings.other.dateFormat.month')}-${$t('settings.other.dateFormat.day')}-${$t(
												'settings.other.dateFormat.year'
											)}`
										}}
									</option>
									<option value="Y">{{ $t('settings.other.dateFormat.year') }}</option>
								</select>
							</div>

							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.other.featuredToTitle.title') }}</span>
								<select v-model="settings.featuredToTitle" class="modern-select">
									<option value="0">{{ $t('settings.other.featuredToTitle.0') }}</option>
									<option value="1">{{ $t('settings.other.featuredToTitle.1') }}</option>
									<option value="3">{{ $t('settings.other.featuredToTitle.3') }}</option>
									<option value="2">{{ $t('settings.other.featuredToTitle.2') }}</option>
								</select>
							</div>
						</div>

						<div class="form-grid-2">
							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.other.titleCasing') }}</span>
								<select v-model="settings.titleCasing" class="modern-select">
									<option value="nothing">{{ $t('settings.other.casing.nothing') }}</option>
									<option value="lower">{{ $t('settings.other.casing.lower') }}</option>
									<option value="upper">{{ $t('settings.other.casing.upper') }}</option>
									<option value="start">{{ $t('settings.other.casing.start') }}</option>
									<option value="sentence">{{ $t('settings.other.casing.sentence') }}</option>
								</select>
							</div>

							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.other.artistCasing') }}</span>
								<select v-model="settings.artistCasing" class="modern-select">
									<option value="nothing">{{ $t('settings.other.casing.nothing') }}</option>
									<option value="lower">{{ $t('settings.other.casing.lower') }}</option>
									<option value="upper">{{ $t('settings.other.casing.upper') }}</option>
									<option value="start">{{ $t('settings.other.casing.start') }}</option>
									<option value="sentence">{{ $t('settings.other.casing.sentence') }}</option>
								</select>
							</div>
						</div>

						<div class="toggles-divider"></div>

						<div class="form-grid-3">
							<label class="modern-toggle-item">
								<input v-model="settings.tags.singleAlbumArtist" type="checkbox" class="modern-checkbox" />
								<span class="toggle-title">{{ $t('settings.other.singleAlbumArtist') }}</span>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.albumVariousArtists" type="checkbox" class="modern-checkbox" />
								<span class="toggle-title">{{ $t('settings.other.albumVariousArtists') }}</span>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.removeAlbumVersion" type="checkbox" class="modern-checkbox" />
								<span class="toggle-title">{{ $t('settings.other.removeAlbumVersion') }}</span>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.removeDuplicateArtists" type="checkbox" class="modern-checkbox" />
								<span class="toggle-title">{{ $t('settings.other.removeDuplicateArtists') }}</span>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.tags.savePlaylistAsCompilation" type="checkbox" class="modern-checkbox" />
								<span class="toggle-title">{{ $t('settings.other.savePlaylistAsCompilation') }}</span>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.tags.useNullSeparator" type="checkbox" class="modern-checkbox" />
								<span class="toggle-title">{{ $t('settings.other.useNullSeparator') }}</span>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.tags.saveID3v1" type="checkbox" class="modern-checkbox" />
								<span class="toggle-title">{{ $t('settings.other.saveID3v1') }}</span>
							</label>
						</div>

						<div class="command-info-box">
							<div class="command-info-header">
								<i class="material-icons text-sm text-cyan mr-1.5">terminal</i>
								<span class="field-label mb-0">{{ $t('settings.other.executeCommand.title') }}</span>
							</div>
							<p class="field-hint">{{ $t('settings.other.executeCommand.description') }}</p>
							<code v-if="settings.executeCommand" class="modern-code-badge">{{ settings.executeCommand }}</code>
							<span v-else class="text-secondary text-sm italic">{{ $t('globals.empty').capitalize() }}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- TAB 6: ARTWORK & COVERS -->
			<div v-show="currentTab === 'artwork'" class="tab-content-panel space-y-6">
				<!-- Artwork & Covers Card -->
				<div class="settings-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-cyan">
							<i class="material-icons">image</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.covers.title') }}</h3>
							<p class="card-subtitle">Cover image quality, local saving options, and embedded dimensions</p>
						</div>
					</div>

					<div class="card-body space-y-5">
						<div class="form-grid-2">
							<div class="artwork-option-block">
								<label class="modern-toggle-item">
									<input v-model="settings.saveArtwork" type="checkbox" class="modern-checkbox" />
									<div class="toggle-text-block">
										<span class="toggle-title">{{ $t('settings.covers.saveArtwork') }}</span>
									</div>
								</label>
								<div v-if="settings.saveArtwork" class="nested-input-group mt-3">
									<span class="field-label-sm">{{ $t('settings.covers.coverImageTemplate') }}</span>
									<input v-model="settings.coverImageTemplate" type="text" class="modern-input" />
								</div>
							</div>

							<div class="artwork-option-block">
								<label class="modern-toggle-item">
									<input v-model="settings.saveArtworkArtist" type="checkbox" class="modern-checkbox" />
									<div class="toggle-text-block">
										<span class="toggle-title">{{ $t('settings.covers.saveArtworkArtist') }}</span>
									</div>
								</label>
								<div v-if="settings.saveArtworkArtist" class="nested-input-group mt-3">
									<span class="field-label-sm">{{ $t('settings.covers.artistImageTemplate') }}</span>
									<input v-model="settings.artistImageTemplate" type="text" class="modern-input" />
								</div>
							</div>
						</div>

						<div class="form-grid-3">
							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.covers.localArtworkSize') }}</span>
								<input
									v-model.number="settings.localArtworkSize"
									max="10000"
									min="100"
									step="100"
									type="number"
									class="modern-input"
								/>
								<p v-if="settings.localArtworkSize > 1200" class="input-warning-msg">
									⚠️ {{ $t('settings.covers.imageSizeWarning') }}
								</p>
							</div>

							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.covers.embeddedArtworkSize') }}</span>
								<input
									v-model.number="settings.embeddedArtworkSize"
									max="10000"
									min="100"
									step="100"
									type="number"
									class="modern-input"
								/>
								<p v-if="settings.embeddedArtworkSize > 1200" class="input-warning-msg">
									⚠️ {{ $t('settings.covers.imageSizeWarning') }}
								</p>
							</div>

							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.covers.localArtworkFormat.title') }}</span>
								<select v-model="settings.localArtworkFormat" class="modern-select">
									<option value="jpg">{{ $t('settings.covers.localArtworkFormat.jpg') }}</option>
									<option value="png">{{ $t('settings.covers.localArtworkFormat.png') }}</option>
									<option value="jpg,png">{{ $t('settings.covers.localArtworkFormat.both') }}</option>
								</select>
							</div>
						</div>

						<div class="form-grid-3">
							<div class="input-field-group">
								<span class="field-label">{{ $t('settings.covers.jpegImageQuality') }}</span>
								<input
									v-model.number="settings.jpegImageQuality"
									max="100"
									min="1"
									type="number"
									class="modern-input"
								/>
							</div>

							<label class="modern-toggle-item">
								<input v-model="settings.embeddedArtworkPNG" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.covers.embeddedArtworkPNG') }}</span>
									<p v-if="settings.embeddedArtworkPNG" class="input-warning-msg">
										⚠️ {{ $t('settings.covers.embeddedPNGWarning') }}
									</p>
								</div>
							</label>

							<label class="modern-toggle-item">
								<input v-model="settings.tags.coverDescriptionUTF8" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.covers.coverDescriptionUTF8') }}</span>
								</div>
							</label>
						</div>
					</div>
				</div>
			</div>

			<!-- TAB: PLEX MEDIA SERVER -->
			<div v-show="currentTab === 'plex'" class="tab-content-panel space-y-6">
				<div class="settings-card plex-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-amber">
							<i class="material-icons">cast_connected</i>
						</div>
						<div class="card-titles">
							<div class="flex-align-center gap-2 flex-wrap">
								<h3 class="card-title">{{ $t('settings.plex.title') }}</h3>
								<span v-if="plexConnectionStatus" class="plex-status-pill" :class="plexStatusPillClass">
									<span class="status-dot"></span>
									{{ plexStatusText }}
								</span>
							</div>
							<p class="card-subtitle">{{ $t('settings.plex.subtitle') }}</p>
						</div>
						<div class="header-actions-end">
							<button
								type="button"
								class="btn btn-secondary btn-sm"
								:disabled="isTestingPlex || !plexSettings.serverUrl || !plexSettings.token"
								:title="$t('settings.plex.testConnection')"
								@click="testPlexConnection"
							>
								<i class="material-icons btn-icon text-sm" :class="{ 'spin-animation': isTestingPlex }">refresh</i>
								<span>{{ isTestingPlex ? $t('settings.plex.testing') : $t('settings.plex.testConnection') }}</span>
							</button>
						</div>
					</div>

					<div class="card-body space-y-6">
						<!-- Enable Plex Integration Switch -->
						<div class="toggles-list">
							<label class="modern-toggle-item">
								<input v-model="plexSettings.enabled" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.plex.enable') }}</span>
									<span class="toggle-desc">{{ $t('settings.plex.enableDesc') }}</span>
								</div>
							</label>
						</div>

						<div class="toggles-divider"></div>

						<!-- Connection Config (URL + Token) -->
						<div class="form-grid-2">
							<label class="input-field-group">
								<span class="field-label">{{ $t('settings.plex.serverUrl') }}</span>
								<input
									v-model="plexSettings.serverUrl"
									type="text"
									:placeholder="$t('settings.plex.serverUrlPlaceholder')"
									class="modern-input"
									autocomplete="off"
								/>
								<span class="field-hint">Base URL of your Plex Media Server (e.g. http://192.168.1.50:32400)</span>
							</label>

							<label class="input-field-group">
								<span class="field-label">{{ $t('settings.plex.token') }}</span>
								<div class="input-with-button">
									<input
										v-model="plexSettings.token"
										:type="showPlexToken ? 'text' : 'password'"
										:placeholder="$t('settings.plex.tokenPlaceholder')"
										class="modern-input"
										autocomplete="off"
									/>
									<button
										type="button"
										class="btn btn-secondary btn-icon-only"
										:title="showPlexToken ? 'Hide Token' : 'Show Token'"
										@click="showPlexToken = !showPlexToken"
									>
										<i class="material-icons">{{ showPlexToken ? 'visibility_off' : 'visibility' }}</i>
									</button>
								</div>
								<span class="field-hint">{{ $t('settings.plex.tokenHint') }}</span>
							</label>
						</div>

						<!-- Test Connection & Status Row -->
						<div class="flex-align-center gap-3 flex-wrap">
							<button
								type="button"
								class="btn btn-secondary"
								:disabled="isTestingPlex || !plexSettings.serverUrl || !plexSettings.token"
								@click="testPlexConnection"
							>
								<i class="material-icons btn-icon text-sm" :class="{ 'spin-animation': isTestingPlex }">
									{{ isTestingPlex ? 'sync' : 'network_check' }}
								</i>
								<span>{{ isTestingPlex ? $t('settings.plex.testing') : $t('settings.plex.testConnection') }}</span>
							</button>

							<span v-if="plexConnectionStatus" class="plex-status-pill" :class="plexStatusPillClass">
								<span class="status-dot"></span>
								{{ plexStatusText }}
							</span>
						</div>

						<div class="toggles-divider"></div>

						<!-- Library Section Selection & Manual Section Fallback -->
						<div class="form-grid-2">
							<div v-if="plexSections && plexSections.length > 0" class="input-field-group">
								<span class="field-label">{{ $t('settings.plex.librarySection') }}</span>
								<select v-model="plexSettings.sectionId" class="modern-select">
									<option value="all">{{ $t('settings.plex.allSections') }}</option>
									<option
										v-for="sec in plexSections"
										:key="sec.id"
										:value="sec.id"
									>
										{{ sec.title }} ({{ sec.type === 'artist' ? 'Music' : sec.type }} — ID: {{ sec.id }})
									</option>
								</select>
								<span class="field-hint">Select a detected Plex section or refresh all music sections</span>
							</div>

							<label class="input-field-group">
								<span class="field-label">{{ $t('settings.plex.manualSection') }}</span>
								<input
									v-model="plexSettings.sectionId"
									type="text"
									:placeholder="$t('settings.plex.manualSectionPlaceholder')"
									class="modern-input"
									autocomplete="off"
								/>
								<span class="field-hint">{{ $t('settings.plex.manualSectionHint') }}</span>
							</label>
						</div>

						<div class="toggles-divider"></div>

						<!-- Auto-scan on Complete Toggle -->
						<div class="toggles-list">
							<label class="modern-toggle-item">
								<input v-model="plexSettings.autoScanOnComplete" type="checkbox" class="modern-checkbox" />
								<div class="toggle-text-block">
									<span class="toggle-title">{{ $t('settings.plex.autoScan') }}</span>
									<span class="toggle-desc">{{ $t('settings.plex.autoScanDesc') }}</span>
								</div>
							</label>
						</div>

						<div class="toggles-divider"></div>

						<!-- Save & Trigger Scan Action Buttons -->
						<div class="plex-footer-actions flex-align-center gap-3 flex-wrap">
							<button
								type="button"
								class="btn btn-primary action-btn"
								:disabled="isSavingPlex"
								@click="savePlexSettings"
							>
								<i class="material-icons btn-icon text-sm" :class="{ 'spin-animation': isSavingPlex }">
									{{ isSavingPlex ? 'sync' : 'save' }}
								</i>
								<span>{{ isSavingPlex ? $t('settings.plex.saving') : $t('settings.plex.save') }}</span>
							</button>

							<button
								type="button"
								class="btn btn-secondary action-btn"
								:disabled="isScanningPlex || !plexSettings.serverUrl || !plexSettings.token"
								@click="triggerPlexScan"
							>
								<i class="material-icons btn-icon text-sm" :class="{ 'spin-animation': isScanningPlex }">
									{{ isScanningPlex ? 'sync' : 'refresh' }}
								</i>
								<span>{{ isScanningPlex ? $t('settings.plex.scanning') : $t('settings.plex.scanNow') }}</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- TAB 7: APPLICATION LOGS -->
			<div v-show="currentTab === 'logs'" class="tab-content-panel space-y-6">
				<!-- Permission Diagnostics Card -->
				<div v-if="permissions" class="settings-card permission-card">
					<div v-if="!permissions.downloadsWritable" class="permission-banner banner-warning">
						<div class="banner-icon-box">
							<i class="material-icons">warning</i>
						</div>
						<div class="banner-text">
							<h4 class="banner-title">Download Directory Permission Warning</h4>
							<p class="banner-desc">
								The download folder (<code>{{ permissions.downloadLocation }}</code
								>) is <strong>NOT writable</strong> by the container process (UID: {{ permissions.uid }}, GID:
								{{ permissions.gid }}). Download tasks will fail!
							</p>
							<p class="banner-solution">
								💡 <strong>Solution:</strong> Run <code>chmod -R 777 {{ permissions.downloadLocation }}</code> on your
								host, or start the container with environment variables <code>PUID</code> and <code>PGID</code> matching
								your host user (e.g. <code>PUID=1000 PGID=1000</code>).
							</p>
						</div>
					</div>
					<div v-else class="permission-banner banner-success">
						<div class="banner-icon-box banner-icon-success">
							<i class="material-icons">check_circle</i>
						</div>
						<div class="banner-text">
							<h4 class="banner-title">Container Permissions Healthy</h4>
							<p class="banner-desc">
								Download directory (<code>{{ permissions.downloadLocation }}</code
								>) and config directory (<code>{{ permissions.configFolder }}</code
								>) are both writable by process UID {{ permissions.uid }}.
							</p>
						</div>
					</div>
				</div>

				<!-- Terminal Log Console Card -->
				<div class="settings-card terminal-card">
					<div class="card-header">
						<div class="card-icon-box card-icon-indigo">
							<i class="material-icons">receipt_long</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">Application Logs</h3>
							<p class="card-subtitle">Real-time application event logs, permission diagnostics, and system trace</p>
						</div>
						<div class="terminal-header-controls">
							<button
								class="btn btn-secondary btn-sm"
								title="Refresh Logs"
								:disabled="isLoadingLogs"
								@click="fetchLogs"
							>
								<i class="material-icons btn-icon text-sm" :class="{ 'spin-active': isLoadingLogs }">sync</i>
								<span>Refresh</span>
							</button>
							<label class="terminal-toggle-label" title="Automatically poll for new logs every 3 seconds">
								<input v-model="logAutoRefresh" type="checkbox" class="modern-checkbox" />
								<span>Auto-refresh</span>
							</label>
							<button
								class="btn btn-secondary btn-sm"
								title="Copy visible logs to clipboard"
								@click="copyLogsToClipboard"
							>
								<i class="material-icons btn-icon text-sm">content_copy</i>
								<span>Copy</span>
							</button>
							<button class="btn btn-secondary btn-sm" title="Download log file" @click="exportLogsDownload">
								<i class="material-icons btn-icon text-sm">file_download</i>
								<span>Export</span>
							</button>
							<button class="btn btn-danger btn-sm" title="Clear all stored logs" @click="clearApplicationLogs">
								<i class="material-icons btn-icon text-sm">delete_sweep</i>
								<span>Clear</span>
							</button>
						</div>
					</div>

					<div class="card-body">
						<!-- Filters & Search Toolbar -->
						<div class="terminal-toolbar">
							<div class="level-filters-group">
								<button
									class="level-filter-btn"
									:class="{ active: logFilterLevel === 'all' }"
									@click="setLogFilterLevel('all')"
								>
									ALL <span class="filter-count">{{ logCounts.all }}</span>
								</button>
								<button
									class="level-filter-btn filter-info"
									:class="{ active: logFilterLevel === 'info' }"
									@click="setLogFilterLevel('info')"
								>
									INFO <span class="filter-count">{{ logCounts.info }}</span>
								</button>
								<button
									class="level-filter-btn filter-warn"
									:class="{ active: logFilterLevel === 'warn' }"
									@click="setLogFilterLevel('warn')"
								>
									WARN <span class="filter-count">{{ logCounts.warn }}</span>
								</button>
								<button
									class="level-filter-btn filter-error"
									:class="{ active: logFilterLevel === 'error' }"
									@click="setLogFilterLevel('error')"
								>
									ERROR <span class="filter-count">{{ logCounts.error }}</span>
								</button>
							</div>

							<div class="log-search-box">
								<i class="material-icons search-icon">search</i>
								<input
									v-model="logSearchQuery"
									type="text"
									placeholder="Filter log messages..."
									class="log-search-input"
									@input="debouncedFetchLogs"
								/>
								<button v-if="logSearchQuery" class="clear-search-btn" @click="clearLogSearch">
									<i class="material-icons text-sm">close</i>
								</button>
							</div>
						</div>

						<!-- Terminal Window -->
						<div class="terminal-window">
							<div class="terminal-window-header">
								<div class="window-dots">
									<span class="dot dot-red"></span>
									<span class="dot dot-yellow"></span>
									<span class="dot dot-green"></span>
								</div>
								<div class="window-title">deemix.log — {{ logs.length }} records</div>
								<div class="window-options">
									<label class="auto-scroll-label" title="Keep terminal scrolled to latest entries">
										<input v-model="logAutoScroll" type="checkbox" class="modern-checkbox" />
										<span>Auto-scroll</span>
									</label>
								</div>
							</div>

							<div ref="terminalBody" class="terminal-body">
								<div v-if="logs.length === 0" class="terminal-empty-state">
									<i class="material-icons terminal-empty-icon">terminal</i>
									<p>No log records match the current filter criteria.</p>
								</div>
								<div v-for="log in logs" :key="log.id" class="terminal-line" :class="'line-' + log.level">
									<span class="log-timestamp">{{ formatLogTime(log.timestamp) }}</span>
									<span class="log-badge" :class="'badge-' + log.level">{{ log.level.toUpperCase() }}</span>
									<span class="log-msg">{{ log.message }}</span>
									<button v-if="log.meta" class="meta-toggle-btn" @click="toggleExpandLog(log.id)">
										{{ expandedLogIds.includes(log.id) ? '▲ Hide trace' : '▼ Details' }}
									</button>
									<pre v-if="log.meta && expandedLogIds.includes(log.id)" class="log-trace-box">{{
										JSON.stringify(log.meta, null, 2)
									}}</pre>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Sticky Bottom Glass Footer Bar -->
		<footer class="settings-floating-footer">
			<div class="footer-inner">
				<div class="footer-hint">
					<i class="material-icons text-sm mr-1.5 text-secondary">info_outline</i>
					<span class="text-secondary text-sm">Save your settings to persist them across deemix sessions</span>
				</div>
				<div class="footer-actions">
					<button class="btn btn-secondary action-btn" @click="resetToDefault">
						<i class="material-icons btn-icon">restore</i>
						<span>{{ $t('settings.reset') }}</span>
					</button>
					<button class="btn btn-primary action-btn save-btn" @click="saveSettings">
						<i class="material-icons btn-icon">save</i>
						<span>{{ $t('settings.save') }}</span>
					</button>
				</div>
			</div>
		</footer>

		<!-- How to Get Your ARL Quick Guide Modal -->
		<div v-if="showArlModal" class="modal-backdrop" @click.self="showArlModal = false">
			<div class="modal-card arl-guide-modal-card">
				<!-- Modal Header -->
				<div class="modal-header">
					<div class="modal-header-main">
						<div class="card-icon-box card-icon-amber">
							<i class="material-icons">vpn_key</i>
						</div>
						<div class="modal-header-info">
							<span class="modal-type-badge">TUTORIAL & QUICK CONNECT</span>
							<h3 class="modal-album-title">
								{{ $t('settings.arlHealth.guideModal.title') }}
							</h3>
							<p class="modal-album-artist">
								{{ $t('settings.arlHealth.guideModal.subtitle') }}
							</p>
						</div>
					</div>
					<button type="button" class="modal-close-btn" title="Close (Esc)" @click="showArlModal = false">
						<i class="material-icons">close</i>
					</button>
				</div>

				<!-- Modal Body -->
				<div class="modal-body space-y-5">
					<!-- Interactive Browser Tabs -->
					<div class="guide-tabs-row">
						<button
							type="button"
							class="guide-tab-btn"
							:class="{ 'guide-tab-btn--active': guideTab === 'chrome' }"
							@click="guideTab = 'chrome'"
						>
							<i class="material-icons text-sm mr-1">tab</i>
							{{ $t('settings.arlHealth.guideModal.tabs.chrome') }}
						</button>
						<button
							type="button"
							class="guide-tab-btn"
							:class="{ 'guide-tab-btn--active': guideTab === 'firefox' }"
							@click="guideTab = 'firefox'"
						>
							<i class="material-icons text-sm mr-1">tab</i>
							{{ $t('settings.arlHealth.guideModal.tabs.firefox') }}
						</button>
						<button
							type="button"
							class="guide-tab-btn"
							:class="{ 'guide-tab-btn--active': guideTab === 'safari' }"
							@click="guideTab = 'safari'"
						>
							<i class="material-icons text-sm mr-1">extension</i>
							{{ $t('settings.arlHealth.guideModal.tabs.safari') }}
						</button>
					</div>

					<!-- 3-Step Visual Instructions -->
					<div class="guide-steps-container">
						<!-- Chrome / Chromium steps -->
						<div v-show="guideTab === 'chrome'" class="steps-grid">
							<div class="step-card">
								<div class="step-badge">1</div>
								<h4 class="step-title">{{ $t('settings.arlHealth.guideModal.chrome.step1Title') }}</h4>
								<p class="step-desc">{{ $t('settings.arlHealth.guideModal.chrome.step1Desc') }}</p>
							</div>
							<div class="step-card">
								<div class="step-badge">2</div>
								<h4 class="step-title">{{ $t('settings.arlHealth.guideModal.chrome.step2Title') }}</h4>
								<p class="step-desc">{{ $t('settings.arlHealth.guideModal.chrome.step2Desc') }}</p>
							</div>
							<div class="step-card">
								<div class="step-badge">3</div>
								<h4 class="step-title">{{ $t('settings.arlHealth.guideModal.chrome.step3Title') }}</h4>
								<p class="step-desc">{{ $t('settings.arlHealth.guideModal.chrome.step3Desc') }}</p>
							</div>
						</div>

						<!-- Firefox steps -->
						<div v-show="guideTab === 'firefox'" class="steps-grid">
							<div class="step-card">
								<div class="step-badge">1</div>
								<h4 class="step-title">{{ $t('settings.arlHealth.guideModal.firefox.step1Title') }}</h4>
								<p class="step-desc">{{ $t('settings.arlHealth.guideModal.firefox.step1Desc') }}</p>
							</div>
							<div class="step-card">
								<div class="step-badge">2</div>
								<h4 class="step-title">{{ $t('settings.arlHealth.guideModal.firefox.step2Title') }}</h4>
								<p class="step-desc">{{ $t('settings.arlHealth.guideModal.firefox.step2Desc') }}</p>
							</div>
							<div class="step-card">
								<div class="step-badge">3</div>
								<h4 class="step-title">{{ $t('settings.arlHealth.guideModal.firefox.step3Title') }}</h4>
								<p class="step-desc">{{ $t('settings.arlHealth.guideModal.firefox.step3Desc') }}</p>
							</div>
						</div>

						<!-- Safari / Extension steps -->
						<div v-show="guideTab === 'safari'" class="steps-grid">
							<div class="step-card">
								<div class="step-badge">1</div>
								<h4 class="step-title">{{ $t('settings.arlHealth.guideModal.safari.step1Title') }}</h4>
								<p class="step-desc">{{ $t('settings.arlHealth.guideModal.safari.step1Desc') }}</p>
							</div>
							<div class="step-card">
								<div class="step-badge">2</div>
								<h4 class="step-title">{{ $t('settings.arlHealth.guideModal.safari.step2Title') }}</h4>
								<p class="step-desc">{{ $t('settings.arlHealth.guideModal.safari.step2Desc') }}</p>
							</div>
							<div class="step-card">
								<div class="step-badge">3</div>
								<h4 class="step-title">{{ $t('settings.arlHealth.guideModal.safari.step3Title') }}</h4>
								<p class="step-desc">{{ $t('settings.arlHealth.guideModal.safari.step3Desc') }}</p>
							</div>
						</div>
					</div>

					<!-- Helper Snippet & Cookie Name Box -->
					<div class="helper-box">
						<div class="helper-box-header">
							<div class="flex-align-center gap-2">
								<i class="material-icons text-cyan-400 text-sm">terminal</i>
								<span class="helper-box-title">{{ $t('settings.arlHealth.guideModal.helperSnippet.title') }}</span>
							</div>
							<div class="flex-align-center gap-2">
								<button type="button" class="btn btn-secondary btn-xs" @click="copyCookieName">
									<i class="material-icons text-xs mr-1">content_copy</i>
									{{ $t('settings.arlHealth.guideModal.helperSnippet.copyName') }}
								</button>
								<button type="button" class="btn btn-primary btn-xs" @click="copyConsoleSnippet">
									<i class="material-icons text-xs mr-1">code</i>
									{{ $t('settings.arlHealth.guideModal.helperSnippet.copySnippet') }}
								</button>
							</div>
						</div>
						<p class="helper-box-desc">{{ $t('settings.arlHealth.guideModal.helperSnippet.desc') }}</p>
						<code class="helper-code-block">{{ consoleSnippetText }}</code>
					</div>

					<!-- Direct Paste & Connect Inside Modal -->
					<div class="modal-connect-card">
						<h4 class="connect-card-title">
							<i class="material-icons text-sm text-emerald-400 mr-1">bolt</i>
							{{ $t('settings.arlHealth.guideModal.quickConnect.title') }}
						</h4>
						<p class="connect-card-desc">{{ $t('settings.arlHealth.guideModal.quickConnect.desc') }}</p>
						<div class="input-with-button">
							<input
								v-model="modalArlInput"
								type="password"
								class="modern-input"
								:placeholder="$t('settings.arlHealth.guideModal.quickConnect.placeholder')"
								@keyup.enter="connectFromModal"
							/>
							<button
								type="button"
								class="btn btn-primary"
								:disabled="!modalArlInput || isConnectingModal"
								@click="connectFromModal"
							>
								<i class="material-icons btn-icon text-sm" :class="{ 'spin-animation': isConnectingModal }">
									{{ isConnectingModal ? 'sync' : 'login' }}
								</i>
								<span>{{
									isConnectingModal
										? $t('settings.arlHealth.guideModal.quickConnect.connecting')
										: $t('settings.arlHealth.guideModal.quickConnect.connect')
								}}</span>
							</button>
						</div>
					</div>
				</div>

				<!-- Modal Footer -->
				<div class="modal-footer">
					<router-link :to="{ name: 'ARL' }" class="modern-link-inline mr-auto">
						<i class="material-icons text-sm mr-1">menu_book</i>
						Open Full Visual Guide Page
					</router-link>
					<button type="button" class="btn btn-secondary" @click="showArlModal = false">
						{{ $t('settings.arlHealth.guideModal.close') }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import { debounce } from 'lodash-es'

import TemplateVariablesList from '@components/settings/TemplateVariablesList.vue'
import { getSettingsData } from '@/data/settings'
import { trackTemplateVariables } from '@/data/file-templates'

import { toast } from '@/utils/toasts'
import { socket } from '@/utils/socket'
import { flags } from '@/utils/flags'
import { copyToClipboard } from '@/utils/utils'

import { fetchData, postToServer } from '@/utils/api'
import { getFormItem } from '@/utils/forms'
import { getChildSection, getSidebarLink, navigateToChildQuery, resolveLinkChildId, syncRouteQuery } from '@/data/sidebar'

const settingsLink = getSidebarLink('settings')

export default {
	components: {
		TemplateVariablesList
	},
	data() {
		return {
			currentTab: resolveLinkChildId(settingsLink, this.$route ? this.$route.query : {}),
			logs: [],
			logCounts: { all: 0, info: 0, warn: 0, error: 0, debug: 0 },
			logFilterLevel: 'all',
			logSearchQuery: '',
			isLoadingLogs: false,
			logAutoRefresh: false,
			logAutoRefreshTimer: null,
			logAutoScroll: true,
			permissions: null,
			expandedLogIds: [],
			flags,
			currentLocale: this.$i18n.locale,
			locales: this.$i18n.availableLocales,
			settings: {
				tags: {}
			},
			lastSettings: {},
			spotifyFeatures: {},
			lastCredentials: {},
			defaultSettings: {},
			lastUser: '',
			spotifyUser: '',
			accountNum: 0,
			accounts: [],
			trackTemplateVariables,
			arlHealth: {
				valid: false,
				hasArl: false,
				source: 'none',
				tier: 'unknown',
				canStreamLossless: false,
				canStreamHq: false,
				arlUpdatedAt: null,
				estimatedTotalDays: 90,
				estimatedRemainingDays: null,
				expiringSoon: false,
				deezerReachable: undefined
			},
			isVerifyingArl: false,
			showArlText: false,
			showArlModal: false,
			guideTab: 'chrome',
			modalArlInput: '',
			isConnectingModal: false,
			consoleSnippetText: `copy(document.cookie.split('; ').find(r => r.startsWith('arl='))?.split('=')[1] || '')`,
			plexSettings: {
				enabled: false,
				serverUrl: '',
				token: '',
				sectionId: '',
				autoScanOnComplete: true
			},
			plexSections: [],
			showPlexToken: false,
			isTestingPlex: false,
			isSavingPlex: false,
			isScanningPlex: false,
			plexConnectionStatus: null,
			plexServerName: '',
			plexErrorMessage: ''
		}
	},
	computed: {
		...mapGetters({
			arl: 'getARL',
			accessToken: 'getAccessToken',
			user: 'getUser',
			isLoggedIn: 'isLoggedIn',
			clientMode: 'getClientMode',
			previewVolume: 'getPreviewVolume',
			hasSlimDownloads: 'getSlimDownloads',
			hasSlimSidebar: 'getSlimSidebar',
			showBitrateTags: 'getShowBitrateTags',
			showSearchButton: 'getShowSearchButton'
		}),
		needToWait() {
			return Object.keys(this.getSettings).length === 0
		},
		modelVolume: {
			get() {
				return this.previewVolume
			},
			set: debounce(function (value) {
				this.setPreviewVolume(value)
			}, 20)
		},
		modelSlimDownloads: {
			get() {
				return this.hasSlimDownloads
			},
			set(wantSlimDownloads) {
				this.setSlimDownloads(wantSlimDownloads)
			}
		},
		modelSlimSidebar: {
			get() {
				return this.hasSlimSidebar
			},
			set(wantSlimSidebar) {
				this.setSlimSidebar(wantSlimSidebar)
			}
		},
		modelShowBitrateTags: {
			get() {
				return this.showBitrateTags
			},
			set(wantShowBitrateTags) {
				this.setShowBitrateTags(wantShowBitrateTags)
			}
		},
		modelShowSearchButton: {
			get() {
				return this.showSearchButton
			},
			set(wantShowSearchButton) {
				this.setShowSearchButton(wantShowSearchButton)
			}
		},
		pictureHref() {
			// Default image: https://e-cdns-images.dzcdn.net/images/user/125x125-000000-80-0-0.jpg
			return `https://e-cdns-images.dzcdn.net/images/user/${this.user.picture}/125x125-000000-80-0-0.jpg`
		},
		userLicense() {
			if (this.user.can_stream_lossless) return 'Hi-Fi'
			else if (this.user.can_stream_hq) return 'Premium'
			else return 'Free'
		},
		healthIcon() {
			if (!this.arlHealth.valid) return 'cancel'
			if (this.arlHealth.expiringSoon) return 'warning'
			return 'verified_user'
		},
		healthIconBoxClass() {
			if (!this.arlHealth.valid) return 'card-icon-rose'
			if (this.arlHealth.expiringSoon) return 'card-icon-amber'
			return 'card-icon-emerald'
		},
		healthStatusPillClass() {
			if (!this.arlHealth.valid) return 'status-pill--expired'
			if (this.arlHealth.expiringSoon) return 'status-pill--warning'
			return 'status-pill--active'
		},
		healthStatusText() {
			if (!this.arlHealth.valid) return this.$t('settings.arlHealth.expired')
			if (this.arlHealth.expiringSoon) return this.$t('settings.arlHealth.expiringSoon')
			return this.$t('settings.arlHealth.active')
		},
		tierIcon() {
			if (this.arlHealth.tier === 'hifi') return 'album'
			if (this.arlHealth.tier === 'premium') return 'audiotrack'
			if (this.arlHealth.tier === 'free') return 'music_note'
			return 'help_outline'
		},
		tierBadgeText() {
			if (this.arlHealth.tier === 'hifi') return this.$t('settings.arlHealth.tier.hifi')
			if (this.arlHealth.tier === 'premium') return this.$t('settings.arlHealth.tier.premium')
			if (this.arlHealth.tier === 'free') return this.$t('settings.arlHealth.tier.free')
			return this.$t('settings.arlHealth.tier.unknown')
		},
		sourceBadgeText() {
			if (this.arlHealth.source === 'env') return this.$t('settings.arlHealth.source.env')
			if (this.arlHealth.source === 'saved') return this.$t('settings.arlHealth.source.saved')
			if (this.arlHealth.source === 'session') return this.$t('settings.arlHealth.source.session')
			return this.$t('settings.arlHealth.source.none')
		},
		sessionProgressPercent() {
			if (this.arlHealth.estimatedRemainingDays !== null) {
				return Math.max(0, Math.min(100, Math.round((this.arlHealth.estimatedRemainingDays / 90) * 100)))
			}
			return this.arlHealth.valid ? 100 : 0
		},
		sessionProgressColorClass() {
			if (!this.arlHealth.valid) return 'fill-rose'
			if (this.arlHealth.expiringSoon) return 'fill-rose'
			if (this.arlHealth.estimatedRemainingDays !== null && this.arlHealth.estimatedRemainingDays <= 30)
				return 'fill-amber'
			return 'fill-emerald'
		},
		sessionLifeText() {
			if (!this.arlHealth.valid) return this.$t('settings.arlHealth.sessionLife.noSession')
			if (this.arlHealth.estimatedRemainingDays !== null) {
				return this.$t('settings.arlHealth.sessionLife.daysRemaining', {
					days: this.arlHealth.estimatedRemainingDays,
					total: 90
				})
			}
			return this.$t('settings.arlHealth.sessionLife.unknown')
		},
		formattedArlDate() {
			if (this.arlHealth.arlUpdatedAt) {
				return new Date(this.arlHealth.arlUpdatedAt).toLocaleDateString(undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			}
			return null
		},
		plexStatusPillClass() {
			if (this.plexConnectionStatus === 'success') return 'status-pill--active'
			if (this.plexConnectionStatus === 'error') return 'status-pill--expired'
			return ''
		},
		plexStatusText() {
			if (this.plexConnectionStatus === 'success') {
				return this.plexServerName ? `Connected: ${this.plexServerName}` : 'Connected'
			}
			if (this.plexConnectionStatus === 'error') {
				return this.plexErrorMessage || 'Connection Failed'
			}
			return ''
		},
		activeSection() {
			return (
				getChildSection('settings', this.currentTab) || {
					id: 'account',
					label: 'Account',
					icon: 'person',
					subtitle: 'Configure application preferences, download paths, audio quality, and metadata options'
				}
			)
		}
	},
	watch: {
		'$route.query.tab': {
			immediate: true,
			handler(newTab) {
				if (this.$route.name !== 'Settings') return
				const resolved = resolveLinkChildId(settingsLink, { tab: newTab })
				if (this.currentTab !== resolved) {
					this.currentTab = resolved
				}
				if (newTab && resolved !== newTab) {
					navigateToChildQuery(this, settingsLink, resolved)
				}
			}
		},
		currentTab(newTab) {
			const resolved = syncRouteQuery(this, settingsLink, newTab)
			if (resolved !== newTab) {
				this.currentTab = resolved
				return
			}
			if (newTab === 'account') {
				this.fetchArlHealth()
			}
			if (newTab === 'plex') {
				this.fetchPlexSettings()
			}
			if (newTab === 'logs') {
				this.fetchLogs()
				this.fetchPermissions()
				if (this.logAutoRefresh) {
					this.startAutoRefresh()
				}
			} else {
				this.stopAutoRefresh()
			}
		},
		logAutoRefresh(enabled) {
			if (enabled && this.currentTab === 'logs') {
				this.startAutoRefresh()
			} else {
				this.stopAutoRefresh()
			}
		}
	},
	activated() {
		const resolved = resolveLinkChildId(settingsLink, this.$route ? this.$route.query : {})
		if (this.currentTab !== resolved) {
			this.currentTab = resolved
		} else if (this.currentTab === 'logs') {
			this.fetchLogs()
			this.fetchPermissions()
		}
		if (this.currentTab === 'logs' && this.logAutoRefresh) {
			this.startAutoRefresh()
		}
	},
	deactivated() {
		this.stopAutoRefresh()
	},
	async mounted() {
		const { settingsData, defaultSettingsData, spotifyCredentials } = await getSettingsData()

		this.defaultSettings = defaultSettingsData
		this.initSettings(settingsData, spotifyCredentials)

		// TODO Move in store
		const storedAccountNum = localStorage.getItem('accountNum')

		if (storedAccountNum) {
			this.accountNum = storedAccountNum
		}

		// TODO Move in store
		const spotifyUser = localStorage.getItem('spotifyUser')

		if (spotifyUser) {
			this.lastUser = spotifyUser
			this.spotifyUser = spotifyUser
			socket.emit('update_userSpotifyPlaylists', spotifyUser)
		}

		socket.on('updateSettings', this.updateSettings)
		socket.on('familyAccounts', this.initAccounts)
		if (this.clientMode) {
			window.api.receive('downloadFolderSelected', this.downloadFolderSelected)
			window.api.receive('applogin_arl', this.loggedInViaDeezer)
		}

		if (this.currentTab === 'logs') {
			this.fetchLogs()
			this.fetchPermissions()
		}

		this.fetchArlHealth()
		this.fetchPlexSettings()

		this.escListener = e => {
			if (e.key === 'Escape' && this.showArlModal) {
				this.showArlModal = false
			}
		}
		window.addEventListener('keydown', this.escListener)

		this.$on('hook:destroyed', () => {
			socket.off('updateSettings')
			socket.off('familyAccounts')
			this.stopAutoRefresh()
			if (this.escListener) {
				window.removeEventListener('keydown', this.escListener)
			}
		})
	},
	methods: {
		...mapActions({
			dispatchARL: 'setARL',
			dispatchAccessTocken: 'setAccessToken',
			dispatchUser: 'setUser',
			removeARL: 'removeARL',
			setPreviewVolume: 'setPreviewVolume',
			setSlimDownloads: 'setSlimDownloads',
			setSlimSidebar: 'setSlimSidebar',
			setShowBitrateTags: 'setShowBitrateTags',
			setShowSearchButton: 'setShowSearchButton',
			dispatchLogout: 'logout',
			dispatchLogin: 'login',
			setSpotifyUserId: 'setSpotifyUserId',
			refreshSpotifyStatus: 'refreshSpotifyStatus'
		}),
		onTemplateVariableClick(templateName) {
			copyToClipboard(templateName)
			toast(`Copied ${templateName} to clipboard!`)
		},
		revertSettings() {
			this.settings = JSON.parse(JSON.stringify(this.lastSettings))
		},
		revertCredentials() {
			this.spotifyCredentials = JSON.parse(JSON.stringify(this.lastCredentials))
			this.spotifyUser = (' ' + this.lastUser).slice(1)
		},
		copyARLtoClipboard() {
			const arlVal = (this.$refs.loginInput && this.$refs.loginInput.value) || this.arl || ''
			copyToClipboard(arlVal)
			toast(this.$t('settings.toasts.ARLcopied'), 'assignment')
		},
		async fetchArlHealth(verify = false) {
			if (verify) this.isVerifyingArl = true
			try {
				const params = verify ? { verify: 'true' } : {}
				const data = await fetchData('arlHealth', params)
				if (data) {
					this.arlHealth = { ...this.arlHealth, ...data }
					if (verify) {
						if (data.deezerReachable) {
							toast(this.$t('settings.toasts.sessionVerified'), 'cloud_done', true)
						} else {
							toast(this.$t('settings.toasts.sessionVerifyFailed'), 'cloud_off', true)
						}
					}
				}
			} catch (err) {
				console.error('Failed to fetch ARL health diagnostics:', err)
				if (verify) {
					toast(this.$t('settings.toasts.sessionVerifyFailed'), 'error', true)
				}
			} finally {
				this.isVerifyingArl = false
			}
		},
		verifyArlHealth() {
			this.fetchArlHealth(true)
		},
		copyCookieName() {
			copyToClipboard('arl')
			toast(this.$t('settings.toasts.cookieNameCopied'), 'assignment')
		},
		copyConsoleSnippet() {
			copyToClipboard(this.consoleSnippetText)
			toast(this.$t('settings.toasts.snippetCopied'), 'code')
		},
		async connectFromModal() {
			if (!this.modalArlInput || !this.modalArlInput.trim()) return
			this.isConnectingModal = true
			try {
				await this.login(this.modalArlInput.trim(), true)
				this.showArlModal = false
				this.modalArlInput = ''
				await this.fetchArlHealth()
			} finally {
				this.isConnectingModal = false
			}
		},
		changeLocale(newLocale) {
			this.$i18n.locale = newLocale
			this.currentLocale = newLocale
			localStorage.setItem('locale', newLocale)
		},
		saveSettings() {
			if (this.currentTab === 'plex') {
				this.savePlexSettings()
			}
			this.lastSettings = JSON.parse(JSON.stringify(this.settings))
			this.lastCredentials = JSON.parse(JSON.stringify(this.spotifyFeatures || {}))

			let changed = false

			if (this.lastUser !== this.spotifyUser) {
				// force cloning without linking
				this.lastUser = (' ' + (this.spotifyUser || '')).slice(1)
				localStorage.setItem('spotifyUser', this.lastUser)
				this.setSpotifyUserId(this.lastUser)
				changed = true
			}

			socket.emit('saveSettings', {
				settings: this.lastSettings,
				spotifySettings: this.lastCredentials || {},
				spotifyUser: changed ? this.lastUser : false
			})
		},
		selectDownloadFolder() {
			window.api.send('selectDownloadFolder', this.settings.downloadLocation)
		},
		downloadFolderSelected(folder) {
			this.$set(this.settings, 'downloadLocation', folder)
		},
		loadSettings(data) {
			this.lastSettings = JSON.parse(JSON.stringify(data))
			this.settings = JSON.parse(JSON.stringify(data))
		},
		loadCredentials(credentials) {
			this.lastCredentials = JSON.parse(JSON.stringify(credentials))
			this.spotifyFeatures = JSON.parse(JSON.stringify(credentials))
		},
		loggedInViaDeezer(arl) {
			this.dispatchARL({ arl })
		},
		async login(arl, force = false) {
			toast(this.$t('toasts.loggingIn'), 'loading', false, 'login-toast')
			const data = await postToServer('loginArl', { arl, force, child: this.accountNum })
			const { status, user, childs, currentChild } = data
			this.accounts = childs
			this.accountNum = currentChild
			switch (status) {
				case 1:
				case 3:
					// Login ok
					toast(this.$t('toasts.loggedIn'), 'done', true, 'login-toast')
					this.dispatchLogin(data)
					break
				case 2:
					// Already logged in
					toast(this.$t('toasts.alreadyLogged'), 'done', true, 'login-toast')
					this.dispatchUser(user)
					break
				case 0:
					// Login failed
					toast(this.$t('toasts.loginFailed'), 'close', true, 'login-toast')
					this.removeARL()
					break
				case -1:
					toast(this.$t('toasts.deezerNotAvailable'), 'close', true, 'login-toast')
			}
			this.fetchArlHealth()
		},
		loginButton() {
			const newArl = this.$refs.loginInput.value.trim()

			if (newArl && newArl !== this.arl) {
				this.login(newArl, true)
			}
		},
		async loginWithCredentials() {
			const fromLoginForm = getFormItem(this.$refs.loginWithCredentialsForm)

			const { email } = fromLoginForm('email')
			const { password } = fromLoginForm('password')

			if (!email || !password) return

			toast(this.$t('toasts.loggingIn'), 'loading', false, 'login-toast')

			const { accessToken, arl } = await postToServer('loginEmail', {
				email,
				password,
				accessToken: this.accessToken
			})

			if (accessToken !== this.accessToken) this.dispatchAccessTocken({ accessToken })
			if (arl) this.login(arl)
			else toast(this.$t('toasts.loginFailed'), 'close', true, 'login-toast')
		},
		appLogin() {
			window.api.send('applogin')
		},
		async changeAccount() {
			const [user, accountNum] = await fetchData('changeAccount', { child: this.accountNum }, 'POST')

			this.accountChanged(user, accountNum)
		},
		accountChanged(user, accountNum) {
			this.$refs.username.innerText = user.name
			this.$refs.userpicture.src = `https://e-cdns-images.dzcdn.net/images/user/${user.picture}/125x125-000000-80-0-0.jpg`
			this.accountNum = accountNum

			localStorage.setItem('accountNum', this.accountNum)
			this.fetchArlHealth()
		},
		initAccounts(accounts) {
			this.accounts = accounts
		},
		async logout() {
			const result = await postToServer('logout')
			console.log(result)
			if (result.logged_out) {
				toast(this.$t('toasts.loggedOut'), 'done', true, 'login-toast')
				this.dispatchLogout()
				this.fetchArlHealth()
			}
		},
		initSettings(settings, credentials) {
			this.loadSettings(settings)
			this.loadCredentials(credentials)

			toast(this.$t('settings.toasts.init'), 'settings')
		},
		updateSettings(data) {
			const { settings: newSettings, spotifySettings: newCredentials } = data
			this.loadSettings(newSettings)
			this.loadCredentials(newCredentials)

			toast(this.$t('settings.toasts.update'), 'settings')

			this.refreshSpotifyStatus()
		},
		resetToDefault() {
			const wantsToReset = confirm(this.$t('settings.resetMessage'))

			if (!wantsToReset) return

			this.settings = JSON.parse(JSON.stringify(this.defaultSettings))
			toast(this.$t('settings.toasts.reset'), 'settings')
		},
		canDownload(bitrate) {
			if (!this.user.id) return false
			if (this.settings.feelingLucky) return true
			const b = Number(bitrate)
			if (this.user.id && b === 1) return true
			if (this.user.can_stream_hq && b === 3) return true
			if (this.user.can_stream_lossless && b === 9) return true
			return false
		},
		async fetchLogs() {
			this.isLoadingLogs = true
			try {
				const params = { limit: 500 }
				if (this.logFilterLevel && this.logFilterLevel !== 'all') {
					params.level = this.logFilterLevel
				}
				if (this.logSearchQuery && this.logSearchQuery.trim()) {
					params.search = this.logSearchQuery.trim()
				}
				const res = await fetchData('logs', params)
				if (res && res.logs) {
					this.logs = res.logs
					if (res.counts) {
						this.logCounts = res.counts
					}
					if (this.logAutoScroll) {
						this.$nextTick(() => {
							const el = this.$refs.terminalBody
							if (el) {
								el.scrollTop = el.scrollHeight
							}
						})
					}
				}
			} catch (err) {
				console.error('Failed to fetch logs:', err)
			} finally {
				this.isLoadingLogs = false
			}
		},
		debouncedFetchLogs: debounce(function () {
			this.fetchLogs()
		}, 300),
		async fetchPermissions() {
			try {
				const res = await fetchData('checkPermissions')
				if (res && res.status) {
					this.permissions = res
				}
			} catch (err) {
				console.error('Failed to fetch permissions check:', err)
			}
		},
		setLogFilterLevel(level) {
			this.logFilterLevel = level
			this.fetchLogs()
		},
		clearLogSearch() {
			this.logSearchQuery = ''
			this.fetchLogs()
		},
		startAutoRefresh() {
			this.stopAutoRefresh()
			this.logAutoRefreshTimer = setInterval(() => {
				if (this.currentTab === 'logs') {
					this.fetchLogs()
				}
			}, 3000)
		},
		stopAutoRefresh() {
			if (this.logAutoRefreshTimer) {
				clearInterval(this.logAutoRefreshTimer)
				this.logAutoRefreshTimer = null
			}
		},
		async clearApplicationLogs() {
			const confirmed = confirm('Are you sure you want to clear all application log history?')
			if (!confirmed) return
			try {
				await postToServer('logs/clear', {})
				this.logs = []
				this.logCounts = { all: 0, info: 0, warn: 0, error: 0, debug: 0 }
				toast('Application logs cleared', 'delete')
			} catch (err) {
				console.error('Failed to clear logs:', err)
				toast('Failed to clear logs', 'error')
			}
		},
		async copyLogsToClipboard() {
			try {
				const res = await fetch(`${window.location.origin}${location.base}api/logs/export`)
				const text = await res.text()
				copyToClipboard(text)
				toast('Logs copied to clipboard!', 'assignment')
			} catch (err) {
				console.error('Failed to copy logs:', err)
				toast('Failed to copy logs', 'error')
			}
		},
		exportLogsDownload() {
			const exportUrl = `${window.location.origin}${location.base}api/logs/export`
			const a = document.createElement('a')
			a.href = exportUrl
			a.download = `deemix_${new Date().toISOString().slice(0, 10)}.log`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
		},
		toggleExpandLog(id) {
			const index = this.expandedLogIds.indexOf(id)
			if (index > -1) {
				this.expandedLogIds.splice(index, 1)
			} else {
				this.expandedLogIds.push(id)
			}
		},
		formatLogTime(timestamp) {
			if (!timestamp) return ''
			try {
				const d = new Date(timestamp)
				return (
					d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
					'.' +
					String(d.getMilliseconds()).padStart(3, '0')
				)
			} catch (e) {
				return timestamp
			}
		},
		async fetchPlexSettings() {
			try {
				const data = await fetchData('plex/settings')
				if (data) {
					this.plexSettings = {
						enabled: Boolean(data.enabled),
						serverUrl: data.serverUrl || '',
						token: data.token || '',
						sectionId: data.sectionId || '',
						autoScanOnComplete: data.autoScanOnComplete !== undefined ? Boolean(data.autoScanOnComplete) : true
					}
				}
			} catch (err) {
				console.error('Failed to fetch Plex settings:', err)
			}
		},
		async savePlexSettings() {
			this.isSavingPlex = true
			try {
				const res = await postToServer('plex/settings', this.plexSettings)
				if (res && res.success !== false) {
					toast(this.$t('settings.plex.toasts.saved'), 'done')
				} else {
					toast(this.$t('settings.plex.toasts.saveFailed'), 'error')
				}
			} catch (err) {
				console.error('Failed to save Plex settings:', err)
				toast(this.$t('settings.plex.toasts.saveFailed'), 'error')
			} finally {
				this.isSavingPlex = false
			}
		},
		async testPlexConnection() {
			this.isTestingPlex = true
			this.plexConnectionStatus = null
			this.plexErrorMessage = ''
			try {
				const res = await postToServer('plex/test', {
					serverUrl: this.plexSettings.serverUrl,
					token: this.plexSettings.token
				})
				if (res && res.success) {
					this.plexConnectionStatus = 'success'
					this.plexServerName = res.serverName || ''
					this.plexSections = Array.isArray(res.sections) ? res.sections : []
					const musicCount = this.plexSections.filter(s => s.type === 'artist').length
					const countText =
						musicCount > 0 ? `${musicCount} music libraries` : `${this.plexSections.length} libraries`
					toast(
						this.$t('settings.plex.toasts.testSuccess', {
							server: res.serverName || 'Plex',
							count: countText
						}),
						'cast_connected'
					)
				} else {
					this.plexConnectionStatus = 'error'
					this.plexErrorMessage = res?.error || 'Connection failed'
					toast(
						this.$t('settings.plex.toasts.testFailed', {
							error: this.plexErrorMessage
						}),
						'error'
					)
				}
			} catch (err) {
				this.plexConnectionStatus = 'error'
				this.plexErrorMessage = err.message || 'Connection failed'
				toast(
					this.$t('settings.plex.toasts.testFailed', {
						error: this.plexErrorMessage
					}),
					'error'
				)
			} finally {
				this.isTestingPlex = false
			}
		},
		async triggerPlexScan() {
			this.isScanningPlex = true
			try {
				const res = await postToServer('plex/scan', {
					serverUrl: this.plexSettings.serverUrl,
					token: this.plexSettings.token,
					sectionId: this.plexSettings.sectionId
				})
				if (res && res.success) {
					toast(this.$t('settings.plex.toasts.scanTriggered'), 'refresh')
				} else {
					const error = res?.error || 'Scan failed'
					toast(
						this.$t('settings.plex.toasts.scanFailed') + (error ? `: ${error}` : ''),
						'error'
					)
				}
			} catch (err) {
				console.error('Failed to trigger Plex scan:', err)
				toast(this.$t('settings.plex.toasts.scanFailed'), 'error')
			} finally {
				this.isScanningPlex = false
			}
		}
	}
}
</script>

<style scoped>
/* Page Layout */
.settings-page {
	padding-bottom: 6rem;
	max-width: 1200px;
	margin: 0 auto;
}

/* Page Header */
.page-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 1.5rem;
	gap: 1rem;
	flex-wrap: wrap;
}

.header-titles {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.page-breadcrumb {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	font-size: 0.75rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--accent-cyan);
}

.breadcrumb-icon {
	font-size: 0.95rem;
}

.page-title {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	font-size: 2rem;
	font-weight: 700;
	letter-spacing: -0.025em;
	color: var(--foreground);
	margin: 0;
}

.title-icon {
	font-size: 2.25rem;
	color: var(--accent-cyan);
}

.page-subtitle {
	color: var(--secondary-text);
	font-size: 0.95rem;
	margin: 0;
}

.header-actions {
	display: flex;
	gap: 0.75rem;
	align-items: center;
}

.action-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.6rem 1.15rem;
	font-size: 0.875rem;
	font-weight: 600;
	border-radius: 0.625rem;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-icon {
	font-size: 1.125rem;
}

/* Tab Content Panels */
.tab-content-panel {
	animation: fadeInTab 0.2s ease-out;
}

@keyframes fadeInTab {
	from {
		opacity: 0;
		transform: translateY(4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* Modern Settings Cards */
.settings-card {
	background: rgba(15, 23, 42, 0.75);
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 1rem;
	box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
	overflow: hidden;
	transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.settings-card:hover {
	border-color: rgba(255, 255, 255, 0.14);
}

/* Card Header */
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

/* Card Icon Box */
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

.card-icon-indigo {
	background: rgba(99, 102, 241, 0.15);
	color: #818cf8;
	border: 1px solid rgba(99, 102, 241, 0.3);
}

.card-icon-purple {
	background: rgba(168, 85, 247, 0.15);
	color: #c084fc;
	border: 1px solid rgba(168, 85, 247, 0.3);
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

.card-icon-amber {
	background: rgba(245, 158, 11, 0.15);
	color: #fbbf24;
	border: 1px solid rgba(245, 158, 11, 0.3);
}

.card-icon-rose {
	background: rgba(244, 63, 94, 0.15);
	color: #fb7185;
	border: 1px solid rgba(244, 63, 94, 0.3);
}

.card-icon-slate {
	background: rgba(100, 116, 139, 0.15);
	color: #94a3b8;
	border: 1px solid rgba(100, 116, 139, 0.3);
}

/* Card Body */
.card-body {
	padding: 1.5rem;
}

/* User Profile Section */
.user-profile-wrapper {
	display: flex;
	align-items: center;
	gap: 1.75rem;
	flex-wrap: wrap;
	padding: 0.5rem 0;
}

.user-avatar-container {
	position: relative;
	width: 5.5rem;
	height: 5.5rem;
	flex-shrink: 0;
}

.user-avatar-img {
	width: 100%;
	height: 100%;
	border-radius: 9999px;
	object-fit: cover;
	border: 2.5px solid #06b6d4;
	box-shadow: 0 0 16px rgba(6, 182, 212, 0.35);
}

.avatar-badge-online {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 1.5rem;
	height: 1.5rem;
	border-radius: 9999px;
	background: #10b981;
	color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px solid #0f172a;
}

.user-details-column {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
	flex: 1;
	min-width: 200px;
}

.user-name-strong {
	font-size: 1.25rem;
	font-weight: 700;
	color: #f8fafc;
}

.user-status-badges {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex-wrap: wrap;
}

.user-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	font-size: 0.75rem;
	font-weight: 600;
	padding: 0.2rem 0.6rem;
	border-radius: 9999px;
}

.tier-hi-fi {
	background: rgba(6, 182, 212, 0.18);
	color: #06b6d4;
	border: 1px solid rgba(6, 182, 212, 0.4);
}

.tier-premium {
	background: rgba(168, 85, 247, 0.18);
	color: #c084fc;
	border: 1px solid rgba(168, 85, 247, 0.4);
}

.tier-free {
	background: rgba(100, 116, 139, 0.18);
	color: #94a3b8;
	border: 1px solid rgba(100, 116, 139, 0.4);
}

.badge-country {
	background: rgba(255, 255, 255, 0.08);
	color: #cbd5e1;
	border: 1px solid rgba(255, 255, 255, 0.12);
}

.user-actions-row {
	margin-top: 0.5rem;
}

.family-account-selector {
	width: 100%;
	padding-top: 1rem;
	border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* Credentials Form */
.credentials-form {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.form-actions-right {
	display: flex;
	justify-content: flex-end;
}

/* Languages Grid */
.languages-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
	gap: 0.75rem;
}

.locale-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 1rem 0.75rem;
	border-radius: 0.75rem;
	background: rgba(30, 41, 59, 0.4);
	border: 1px solid rgba(255, 255, 255, 0.07);
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	position: relative;
	text-align: center;
	outline: none;
}

.locale-card:hover {
	background: rgba(30, 41, 59, 0.8);
	border-color: rgba(255, 255, 255, 0.2);
	transform: translateY(-2px);
}

.locale-card--active {
	border-color: #06b6d4 !important;
	background: rgba(6, 182, 212, 0.12) !important;
	box-shadow: 0 0 15px rgba(6, 182, 212, 0.25);
}

.locale-flag-box ::v-deep svg {
	width: 36px !important;
	height: 36px !important;
	border-radius: 4px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.locale-card--active .locale-flag-box ::v-deep svg {
	filter: brightness(1.05);
}

.locale-card:not(.locale-card--active) .locale-flag-box ::v-deep svg {
	filter: brightness(0.75);
}

.locale-names {
	display: flex;
	flex-direction: column;
	gap: 0.1rem;
}

.locale-name-native {
	font-size: 0.8125rem;
	font-weight: 600;
	color: #f8fafc;
	line-height: 1.2;
}

.locale-name-eng {
	font-size: 0.7rem;
	color: #94a3b8;
}

.locale-check-badge {
	position: absolute;
	top: 0.4rem;
	right: 0.4rem;
	width: 1.1rem;
	height: 1.1rem;
	border-radius: 9999px;
	background: #06b6d4;
	color: #0f172a;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* Modern Form Controls */
.form-grid-2 {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 1.25rem;
}

.form-grid-3 {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 1.25rem;
}

.input-field-group {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}

.field-label {
	font-size: 0.8125rem;
	font-weight: 600;
	color: #cbd5e1;
	letter-spacing: 0.01em;
}

.field-label-sm {
	font-size: 0.75rem;
	font-weight: 600;
	color: #94a3b8;
	margin-bottom: 0.35rem;
	display: block;
}

.field-hint {
	font-size: 0.75rem;
	color: #64748b;
	line-height: 1.35;
}

.input-warning-msg {
	font-size: 0.75rem;
	color: #fbbf24;
	margin-top: 0.25rem;
	line-height: 1.35;
}

.modern-input {
	width: 100%;
	background: rgba(30, 41, 59, 0.6);
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 0.625rem;
	padding: 0.625rem 0.875rem;
	color: #f8fafc;
	font-size: 0.875rem;
	transition: all 0.2s ease;
	outline: none;
}

.modern-input:focus {
	border-color: #06b6d4;
	box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
	background: rgba(30, 41, 59, 0.9);
}

.modern-select {
	width: 100%;
	background: rgba(30, 41, 59, 0.8);
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 0.625rem;
	padding: 0.625rem 0.875rem;
	color: #f8fafc;
	font-size: 0.875rem;
	cursor: pointer;
	transition: all 0.2s ease;
	outline: none;
}

.modern-select:focus {
	border-color: #06b6d4;
	box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
}

.input-with-button {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.btn-icon-only {
	padding: 0.625rem;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 0.625rem;
}

/* Modern Toggles and Checkboxes */
.modern-toggle-item {
	display: flex;
	align-items: flex-start;
	gap: 0.75rem;
	cursor: pointer;
	padding: 0.6rem 0.75rem;
	border-radius: 0.625rem;
	transition: background 0.15s ease;
	user-select: none;
}

.modern-toggle-item:hover {
	background: rgba(255, 255, 255, 0.04);
}

.modern-checkbox {
	width: 1.15rem;
	height: 1.15rem;
	border-radius: 0.25rem;
	accent-color: #06b6d4;
	cursor: pointer;
	margin-top: 0.15rem;
	flex-shrink: 0;
}

.toggle-text-block {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
}

.toggle-title {
	font-size: 0.875rem;
	font-weight: 500;
	color: #e2e8f0;
}

.toggle-desc {
	font-size: 0.75rem;
	color: #94a3b8;
}

.toggles-divider {
	height: 1px;
	background: rgba(255, 255, 255, 0.06);
	margin: 0.5rem 0;
}

/* Tags Checkbox Grid */
.tags-checkbox-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 0.4rem;
}

/* Range Slider */
.slider-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.slider-value-badge {
	font-size: 0.75rem;
	font-weight: 700;
	color: #06b6d4;
	background: rgba(6, 182, 212, 0.15);
	padding: 0.15rem 0.5rem;
	border-radius: 9999px;
}

.modern-slider {
	width: 100%;
	accent-color: #06b6d4;
	cursor: pointer;
	height: 0.35rem;
	border-radius: 0.25rem;
	margin-top: 0.5rem;
}

/* Links & Badges */
.modern-link-inline {
	display: inline-flex;
	align-items: center;
	color: #06b6d4;
	font-size: 0.8125rem;
	font-weight: 500;
	transition: color 0.15s ease;
	text-decoration: none;
}

.modern-link-inline:hover {
	color: #38bdf8;
	text-decoration: underline;
}

.command-info-box {
	background: rgba(30, 41, 59, 0.4);
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 0.75rem;
	padding: 1rem;
	margin-top: 0.5rem;
}

.command-info-header {
	display: flex;
	align-items: center;
	margin-bottom: 0.25rem;
}

.modern-code-badge {
	display: inline-block;
	background: rgba(0, 0, 0, 0.4);
	border: 1px solid rgba(255, 255, 255, 0.1);
	padding: 0.35rem 0.75rem;
	border-radius: 0.5rem;
	color: #38bdf8;
	font-family: monospace;
	font-size: 0.8125rem;
	margin-top: 0.5rem;
}

/* Floating Sticky Footer */
.settings-floating-footer {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 40;
	padding: 0.875rem 2rem;
	background: rgba(10, 15, 29, 0.85);
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	border-top: 1px solid rgba(255, 255, 255, 0.1);
	box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.5);
}

.footer-inner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	max-width: 1200px;
	margin: 0 auto;
	gap: 1rem;
	flex-wrap: wrap;
}

.footer-hint {
	display: flex;
	align-items: center;
}

.footer-actions {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.save-btn {
	background: linear-gradient(135deg, #06b6d4, #2563eb) !important;
	border: none !important;
	font-weight: 600;
	box-shadow: 0 4px 15px rgba(6, 182, 212, 0.35);
}

.save-btn:hover {
	box-shadow: 0 6px 20px rgba(6, 182, 212, 0.5);
	transform: translateY(-1px);
}

/* Danger Button */
.btn-danger {
	background: rgba(239, 68, 68, 0.15) !important;
	border: 1px solid rgba(239, 68, 68, 0.3) !important;
	color: #ef4444 !important;
}

.btn-danger:hover {
	background: rgba(239, 68, 68, 0.25) !important;
	border-color: rgba(239, 68, 68, 0.5) !important;
	color: #f87171 !important;
}

/* Permission Diagnostic Banner */
.permission-banner {
	display: flex;
	gap: 1.25rem;
	padding: 1.25rem 1.5rem;
	border-radius: 1rem;
	background: rgba(15, 23, 42, 0.7);
	border: 1px solid rgba(255, 255, 255, 0.08);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
}

.permission-banner.banner-ok {
	border-color: rgba(34, 197, 94, 0.3);
	background: linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(15, 23, 42, 0.7));
}

.permission-banner.banner-warn {
	border-color: rgba(234, 179, 8, 0.35);
	background: linear-gradient(135deg, rgba(234, 179, 8, 0.08), rgba(15, 23, 42, 0.7));
}

.permission-banner.banner-error {
	border-color: rgba(239, 68, 68, 0.4);
	background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(15, 23, 42, 0.7));
}

.banner-icon-col {
	display: flex;
	align-items: flex-start;
	padding-top: 0.25rem;
}

.banner-icon {
	font-size: 2rem;
}

.banner-ok .banner-icon {
	color: #22c55e;
}
.banner-warn .banner-icon {
	color: #eab308;
}
.banner-error .banner-icon {
	color: #ef4444;
}

.banner-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.banner-title {
	font-size: 1.05rem;
	font-weight: 700;
	color: #f8fafc;
	margin: 0;
}

.banner-subtitle {
	font-size: 0.85rem;
	color: #94a3b8;
	margin: 0.15rem 0 0 0;
}

.banner-checks {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
	margin-top: 0.25rem;
}

.banner-check-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	background: rgba(0, 0, 0, 0.25);
	padding: 0.35rem 0.75rem;
	border-radius: 0.5rem;
	border: 1px solid rgba(255, 255, 255, 0.06);
	font-size: 0.8125rem;
}

.check-label {
	color: #cbd5e1;
	font-weight: 500;
}

.check-path {
	color: #64748b;
	font-family: monospace;
	font-size: 0.75rem;
}

.check-badge {
	font-size: 0.7rem;
	font-weight: 600;
	padding: 0.1rem 0.45rem;
	border-radius: 9999px;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.check-badge.badge-ok {
	background: rgba(34, 197, 94, 0.2);
	color: #4ade80;
	border: 1px solid rgba(34, 197, 94, 0.3);
}

.check-badge.badge-error {
	background: rgba(239, 68, 68, 0.2);
	color: #f87171;
	border: 1px solid rgba(239, 68, 68, 0.3);
}

.banner-process-info {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem 1.25rem;
	font-size: 0.75rem;
	color: #94a3b8;
	padding-top: 0.25rem;
	border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.banner-process-info strong {
	color: #e2e8f0;
}

.banner-hint {
	font-size: 0.8rem;
	color: #fca5a5;
	background: rgba(239, 68, 68, 0.1);
	border: 1px solid rgba(239, 68, 68, 0.2);
	padding: 0.5rem 0.75rem;
	border-radius: 0.5rem;
	margin: 0;
}

/* Log Controls Bar */
.log-toolbar,
.log-controls-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	flex-wrap: wrap;
	margin-bottom: 0.75rem;
}

.log-level-filters {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	flex-wrap: wrap;
}

.level-filter-btn,
.log-filter-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid rgba(255, 255, 255, 0.08);
	color: #94a3b8;
	font-size: 0.78rem;
	font-weight: 600;
	padding: 0.38rem 0.75rem;
	border-radius: 0.5rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.level-filter-btn:hover,
.log-filter-btn:hover {
	background: rgba(255, 255, 255, 0.09);
	color: #f8fafc;
}

.level-filter-btn.active,
.log-filter-btn.active {
	background: rgba(6, 182, 212, 0.18);
	border-color: rgba(6, 182, 212, 0.5);
	color: #38bdf8;
}

.level-filter-btn.filter-info.active {
	background: rgba(56, 189, 248, 0.18);
	border-color: rgba(56, 189, 248, 0.5);
	color: #38bdf8;
}

.level-filter-btn.filter-warn {
	color: #eab308;
	border-color: rgba(234, 179, 8, 0.2);
}

.level-filter-btn.filter-warn.active {
	background: rgba(234, 179, 8, 0.18);
	border-color: rgba(234, 179, 8, 0.55);
	color: #fde047;
}

.level-filter-btn.filter-error {
	color: #f87171;
	border-color: rgba(239, 68, 68, 0.22);
}

.level-filter-btn.filter-error.active {
	background: rgba(239, 68, 68, 0.2);
	border-color: rgba(239, 68, 68, 0.55);
	color: #fca5a5;
}

.filter-count,
.log-count-pill {
	font-size: 0.7rem;
	padding: 0.08rem 0.4rem;
	border-radius: 9999px;
	background: rgba(0, 0, 0, 0.35);
	color: inherit;
}

.log-search-box {
	position: relative;
	display: flex;
	align-items: center;
	min-width: 220px;
	flex: 1 1 220px;
	max-width: 340px;
}

.log-search-box .search-icon,
.log-search-icon {
	position: absolute;
	left: 0.7rem;
	font-size: 1rem;
	color: #64748b;
	pointer-events: none;
}

.log-search-input {
	width: 100%;
	padding: 0.45rem 2rem 0.45rem 2.25rem;
	background: rgba(15, 23, 42, 0.6);
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 0.5rem;
	color: #f8fafc;
	font-size: 0.8125rem;
	outline: none;
	transition: border-color 0.15s ease;
}

.log-search-input:focus {
	border-color: #06b6d4;
}

.clear-search-btn {
	position: absolute;
	right: 0.5rem;
	background: transparent;
	border: none;
	color: #94a3b8;
	cursor: pointer;
	display: flex;
	align-items: center;
	padding: 0.2rem;
}

.clear-search-btn:hover {
	color: #f8fafc;
}

/* Terminal Window & Lines */
.terminal-window {
	border-radius: 0.875rem;
	border: 1px solid rgba(255, 255, 255, 0.1);
	background: #090d16;
	overflow: hidden;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.terminal-window-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: rgba(15, 23, 42, 0.85);
	padding: 0.6rem 1rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.window-dots {
	display: flex;
	gap: 0.35rem;
}

.dot {
	width: 0.65rem;
	height: 0.65rem;
	border-radius: 50%;
}

.dot-red {
	background: #ef4444;
}
.dot-yellow {
	background: #eab308;
}
.dot-green {
	background: #22c55e;
}

.window-title {
	font-size: 0.75rem;
	font-family: monospace;
	color: #94a3b8;
}

.window-options {
	display: flex;
	align-items: center;
}

.auto-scroll-label {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	font-size: 0.75rem;
	color: #94a3b8;
	cursor: pointer;
}

.terminal-body {
	max-height: 520px;
	overflow-y: auto;
	padding: 0.75rem 1rem;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	font-size: 0.8rem;
	line-height: 1.5;
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.terminal-empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 3rem 1rem;
	color: #64748b;
	gap: 0.5rem;
}

.terminal-empty-icon {
	font-size: 2.5rem;
}

.terminal-line {
	display: flex;
	align-items: baseline;
	gap: 0.6rem;
	flex-wrap: wrap;
	padding: 0.2rem 0.35rem;
	border-radius: 0.25rem;
	transition: background 0.1s ease;
}

.terminal-line:hover {
	background: rgba(255, 255, 255, 0.03);
}

.log-timestamp {
	color: #64748b;
	font-size: 0.75rem;
	flex-shrink: 0;
}

.log-badge {
	font-size: 0.65rem;
	font-weight: 700;
	padding: 0.1rem 0.4rem;
	border-radius: 0.25rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	flex-shrink: 0;
}

.badge-info {
	background: rgba(56, 189, 248, 0.15);
	color: #38bdf8;
	border: 1px solid rgba(56, 189, 248, 0.25);
}

.badge-warn {
	background: rgba(234, 179, 8, 0.15);
	color: #facc15;
	border: 1px solid rgba(234, 179, 8, 0.25);
}

.badge-error {
	background: rgba(239, 68, 68, 0.15);
	color: #f87171;
	border: 1px solid rgba(239, 68, 68, 0.25);
}

.badge-debug {
	background: rgba(148, 163, 184, 0.15);
	color: #cbd5e1;
	border: 1px solid rgba(148, 163, 184, 0.25);
}

.log-msg {
	color: #e2e8f0;
	flex: 1;
	word-break: break-word;
}

.line-warn .log-msg {
	color: #fef08a;
}

.line-error .log-msg {
	color: #fca5a5;
}

.line-debug .log-msg {
	color: #94a3b8;
}

.meta-toggle-btn {
	background: transparent;
	border: 1px solid rgba(255, 255, 255, 0.1);
	color: #94a3b8;
	font-size: 0.7rem;
	padding: 0.1rem 0.4rem;
	border-radius: 0.25rem;
	cursor: pointer;
	margin-left: auto;
}

.meta-toggle-btn:hover {
	color: #f8fafc;
	border-color: rgba(255, 255, 255, 0.25);
}

.log-trace-box {
	width: 100%;
	background: rgba(0, 0, 0, 0.5);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 0.35rem;
	padding: 0.5rem;
	font-size: 0.75rem;
	color: #cbd5e1;
	overflow-x: auto;
	margin: 0.25rem 0;
}

/* Spin animation */
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

/* ARL Health Card & Header */
.arl-health-card {
	border-color: rgba(6, 182, 212, 0.2);
}

.arl-health-header {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 1.25rem 1.5rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	background: rgba(30, 41, 59, 0.35);
}

.header-actions-end {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-left: auto;
}

.health-status-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	font-size: 0.725rem;
	font-weight: 700;
	padding: 0.2rem 0.65rem;
	border-radius: 9999px;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.health-status-pill .status-dot {
	width: 7px;
	height: 7px;
	border-radius: 9999px;
}

.status-pill--active {
	background: rgba(16, 185, 129, 0.15);
	color: #34d399;
	border: 1px solid rgba(16, 185, 129, 0.35);
}

.status-pill--active .status-dot {
	background: #10b981;
	box-shadow: 0 0 6px #10b981;
}

.status-pill--warning {
	background: rgba(245, 158, 11, 0.15);
	color: #fbbf24;
	border: 1px solid rgba(245, 158, 11, 0.35);
}

.status-pill--warning .status-dot {
	background: #f59e0b;
	box-shadow: 0 0 6px #f59e0b;
}

.status-pill--expired {
	background: rgba(244, 63, 94, 0.15);
	color: #fb7185;
	border: 1px solid rgba(244, 63, 94, 0.35);
}

.status-pill--expired .status-dot {
	background: #f43f5e;
	box-shadow: 0 0 6px #f43f5e;
}

.health-reachability-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	font-size: 0.725rem;
	font-weight: 600;
	padding: 0.2rem 0.55rem;
	border-radius: 9999px;
}

.reachability-online {
	background: rgba(16, 185, 129, 0.12);
	color: #34d399;
	border: 1px solid rgba(16, 185, 129, 0.25);
}

.reachability-offline {
	background: rgba(244, 63, 94, 0.12);
	color: #fb7185;
	border: 1px solid rgba(244, 63, 94, 0.25);
}

/* Health Metrics Grid */
.health-metrics-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: 1.25rem;
}

.health-metric-box {
	background: rgba(30, 41, 59, 0.35);
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 0.75rem;
	padding: 1.25rem;
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.metric-label {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	font-size: 0.75rem;
	font-weight: 700;
	color: #94a3b8;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.metric-value-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	flex-wrap: wrap;
}

.quality-tier-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	font-size: 1.05rem;
	font-weight: 700;
	padding: 0.35rem 0.85rem;
	border-radius: 0.5rem;
}

.capability-pills-row {
	display: flex;
	gap: 0.45rem;
	flex-wrap: wrap;
	margin-top: 0.25rem;
}

.cap-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	font-size: 0.75rem;
	font-weight: 500;
	padding: 0.2rem 0.55rem;
	border-radius: 0.375rem;
	background: rgba(15, 23, 42, 0.5);
	color: #64748b;
	border: 1px solid rgba(255, 255, 255, 0.05);
	transition: all 0.2s ease;
}

.cap-pill--enabled {
	color: #34d399;
	background: rgba(16, 185, 129, 0.1);
	border-color: rgba(16, 185, 129, 0.3);
}

.session-days-text {
	font-size: 1.15rem;
	font-weight: 700;
	color: #f8fafc;
}

.source-tag {
	font-size: 0.725rem;
	font-weight: 600;
	padding: 0.15rem 0.5rem;
	border-radius: 0.375rem;
	background: rgba(59, 130, 246, 0.12);
	color: #60a5fa;
	border: 1px solid rgba(59, 130, 246, 0.25);
}

.session-progress-wrapper {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.session-progress-bar {
	flex: 1;
	height: 8px;
	border-radius: 9999px;
	background: rgba(15, 23, 42, 0.7);
	overflow: hidden;
	border: 1px solid rgba(255, 255, 255, 0.06);
}

.session-progress-fill {
	height: 100%;
	border-radius: 9999px;
	transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fill-emerald {
	background: linear-gradient(90deg, #10b981, #34d399);
}

.fill-amber {
	background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.fill-rose {
	background: linear-gradient(90deg, #ef4444, #f43f5e);
}

.progress-percent-label {
	font-size: 0.8rem;
	font-weight: 700;
	color: #94a3b8;
	min-width: 36px;
	text-align: right;
}

.session-meta-note {
	font-size: 0.75rem;
	color: #64748b;
	display: flex;
	align-items: center;
	line-height: 1.4;
}

.btn-link-reset {
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	text-decoration: none;
	font: inherit;
	color: inherit;
}

.btn-xs {
	padding: 0.25rem 0.55rem;
	font-size: 0.75rem;
	border-radius: 0.375rem;
}

/* Modal Window Styles */
.modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.8);
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
	z-index: 99999;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1.5rem;
}

.modal-card {
	background: rgba(15, 23, 42, 0.95);
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 1.25rem;
	width: 100%;
	max-height: 90vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
	animation: modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.arl-guide-modal-card {
	max-width: 46rem;
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
	padding: 1.25rem 1.5rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1.5rem;
	background: rgba(30, 41, 59, 0.35);
}

.modal-header-main {
	display: flex;
	align-items: center;
	gap: 1rem;
	flex: 1;
	min-width: 0;
}

.modal-header-info {
	flex: 1;
	min-width: 0;
}

.modal-type-badge {
	font-size: 0.6875rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	color: #06b6d4;
	text-transform: uppercase;
}

.modal-album-title {
	font-size: 1.25rem;
	font-weight: 700;
	color: #f8fafc;
	margin: 0.15rem 0 0.25rem 0;
}

.modal-album-artist {
	font-size: 0.825rem;
	color: #94a3b8;
	margin: 0;
}

.modal-close-btn {
	background: transparent;
	border: none;
	color: #94a3b8;
	cursor: pointer;
	padding: 0.4rem;
	border-radius: 0.5rem;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.15s ease;
}

.modal-close-btn:hover {
	background: rgba(255, 255, 255, 0.08);
	color: #f8fafc;
}

.modal-body {
	padding: 1.5rem;
	overflow-y: auto;
	flex: 1;
}

.modal-footer {
	padding: 1rem 1.5rem;
	border-top: 1px solid rgba(255, 255, 255, 0.08);
	background: rgba(30, 41, 59, 0.35);
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

/* Guide Tabs & Steps */
.guide-tabs-row {
	display: flex;
	gap: 0.5rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	padding-bottom: 0.75rem;
	overflow-x: auto;
}

.guide-tab-btn {
	display: inline-flex;
	align-items: center;
	padding: 0.5rem 0.85rem;
	border-radius: 0.5rem;
	border: 1px solid transparent;
	background: transparent;
	color: #94a3b8;
	font-size: 0.825rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.15s ease;
	white-space: nowrap;
}

.guide-tab-btn:hover {
	color: #f8fafc;
	background: rgba(255, 255, 255, 0.05);
}

.guide-tab-btn--active {
	color: #06b6d4;
	background: rgba(6, 182, 212, 0.12);
	border-color: rgba(6, 182, 212, 0.35);
}

.steps-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 0.85rem;
}

.step-card {
	background: rgba(30, 41, 59, 0.45);
	border: 1px solid rgba(255, 255, 255, 0.07);
	border-radius: 0.75rem;
	padding: 1rem;
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
}

.step-badge {
	width: 1.75rem;
	height: 1.75rem;
	border-radius: 9999px;
	background: rgba(6, 182, 212, 0.2);
	color: #06b6d4;
	font-weight: 800;
	font-size: 0.8rem;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(6, 182, 212, 0.4);
}

.step-title {
	font-size: 0.9rem;
	font-weight: 700;
	color: #f8fafc;
	margin: 0;
}

.step-desc {
	font-size: 0.8rem;
	color: #94a3b8;
	margin: 0;
	line-height: 1.45;
}

/* Helper Console Box */
.helper-box {
	background: rgba(15, 23, 42, 0.6);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 0.75rem;
	padding: 1rem;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.helper-box-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	flex-wrap: wrap;
}

.helper-box-title {
	font-size: 0.85rem;
	font-weight: 700;
	color: #f8fafc;
}

.helper-box-desc {
	font-size: 0.775rem;
	color: #94a3b8;
	margin: 0;
}

.helper-code-block {
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	font-size: 0.75rem;
	background: rgba(0, 0, 0, 0.5);
	padding: 0.5rem 0.75rem;
	border-radius: 0.4rem;
	border: 1px solid rgba(255, 255, 255, 0.06);
	color: #38bdf8;
	word-break: break-all;
	overflow-x: auto;
}

/* Modal Connect Card */
.modal-connect-card {
	background: rgba(30, 41, 59, 0.35);
	border: 1px solid rgba(255, 255, 255, 0.07);
	border-radius: 0.75rem;
	padding: 1rem;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.connect-card-title {
	font-size: 0.9rem;
	font-weight: 700;
	color: #f8fafc;
	margin: 0;
	display: flex;
	align-items: center;
}

.connect-card-desc {
	font-size: 0.775rem;
	color: #94a3b8;
	margin: 0;
}

/* Plex Card Styles */
.plex-card {
	border-color: rgba(245, 158, 11, 0.2);
}

.plex-status-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	font-size: 0.775rem;
	font-weight: 600;
	padding: 0.25rem 0.75rem;
	border-radius: 9999px;
	letter-spacing: 0.02em;
}

.plex-status-pill .status-dot {
	width: 7px;
	height: 7px;
	border-radius: 9999px;
}

.plex-footer-actions {
	padding-top: 0.5rem;
}
</style>
