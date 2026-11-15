<template>
	<div class="settings-page">
		<!-- Page Header -->
		<div class="page-header">
			<div class="header-titles">
				<h1 class="page-title">
					<i class="material-icons title-icon">tune</i>
					{{ $t('settings.title') }}
				</h1>
				<p class="page-subtitle">
					Configure application preferences, download paths, audio quality, and account integrations
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

		<div class="settings-content space-y-6">
			<!-- 1. ACCOUNT & LOGIN CARD -->
			<div class="settings-card">
				<div class="card-header">
					<div class="card-icon-box card-icon-cyan">
						<i class="material-icons">person</i>
					</div>
					<div class="card-titles">
						<h3 class="card-title">{{ $t('settings.login.title') }}</h3>
						<p class="card-subtitle">Manage Deezer account credentials, session, and subscription tier</p>
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
										<strong id="settings_username" ref="username" class="user-name-strong">{{ user.name || 'not logged' }}</strong>
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

					<!-- ARL Accordion inside Account card -->
					<BaseAccordion class="sub-accordion-box mt-4">
						<template #title>
							<div class="sub-accordion-trigger">
								<i class="material-icons trigger-icon text-cyan">vpn_key</i>
								<span class="trigger-text">{{ $t('settings.login.arl.title') }}</span>
							</div>
						</template>
						<div class="sub-accordion-content space-y-4">
							<div class="input-with-button">
								<input
									id="login_input_arl"
									ref="loginInput"
									:value="arl"
									autocomplete="off"
									placeholder="Paste your Deezer ARL cookie here..."
									type="password"
									class="modern-input"
								/>
								<button class="btn btn-secondary btn-icon-only" title="Copy ARL to clipboard" @click="copyARLtoClipboard">
									<i class="material-icons">assignment</i>
								</button>
							</div>

							<div class="arl-help-link">
								<router-link :to="{ name: 'ARL' }" class="modern-link-inline">
									<i class="material-icons text-sm mr-1">help_outline</i>
									{{ $t('settings.login.arl.question') }}
								</router-link>
							</div>

							<button class="btn btn-primary w-full" @click="loginButton">
								<i class="material-icons btn-icon text-sm">sync</i>
								<span>{{ $t('settings.login.arl.update') }}</span>
							</button>
						</div>
					</BaseAccordion>
				</div>
			</div>

			<!-- 2. LANGUAGES CARD -->
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

			<!-- 3. APPEARANCE ACCORDION -->
			<BaseAccordion class="settings-card settings-accordion">
				<template #title>
					<div class="card-header-summary">
						<div class="card-icon-box card-icon-purple">
							<i class="material-icons">palette</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.appearance.title') }}</h3>
							<p class="card-subtitle">Sidebar layout density and visual feature tags</p>
						</div>
					</div>
				</template>

				<div class="card-body-accordion space-y-4">
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
			</BaseAccordion>

			<!-- 4. DOWNLOAD PATH ACCORDION -->
			<BaseAccordion class="settings-card settings-accordion">
				<template #title>
					<div class="card-header-summary">
						<div class="card-icon-box card-icon-emerald">
							<i class="material-icons">folder</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.downloadPath.title') }}</h3>
							<p class="card-subtitle">Storage directory where audio files and metadata will be saved</p>
						</div>
					</div>
				</template>

				<div class="card-body-accordion">
					<div class="input-field-group">
						<span class="field-label">{{ $t('settings.downloadPath.title') }}</span>
						<div class="input-with-button">
							<input v-model="settings.downloadLocation" autocomplete="off" type="text" class="modern-input" />
							<button v-if="clientMode" class="btn btn-secondary btn-icon-only" title="Browse folder" @click="selectDownloadFolder">
								<i class="material-icons">folder_open</i>
							</button>
						</div>
						<span class="field-hint">Default docker volume path: /downloads</span>
					</div>
				</div>
			</BaseAccordion>

			<!-- 5. TEMPLATES ACCORDION -->
			<BaseAccordion class="settings-card settings-accordion">
				<template #title>
					<div class="card-header-summary">
						<div class="card-icon-box card-icon-blue">
							<i class="material-icons">font_download</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.templates.title') }}</h3>
							<p class="card-subtitle">Pattern formatting for track filenames across albums and playlists</p>
						</div>
					</div>
				</template>

				<div class="card-body-accordion space-y-6">
					<div class="input-field-group">
						<span class="field-label">{{ $t('settings.templates.tracknameTemplate') }}</span>
						<input v-model="settings.tracknameTemplate" type="text" class="modern-input mb-3" />
						<TemplateVariablesList :template-variables="trackTemplateVariables" @variable-click="onTemplateVariableClick">
							<template #title>
								{{ $t('settings.templates.tracknameAvailableVariables') }}
							</template>
						</TemplateVariablesList>
					</div>

					<div class="input-field-group">
						<span class="field-label">{{ $t('settings.templates.albumTracknameTemplate') }}</span>
						<input v-model="settings.albumTracknameTemplate" type="text" class="modern-input mb-3" />
						<TemplateVariablesList :template-variables="trackTemplateVariables" @variable-click="onTemplateVariableClick">
							<template #title>
								{{ $t('settings.templates.albumTracknameAvailableVariables') }}
							</template>
						</TemplateVariablesList>
					</div>

					<div class="input-field-group">
						<span class="field-label">{{ $t('settings.templates.playlistTracknameTemplate') }}</span>
						<input v-model="settings.playlistTracknameTemplate" type="text" class="modern-input mb-3" />
						<TemplateVariablesList :template-variables="trackTemplateVariables" @variable-click="onTemplateVariableClick">
							<template #title>
								{{ $t('settings.templates.playlistTracknameAvailableVariables') }}
							</template>
						</TemplateVariablesList>
					</div>
				</div>
			</BaseAccordion>

			<!-- 6. FOLDERS ACCORDION -->
			<BaseAccordion class="settings-card settings-accordion">
				<template #title>
					<div class="card-header-summary">
						<div class="card-icon-box card-icon-amber">
							<i class="material-icons">create_new_folder</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.folders.title') }}</h3>
							<p class="card-subtitle">Automatic directory creation for artists, albums, CDs, and playlists</p>
						</div>
					</div>
				</template>

				<div class="card-body-accordion space-y-5">
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
			</BaseAccordion>

			<!-- 7. TRACK TITLES ACCORDION -->
			<BaseAccordion class="settings-card settings-accordion">
				<template #title>
					<div class="card-header-summary">
						<div class="card-icon-box card-icon-rose">
							<i class="material-icons">title</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.trackTitles.title') }}</h3>
							<p class="card-subtitle">Track numbering padding and filesystem character safety</p>
						</div>
					</div>
				</template>

				<div class="card-body-accordion">
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
			</BaseAccordion>

			<!-- 8. COVERS & ARTWORK ACCORDION -->
			<BaseAccordion class="settings-card settings-accordion">
				<template #title>
					<div class="card-header-summary">
						<div class="card-icon-box card-icon-cyan">
							<i class="material-icons">album</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.covers.title') }}</h3>
							<p class="card-subtitle">Cover image quality, local saving options, and embedded dimensions</p>
						</div>
					</div>
				</template>

				<div class="card-body-accordion space-y-5">
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
							<input v-model.number="settings.localArtworkSize" max="10000" min="100" step="100" type="number" class="modern-input" />
							<p v-if="settings.localArtworkSize > 1200" class="input-warning-msg">
								⚠️ {{ $t('settings.covers.imageSizeWarning') }}
							</p>
						</div>

						<div class="input-field-group">
							<span class="field-label">{{ $t('settings.covers.embeddedArtworkSize') }}</span>
							<input v-model.number="settings.embeddedArtworkSize" max="10000" min="100" step="100" type="number" class="modern-input" />
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
							<input v-model.number="settings.jpegImageQuality" max="100" min="1" type="number" class="modern-input" />
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
			</BaseAccordion>

			<!-- 9. ID3 TAGS ACCORDION -->
			<BaseAccordion class="settings-card settings-accordion">
				<template #title>
					<div class="card-header-summary">
						<div class="card-icon-box card-icon-indigo">
							<i class="material-icons">bookmarks</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.tags.head') }}</h3>
							<p class="card-subtitle">Configure metadata tags embedded into downloaded audio files</p>
						</div>
					</div>
				</template>

				<div class="card-body-accordion space-y-4">
					<div class="tags-checkbox-grid">
						<label class="modern-toggle-item"><input v-model="settings.tags.title" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.title') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.artist" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.artist') }}</span></label>
						<label v-if="settings.tags.multiArtistSeparator != 'default'" class="modern-toggle-item"><input v-model="settings.tags.artists" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.artists') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.album" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.album') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.cover" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.cover') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.trackNumber" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.trackNumber') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.trackTotal" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.trackTotal') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.discNumber" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.discNumber') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.discTotal" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.discTotal') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.albumArtist" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.albumArtist') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.genre" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.genre') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.year" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.year') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.date" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.date') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.explicit" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.explicit') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.isrc" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.isrc') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.length" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.length') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.barcode" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.barcode') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.bpm" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.bpm') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.replayGain" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.replayGain') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.label" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.label') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.lyrics" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.lyrics') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.syncedLyrics" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.syncedLyrics') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.copyright" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.copyright') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.composer" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.composer') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.involvedPeople" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.involvedPeople') }}</span></label>
						<label class="modern-toggle-item"><input v-model="settings.tags.source" type="checkbox" class="modern-checkbox" /><span class="toggle-title">{{ $t('settings.tags.source') }}</span></label>
					</div>

					<p v-if="settings.tags.multiArtistSeparator != 'default' && !settings.tags.artists" class="input-warning-msg mt-3">
						⚠️ {{ $t('settings.tags.artistsWarning') }}
					</p>
				</div>
			</BaseAccordion>

			<!-- 10. DOWNLOADS ENGINE ACCORDION -->
			<BaseAccordion class="settings-card settings-accordion">
				<template #title>
					<div class="card-header-summary">
						<div class="card-icon-box card-icon-cyan">
							<i class="material-icons">get_app</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.downloads.title') }}</h3>
							<p class="card-subtitle">Queue concurrency, audio bitrates, overwrite policies, and fallbacks</p>
						</div>
					</div>
				</template>

				<div class="card-body-accordion space-y-5">
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
			</BaseAccordion>

			<!-- 11. ADVANCED & OTHER ACCORDION -->
			<BaseAccordion class="settings-card settings-accordion">
				<template #title>
					<div class="card-header-summary">
						<div class="card-icon-box card-icon-slate">
							<i class="material-icons">list</i>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.other.title') }}</h3>
							<p class="card-subtitle">Casing transformations, artist separators, and preview player volume</p>
						</div>
					</div>
				</template>

				<div class="card-body-accordion space-y-5">
					<div class="form-grid-3">
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
					</div>

					<div class="toggles-divider"></div>

					<div class="form-grid-3">
						<div class="input-field-group">
							<span class="field-label">{{ $t('settings.other.multiArtistSeparator.title') }}</span>
							<select v-model="settings.tags.multiArtistSeparator" class="modern-select">
								<option value="nothing">{{ $t('settings.other.multiArtistSeparator.nothing') }}</option>
								<option value="default">{{ $t('settings.other.multiArtistSeparator.default') }}</option>
								<option value="andFeat">{{ $t('settings.other.multiArtistSeparator.andFeat') }}</option>
								<option value=" & ">{{ $t('settings.other.multiArtistSeparator.using', { separator: ' & ' }) }}</option>
								<option value=",">{{ $t('settings.other.multiArtistSeparator.using', { separator: ',' }) }}</option>
								<option value=", ">{{ $t('settings.other.multiArtistSeparator.using', { separator: ', ' }) }}</option>
								<option value="/">{{ $t('settings.other.multiArtistSeparator.using', { separator: '/' }) }}</option>
								<option value=" / ">{{ $t('settings.other.multiArtistSeparator.using', { separator: ' / ' }) }}</option>
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
								<option value="Y-M-D">{{ `${$t('settings.other.dateFormat.year')}-${$t('settings.other.dateFormat.month')}-${$t('settings.other.dateFormat.day')}` }}</option>
								<option value="Y-D-M">{{ `${$t('settings.other.dateFormat.year')}-${$t('settings.other.dateFormat.day')}-${$t('settings.other.dateFormat.month')}` }}</option>
								<option value="D-M-Y">{{ `${$t('settings.other.dateFormat.day')}-${$t('settings.other.dateFormat.month')}-${$t('settings.other.dateFormat.year')}` }}</option>
								<option value="M-D-Y">{{ `${$t('settings.other.dateFormat.month')}-${$t('settings.other.dateFormat.day')}-${$t('settings.other.dateFormat.year')}` }}</option>
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

					<div class="form-grid-3">
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

						<div class="input-field-group">
							<div class="slider-header">
								<span class="field-label">{{ $t('settings.other.previewVolume') }}</span>
								<span class="slider-value-badge">{{ previewVolume }}%</span>
							</div>
							<input v-model.number="modelVolume" class="modern-slider" max="100" min="0" step="1" type="range" />
						</div>
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
			</BaseAccordion>

			<!-- 12. SPOTIFY ACCORDION -->
			<BaseAccordion class="settings-card settings-accordion">
				<template #title>
					<div class="card-header-summary">
						<div class="card-icon-box spotify-icon-box">
							<svg
								class="spotify-svg-icon"
								enable-background="new 0 0 24 24"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="m12 24c6.624 0 12-5.376 12-12s-5.376-12-12-12-12 5.376-12 12 5.376 12 12 12zm4.872-6.344v.001c-.807 0-3.356-2.828-10.52-1.36-.189.049-.436.126-.576.126-.915 0-1.09-1.369-.106-1.578 3.963-.875 8.013-.798 11.467 1.268.824.526.474 1.543-.265 1.543zm1.303-3.173c-.113-.03-.08.069-.597-.203-3.025-1.79-7.533-2.512-11.545-1.423-.232.063-.358.126-.576.126-1.071 0-1.355-1.611-.188-1.94 4.716-1.325 9.775-.552 13.297 1.543.392.232.547.533.547.953-.005.522-.411.944-.938.944zm-13.627-7.485c4.523-1.324 11.368-.906 15.624 1.578 1.091.629.662 2.22-.498 2.22l-.001-.001c-.252 0-.407-.063-.625-.189-3.443-2.056-9.604-2.549-13.59-1.436-.175.048-.393.125-.625.125-.639 0-1.127-.499-1.127-1.142 0-.657.407-1.029.842-1.155z"
								/>
							</svg>
						</div>
						<div class="card-titles">
							<h3 class="card-title">{{ $t('settings.spotify.title') }}</h3>
							<p class="card-subtitle">Connect Spotify API credentials to match and import Spotify tracks and playlists</p>
						</div>
					</div>
				</template>

				<div class="card-body-accordion space-y-4">
					<div class="spotify-link-box">
						<router-link :to="{ name: 'Spotify Features' }" class="modern-link-inline">
							<i class="material-icons text-sm mr-1">info</i>
							{{ $t('settings.spotify.question') }}
						</router-link>
					</div>

					<div class="form-grid-3">
						<div class="input-field-group">
							<span class="field-label">{{ $t('settings.spotify.clientID') }}</span>
							<input v-model="spotifyFeatures.clientId" type="text" class="modern-input" />
						</div>

						<div class="input-field-group">
							<span class="field-label">{{ $t('settings.spotify.clientSecret') }}</span>
							<input v-model="spotifyFeatures.clientSecret" type="password" class="modern-input" />
						</div>

						<div class="input-field-group">
							<span class="field-label">{{ $t('settings.spotify.username') }}</span>
							<input v-model="spotifyUser" type="text" class="modern-input" />
						</div>
					</div>

					<label class="modern-toggle-item">
						<input v-model="spotifyFeatures.fallbackSearch" type="checkbox" class="modern-checkbox" />
						<div class="toggle-text-block">
							<span class="toggle-title">{{ $t('settings.downloads.fallbackSearch') }}</span>
							<span class="toggle-desc">Search alternative tracks if exact Spotify match is unavailable</span>
						</div>
					</label>
				</div>
			</BaseAccordion>
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

import BaseAccordion from '@/components/globals/BaseAccordion.vue'
import { fetchData, postToServer } from '@/utils/api'
import { getFormItem } from '@/utils/forms'

export default {
	components: {
		BaseAccordion,
		TemplateVariablesList
	},
	data() {
		return {
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
			trackTemplateVariables
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
			showSearchButton: 'getShowSearchButton',
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
			if (this.user.can_stream_lossless) return "Hi-Fi"
			else if (this.user.can_stream_hq) return "Premium"
			else return "Free"
		}
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

		this.$on('hook:destroyed', () => {
			socket.off('updateSettings')
			socket.off('familyAccounts')
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
			const copyText = this.$refs.loginInput

			copyText.setAttribute('type', 'text')
			copyText.select()
			copyText.setSelectionRange(0, 99999)
			document.execCommand('copy')
			copyText.setAttribute('type', 'password')

			toast(this.$t('settings.toasts.ARLcopied'), 'assignment')
		},
		changeLocale(newLocale) {
			this.$i18n.locale = newLocale
			this.currentLocale = newLocale
			localStorage.setItem('locale', newLocale)
		},
		saveSettings() {
			this.lastSettings = JSON.parse(JSON.stringify(this.settings))
			this.lastCredentials = JSON.parse(JSON.stringify(this.spotifyFeatures))

			let changed = false

			if (this.lastUser !== this.spotifyUser) {
				// force cloning without linking
				this.lastUser = (' ' + this.spotifyUser).slice(1)
				localStorage.setItem('spotifyUser', this.lastUser)
				this.setSpotifyUserId(this.lastUser)
				changed = true
			}

			socket.emit('saveSettings', {
				settings: this.lastSettings,
				spotifySettings: this.lastCredentials,
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
		canDownload(bitrate){
			if (!this.user.id) return false
			if (this.settings.feelingLucky) return true
			if (this.user.id && bitrate == 1) return true
			if (this.user.can_stream_hq && bitrate == 3) return true
			if (this.user.can_stream_lossless && bitrate == 9) return true
			return false
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
	margin-bottom: 2rem;
	gap: 1rem;
	flex-wrap: wrap;
}

.header-titles {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.page-title {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	font-size: 2rem;
	font-weight: 700;
	letter-spacing: -0.025em;
	color: #f8fafc;
	margin: 0;
}

.title-icon {
	font-size: 2.25rem;
	color: #06b6d4;
}

.page-subtitle {
	color: #94a3b8;
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

.card-header-summary {
	display: flex;
	align-items: center;
	gap: 1rem;
	width: 100%;
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

.spotify-icon-box {
	background: rgba(29, 185, 84, 0.15);
	border: 1px solid rgba(29, 185, 84, 0.3);
}

.spotify-svg-icon {
	width: 1.5rem;
	height: 1.5rem;
	fill: #1db954;
}

/* Card Body */
.card-body {
	padding: 1.5rem;
}

.card-body-accordion {
	padding: 0.5rem 1.5rem 1.5rem 1.5rem;
}

/* Accordion Specifics */
.settings-accordion ::v-deep summary {
	outline: none;
	cursor: pointer;
	padding: 1.25rem 1.5rem;
	background: rgba(30, 41, 59, 0.25);
	transition: background 0.2s ease;
}

.settings-accordion ::v-deep summary:hover {
	background: rgba(30, 41, 59, 0.45);
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

/* Sub-Accordion */
.sub-accordion-box {
	background: rgba(30, 41, 59, 0.35);
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 0.75rem;
	padding: 0.5rem 1rem;
}

.sub-accordion-trigger {
	display: inline-flex;
	align-items: center;
	font-weight: 600;
	font-size: 0.95rem;
	color: #f1f5f9;
}

.sub-accordion-content {
	padding: 0.75rem 0 0.5rem 0;
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
</style>
