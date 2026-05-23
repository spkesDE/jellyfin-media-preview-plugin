/* eslint-disable no-console */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], function () {
            return factory(root);
        });
    } else {
        root.JellyfinMediaPreview = factory(root);
    }
}(typeof window !== 'undefined' ? window : this, function (window) {
    'use strict';

    const config = {
        enabled: true,
        previewSource: 'trickplay',
        trailerAudioEnabled: false,
        trailerVolumePercent: 35,
        hoverDelayMs: 300,
        trickplayWidth: 320,
        restoreOnLeave: true,
        showProgressIndicator: true,
        debug: false,
        hoverMode: 'scrub',
        autoScrubMode: 'step',
        autoScrubPreset: 'balanced',
        autoScrubStartPercent: 0,
        autoScrubIntervalMs: 220,
        autoScrubDurationMs: 4000,
        autoScrubMinDelayMs: 40,
        autoScrubMaxDelayMs: 1000,
        portraitCardPreviewMode: 'contain',
        backdropCardPreviewMode: 'cover',
        previewBackdropMode: 'dim-blur',
        previewBackdropIntensityPercent: 35,
        youTubeCropStrength: 'medium',
        trailerExpandButtonEnabled: true,
        trailerExpandButtonPosition: 'top-right'
    };
    const runtimeConfig = window.JellyfinMediaPreviewPluginConfig || {};
    Object.keys(runtimeConfig).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(config, key) && runtimeConfig[key] !== undefined) {
            config[key] = runtimeConfig[key];
        }
    });

    const STATE_ATTR = 'data-media-preview-bound';
    const STYLE_ID = 'jellyfin-media-preview-style';
    const NAMESPACE = 'JellyfinMediaPreview';
    const PREVIEW_SOURCE_TRICKPLAY = 'trickplay';
    const PREVIEW_SOURCE_TRAILER = 'trailer';
    const PREVIEW_SOURCE_PREFER_TRICKPLAY = 'prefer-trickplay';
    const PREVIEW_SOURCE_PREFER_TRAILER = 'prefer-trailer';
    const HOVER_MODE_SCRUB = 'scrub';
    const HOVER_MODE_AUTO = 'auto';
    const AUTO_SCRUB_MODE_STEP = 'step';
    const AUTO_SCRUB_MODE_SWEEP = 'sweep';
    const AUTO_SCRUB_MODE_PING_PONG = 'ping-pong';
    const AUTO_SCRUB_PRESET_CUSTOM = 'custom';
    const AUTO_SCRUB_PRESET_SNAPPY = 'snappy';
    const AUTO_SCRUB_PRESET_BALANCED = 'balanced';
    const AUTO_SCRUB_PRESET_CINEMATIC = 'cinematic';
    const PREVIEW_MODE_COVER = 'cover';
    const PREVIEW_MODE_CONTAIN = 'contain';
    const PREVIEW_MODE_STRETCH = 'stretch';
    const PREVIEW_BACKDROP_OFF = 'off';
    const PREVIEW_BACKDROP_DIM = 'dim';
    const PREVIEW_BACKDROP_BLUR = 'blur';
    const PREVIEW_BACKDROP_DIM_BLUR = 'dim-blur';
    const YOUTUBE_CROP_OFF = 'off';
    const YOUTUBE_CROP_LIGHT = 'light';
    const YOUTUBE_CROP_MEDIUM = 'medium';
    const YOUTUBE_CROP_STRONG = 'strong';
    const TRAILER_EXPAND_BUTTON_TOP_LEFT = 'top-left';
    const TRAILER_EXPAND_BUTTON_TOP_RIGHT = 'top-right';
    const TRAILER_EXPAND_BUTTON_BOTTOM_LEFT = 'bottom-left';
    const TRAILER_EXPAND_BUTTON_BOTTOM_RIGHT = 'bottom-right';
    const CONFIGURATION_PAGE_NAME = 'MediaPreviewConfigPage';
    const CONFIGURATION_PAGE_HASH = '#/configurationpage?name=' + CONFIGURATION_PAGE_NAME;
    const ADMIN_NAV_LINK_ATTR = 'data-media-preview-admin-link';
    const VALID_PREVIEW_SOURCES = new Set([
        PREVIEW_SOURCE_TRICKPLAY,
        PREVIEW_SOURCE_TRAILER,
        PREVIEW_SOURCE_PREFER_TRICKPLAY,
        PREVIEW_SOURCE_PREFER_TRAILER
    ]);
    const VALID_HOVER_MODES = new Set([HOVER_MODE_SCRUB, HOVER_MODE_AUTO]);
    const VALID_AUTO_SCRUB_MODES = new Set([
        AUTO_SCRUB_MODE_STEP,
        AUTO_SCRUB_MODE_SWEEP,
        AUTO_SCRUB_MODE_PING_PONG
    ]);
    const VALID_AUTO_SCRUB_PRESETS = new Set([
        AUTO_SCRUB_PRESET_CUSTOM,
        AUTO_SCRUB_PRESET_SNAPPY,
        AUTO_SCRUB_PRESET_BALANCED,
        AUTO_SCRUB_PRESET_CINEMATIC
    ]);
    const VALID_PREVIEW_MODES = new Set([PREVIEW_MODE_COVER, PREVIEW_MODE_CONTAIN, PREVIEW_MODE_STRETCH]);
    const VALID_PREVIEW_BACKDROP_MODES = new Set([
        PREVIEW_BACKDROP_OFF,
        PREVIEW_BACKDROP_DIM,
        PREVIEW_BACKDROP_BLUR,
        PREVIEW_BACKDROP_DIM_BLUR
    ]);
    const VALID_YOUTUBE_CROP_STRENGTHS = new Set([
        YOUTUBE_CROP_OFF,
        YOUTUBE_CROP_LIGHT,
        YOUTUBE_CROP_MEDIUM,
        YOUTUBE_CROP_STRONG
    ]);
    const VALID_TRAILER_EXPAND_BUTTON_POSITIONS = new Set([
        TRAILER_EXPAND_BUTTON_TOP_LEFT,
        TRAILER_EXPAND_BUTTON_TOP_RIGHT,
        TRAILER_EXPAND_BUTTON_BOTTOM_LEFT,
        TRAILER_EXPAND_BUTTON_BOTTOM_RIGHT
    ]);
    const SUPPORTED_TYPES = new Set(['Movie', 'Episode', 'Series', 'Video']);
    const DEBUG_LEAVE_HOLD_MS = 30000;
    const EXPANDED_TRAILER_TRANSITION_MS = 240;
    const cardState = new WeakMap();
    const itemInfoCache = new Map();
    const trailerInfoCache = new Map();
    const tilePreloadCache = new Set();
    let observer = null;
    let routeEventsBound = false;
    let delegatedHoverEventsBound = false;
    let scanScheduled = false;
    let adminNavRefreshScheduled = false;
    let historyPatched = false;
    let pageHasUserActivation = false;
    let expandedTrailerSession = null;
    let expandedTrailerDom = null;

    // Logging and config helpers
    function debugLog() {
        if (!config.debug) {
            return;
        }

        const args = Array.prototype.slice.call(arguments);
        args.unshift('[MediaPreview]');
        console.debug.apply(console, args);
    }

    function debugCardSummary(card, label, extra) {
        if (!config.debug || !card) {
            return;
        }

        debugLog(label, {
            itemId: getItemIdFromCard(card),
            type: card.getAttribute('data-type'),
            classes: card.className,
            imageHost: (getImageRenderHost(card) && getImageRenderHost(card).className) || null,
            extra: extra || null
        });
    }

    function clamp(number, min, max) {
        return Math.max(min, Math.min(max, number));
    }

    function getTrickplayFrameIndex(info, percent) {
        if (!info || !info.thumbnailCount) {
            return 0;
        }

        const normalizedPercent = Math.max(0, Math.min(1, Number(percent) || 0));
        return Math.min(
            info.thumbnailCount - 1,
            Math.max(0, Math.round(normalizedPercent * Math.max(0, info.thumbnailCount - 1)))
        );
    }

    function getAdaptiveTrickplayFrameHoldMs(info) {
        const frameCount = Math.max(1, Number(info && info.thumbnailCount) || 0);
        const intervalMs = Math.max(0, Number(info && info.intervalMs) || 0);

        if (frameCount <= 2 || intervalMs >= 15000) {
            return 240;
        }

        if (frameCount <= 6 || intervalMs >= 10000) {
            return 180;
        }

        if (frameCount <= 12 || intervalMs >= 5000) {
            return 130;
        }

        if (frameCount <= 40 || intervalMs >= 2500) {
            return 80;
        }

        return 32;
    }

    function getAutoScrubTimingProfile() {
        const preset = VALID_AUTO_SCRUB_PRESETS.has(config.autoScrubPreset)
            ? config.autoScrubPreset
            : AUTO_SCRUB_PRESET_BALANCED;

        switch (preset) {
        case AUTO_SCRUB_PRESET_SNAPPY:
            return {
                minDelayMs: 24,
                maxDelayMs: 120,
                plannedDurationMs: 1800
            };
        case AUTO_SCRUB_PRESET_CINEMATIC:
            return {
                minDelayMs: 180,
                maxDelayMs: 1400,
                plannedDurationMs: 14000
            };
        case AUTO_SCRUB_PRESET_CUSTOM:
            return {
                minDelayMs: Math.max(16, Number(config.autoScrubMinDelayMs) || 40),
                maxDelayMs: Math.max(Math.max(16, Number(config.autoScrubMinDelayMs) || 40), Number(config.autoScrubMaxDelayMs) || 1000),
                plannedDurationMs: Math.max(500, Number(config.autoScrubDurationMs) || 4000)
            };
        case AUTO_SCRUB_PRESET_BALANCED:
        default:
            return {
                minDelayMs: 60,
                maxDelayMs: 520,
                plannedDurationMs: 6500
            };
        }
    }

    function clampAdaptiveDelay(delayMs) {
        const profile = getAutoScrubTimingProfile();
        const minDelayMs = profile.minDelayMs;
        const maxDelayMs = Math.max(minDelayMs, profile.maxDelayMs);
        const safeDelayMs = Math.max(0, Number(delayMs) || 0);

        if (safeDelayMs > maxDelayMs) {
            return maxDelayMs;
        }

        if (safeDelayMs < minDelayMs) {
            return minDelayMs;
        }

        return safeDelayMs;
    }

    function getEffectiveAutoScrubDurationMs() {
        const profile = getAutoScrubTimingProfile();
        return Math.max(500, profile.plannedDurationMs);
    }

    function getAutoScrubFrameCount(info) {
        return info && info.thumbnailCount
            ? Math.max(2, Number(info.thumbnailCount))
            : 20;
    }

    function getClampedAutoScrubStepDelayMs(info) {
        const frameCount = getAutoScrubFrameCount(info);
        const durationDerivedDelayMs = Math.round(getEffectiveAutoScrubDurationMs() / Math.max(1, frameCount - 1));
        return clampAdaptiveDelay(durationDerivedDelayMs);
    }

    function getEffectiveSmoothAutoScrubDurationMs(info) {
        const frameCount = getAutoScrubFrameCount(info);
        return Math.max(500, getClampedAutoScrubStepDelayMs(info) * Math.max(1, frameCount - 1));
    }

    function getCardLayoutKind(card) {
        if (!card) {
            return 'backdrop';
        }

        if (card.classList.contains('overflowPortraitCard')
            || card.querySelector('.cardPadder-overflowPortrait')
            || card.querySelector('.coveredImage')) {
            return 'portrait';
        }

        return 'backdrop';
    }

    function getPreviewModeForCard(card) {
        return getCardLayoutKind(card) === 'portrait'
            ? config.portraitCardPreviewMode
            : config.backdropCardPreviewMode;
    }

    function getPreviewBackdropMode() {
        return VALID_PREVIEW_BACKDROP_MODES.has(config.previewBackdropMode)
            ? config.previewBackdropMode
            : PREVIEW_BACKDROP_DIM_BLUR;
    }

    function getYouTubeOverscanMultiplier() {
        switch (VALID_YOUTUBE_CROP_STRENGTHS.has(config.youTubeCropStrength) ? config.youTubeCropStrength : YOUTUBE_CROP_MEDIUM) {
        case YOUTUBE_CROP_OFF:
            return 1;
        case YOUTUBE_CROP_LIGHT:
            return 1.1;
        case YOUTUBE_CROP_STRONG:
            return 1.32;
        case YOUTUBE_CROP_MEDIUM:
        default:
            return 1.2;
        }
    }

    function getPreviewBackdropStyles() {
        const mode = getPreviewBackdropMode();
        const intensity = clamp(Number(config.previewBackdropIntensityPercent) || 35, 0, 100) / 100;
        const styles = {
            background: 'transparent',
            backdropFilter: 'none',
            webkitBackdropFilter: 'none'
        };

        if (mode === PREVIEW_BACKDROP_OFF) {
            return styles;
        }

        if (mode === PREVIEW_BACKDROP_DIM || mode === PREVIEW_BACKDROP_DIM_BLUR) {
            const alpha = Math.max(0, Math.min(0.8, intensity * 0.75));
            styles.background = 'rgba(0, 0, 0, ' + alpha.toFixed(3) + ')';
        }

        if (mode === PREVIEW_BACKDROP_BLUR || mode === PREVIEW_BACKDROP_DIM_BLUR) {
            const blurPx = Math.max(1, Math.round(4 + (intensity * 12)));
            styles.backdropFilter = 'blur(' + blurPx + 'px)';
            styles.webkitBackdropFilter = styles.backdropFilter;
        }

        return styles;
    }

    function getEffectivePreviewSource() {
        return VALID_PREVIEW_SOURCES.has(config.previewSource)
            ? config.previewSource
            : PREVIEW_SOURCE_TRICKPLAY;
    }

    function normalizeConfig() {
        if (config.autoScrubMode === 'smooth') {
            config.autoScrubMode = AUTO_SCRUB_MODE_SWEEP;
        } else if (config.autoScrubMode === 'smooth-pingpong') {
            config.autoScrubMode = AUTO_SCRUB_MODE_PING_PONG;
        }

        if (!VALID_PREVIEW_SOURCES.has(config.previewSource)) {
            config.previewSource = PREVIEW_SOURCE_TRICKPLAY;
        }

        if (!VALID_HOVER_MODES.has(config.hoverMode)) {
            config.hoverMode = HOVER_MODE_SCRUB;
        }

        if (!VALID_AUTO_SCRUB_MODES.has(config.autoScrubMode)) {
            config.autoScrubMode = AUTO_SCRUB_MODE_STEP;
        }

        if (!VALID_AUTO_SCRUB_PRESETS.has(config.autoScrubPreset)) {
            config.autoScrubPreset = AUTO_SCRUB_PRESET_BALANCED;
        }

        if (!VALID_PREVIEW_MODES.has(config.portraitCardPreviewMode)) {
            config.portraitCardPreviewMode = PREVIEW_MODE_CONTAIN;
        }

        if (!VALID_PREVIEW_MODES.has(config.backdropCardPreviewMode)) {
            config.backdropCardPreviewMode = PREVIEW_MODE_COVER;
        }

        if (!VALID_PREVIEW_BACKDROP_MODES.has(config.previewBackdropMode)) {
            config.previewBackdropMode = PREVIEW_BACKDROP_DIM_BLUR;
        }

        if (!VALID_YOUTUBE_CROP_STRENGTHS.has(config.youTubeCropStrength)) {
            config.youTubeCropStrength = YOUTUBE_CROP_MEDIUM;
        }

        if (!VALID_TRAILER_EXPAND_BUTTON_POSITIONS.has(config.trailerExpandButtonPosition)) {
            config.trailerExpandButtonPosition = TRAILER_EXPAND_BUTTON_TOP_RIGHT;
        }

        config.hoverDelayMs = Math.max(0, Number(config.hoverDelayMs) || 300);
        config.trickplayWidth = Math.max(1, Number(config.trickplayWidth) || 320);
        config.trailerVolumePercent = clamp(isFinite(Number(config.trailerVolumePercent)) ? Number(config.trailerVolumePercent) : 35, 0, 100);
        config.previewBackdropIntensityPercent = clamp(isFinite(Number(config.previewBackdropIntensityPercent)) ? Number(config.previewBackdropIntensityPercent) : 35, 0, 100);
        config.autoScrubStartPercent = clamp(Number(config.autoScrubStartPercent) || 0, 0, 100);
        config.autoScrubIntervalMs = Math.max(50, Number(config.autoScrubIntervalMs) || 220);
        config.autoScrubDurationMs = Math.max(500, Number(config.autoScrubDurationMs) || 4000);
        config.autoScrubMinDelayMs = Math.max(16, Number(config.autoScrubMinDelayMs) || 40);
        config.autoScrubMaxDelayMs = Math.max(config.autoScrubMinDelayMs, Number(config.autoScrubMaxDelayMs) || 1000);
        config.trailerExpandButtonEnabled = config.trailerExpandButtonEnabled !== false;
    }

    function getGlobalApiClient() {
        return window.ApiClient || window.apiClient || null;
    }

    function getCurrentUserId(apiClient) {
        if (!apiClient) {
            return null;
        }

        if (typeof apiClient.getCurrentUserId === 'function') {
            return apiClient.getCurrentUserId();
        }

        if (typeof apiClient.getCurrentUser === 'function') {
            const currentUser = apiClient.getCurrentUser();
            if (currentUser && currentUser.Id) {
                return currentUser.Id;
            }
        }

        if (apiClient._serverInfo && apiClient._serverInfo.UserId) {
            return apiClient._serverInfo.UserId;
        }

        return null;
    }

    function buildApiUrl(path, query) {
        const apiClient = getGlobalApiClient();
        if (!apiClient) {
            return null;
        }

        const accessToken = apiClient && (
            typeof apiClient.accessToken === 'function'
                ? apiClient.accessToken()
                : apiClient._serverInfo && apiClient._serverInfo.AccessToken
        );

        if (typeof apiClient.getUrl === 'function') {
            const builtUrl = apiClient.getUrl(path, query);
            if (!builtUrl) {
                return builtUrl;
            }

            const finalUrl = new URL(builtUrl, window.location.origin);
            if (accessToken && !finalUrl.searchParams.has('api_key') && !finalUrl.searchParams.has('X-Emby-Token')) {
                finalUrl.searchParams.set('api_key', accessToken);
            }

            return finalUrl.toString();
        }

        const serverAddress = typeof apiClient.serverAddress === 'function'
            ? apiClient.serverAddress()
            : (apiClient._serverAddress || apiClient._serverInfo && apiClient._serverInfo.ManualAddress || '');

        if (!serverAddress) {
            return null;
        }

        const normalized = serverAddress.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
        const url = new URL(normalized, window.location.origin);
        if (query) {
            Object.keys(query).forEach(function (key) {
                const value = query[key];
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.set(key, String(value));
                }
            });
        }

        // Trickplay tile images are loaded by the browser as plain image URLs,
        // so they do not carry Jellyfin's auth headers. Add the access token to
        // the query string for image requests when the URL builder didn't already.
        if (accessToken && !url.searchParams.has('api_key') && !url.searchParams.has('X-Emby-Token')) {
            url.searchParams.set('api_key', accessToken);
        }

        return url.toString();
    }

    function getAuthHeaders(apiClient) {
        const headers = {};
        const accessToken = apiClient && apiClient._serverInfo && apiClient._serverInfo.AccessToken;
        if (accessToken) {
            headers['X-Emby-Token'] = accessToken;
        }

        return headers;
    }

    function requestJson(path, query) {
        const apiClient = getGlobalApiClient();
        const url = buildApiUrl(path, query);
        if (!apiClient || !url) {
            return Promise.reject(new Error('ApiClient is not available.'));
        }

        if (typeof apiClient.ajax === 'function') {
            return Promise.resolve(apiClient.ajax({
                type: 'GET',
                url: url,
                dataType: 'json'
            }));
        }

        return fetch(url, {
            method: 'GET',
            credentials: 'same-origin',
            headers: getAuthHeaders(apiClient)
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('Request failed with status ' + response.status);
            }

            return response.json();
        });
    }

    // Card discovery helpers
    function findCandidateCards(rootNode) {
        const rootElement = rootNode && rootNode.nodeType === 1 ? rootNode : document;
        const candidates = new Set();
        const selectors = ['.card[data-id]'];

        if (rootElement.matches) {
            selectors.forEach(function (selector) {
                if (rootElement.matches(selector)) {
                    candidates.add(normalizeCardElement(rootElement));
                }
            });
        }

        selectors.forEach(function (selector) {
            rootElement.querySelectorAll(selector).forEach(function (element) {
                candidates.add(normalizeCardElement(element));
            });
        });

        return Array.from(candidates).filter(function (card) {
            if (!card || !(card instanceof HTMLElement)) {
                return false;
            }

            return !!getItemIdFromCard(card) && SUPPORTED_TYPES.has(getItemTypeFromCard(card));
        });
    }

    function normalizeCardElement(element) {
        if (!element) {
            return null;
        }

        return element.closest('.card[data-id]') || element;
    }

    function getItemTypeFromCard(card) {
        if (!card) {
            return null;
        }

        return card.getAttribute('data-type')
            || card.dataset && (card.dataset.type || card.dataset.itemtype)
            || null;
    }

    function parseItemIdFromHref(href) {
        if (!href) {
            return null;
        }

        try {
            const url = new URL(href, window.location.origin);
            const fromQuery = url.searchParams.get('id');
            if (fromQuery) {
                return fromQuery;
            }

            const match = url.pathname.match(/\/details(?:\.html)?\/([^/?#]+)/i)
                || url.pathname.match(/\/itemdetails(?:\.html)?\/([^/?#]+)/i)
                || url.hash.match(/[?&]id=([^&]+)/i);

            return match ? match[1] : null;
        } catch (error) {
            const directMatch = href.match(/[?&]id=([^&]+)/i);
            return directMatch ? decodeURIComponent(directMatch[1]) : null;
        }
    }

    function getItemIdFromCard(card) {
        if (!card) {
            return null;
        }

        const directKeys = [
            'id',
            'itemId',
            'itemid',
            'parentid',
            'itemPrimaryImageId'
        ];

        for (let i = 0; i < directKeys.length; i += 1) {
            const key = directKeys[i];
            if (card.dataset && card.dataset[key]) {
                return card.dataset[key];
            }

            const attrValue = card.getAttribute('data-' + key.replace(/[A-Z]/g, function (match) {
                return '-' + match.toLowerCase();
            }));
            if (attrValue) {
                return attrValue;
            }
        }

        const descendants = card.querySelectorAll('[data-id],[data-item-id],[data-itemid],a[href],button[data-id]');
        for (let i = 0; i < descendants.length; i += 1) {
            const element = descendants[i];
            const datasetId = element.dataset && (element.dataset.id || element.dataset.itemId || element.dataset.itemid);
            if (datasetId) {
                return datasetId;
            }

            const href = element.getAttribute('href');
            const parsedHrefId = parseItemIdFromHref(href);
            if (parsedHrefId) {
                return parsedHrefId;
            }
        }

        const ownHrefId = parseItemIdFromHref(card.getAttribute('href'));
        if (ownHrefId) {
            return ownHrefId;
        }

        return null;
    }

    function getCardImageElement(card) {
        if (!card) {
            return null;
        }

        const selectors = [
            '.cardImageContainer',
            '.cardPadder',
            '.cardImage',
            'img',
            '.lazy',
            '.itemImage'
        ];

        for (let i = 0; i < selectors.length; i += 1) {
            const match = card.querySelector(selectors[i]);
            if (match) {
                if (match.classList.contains('cardImageContainer')) {
                    return match;
                }

                if (match.closest('.cardImageContainer')) {
                    return match.closest('.cardImageContainer');
                }

                return match;
            }
        }

        return null;
    }

    function getImageRenderHost(card) {
        const imageElement = getCardImageElement(card);
        if (!imageElement) {
            return null;
        }

        if (imageElement.classList.contains('cardImageContainer') || imageElement.classList.contains('cardPadder')) {
            return imageElement;
        }

        const nearestPadder = imageElement.closest('.cardPadder');
        if (nearestPadder) {
            return nearestPadder;
        }

        return imageElement.parentElement || imageElement;
    }

    function getHoverCardFromEventTarget(target) {
        if (!target || typeof target.closest !== 'function') {
            return null;
        }

        const card = normalizeCardElement(target.closest('.card[data-id]'));
        if (!card || !SUPPORTED_TYPES.has(getItemTypeFromCard(card))) {
            return null;
        }

        const imageHost = getImageRenderHost(card);
        if (!imageHost || !(target === imageHost || imageHost.contains(target))) {
            return null;
        }

        return card;
    }

    // Preview source providers
    function normalizeTrickplayManifest(item) {
        // Jellyfin exposes trickplay as width buckets that each contain one or
        // more manifests keyed by media source id. We normalize that structure
        // into a single preview descriptor for the UI layer.
        if (!item || !item.Trickplay) {
            return null;
        }

        const widthKeys = Object.keys(item.Trickplay).filter(function (key) {
            return !!item.Trickplay[key];
        });

        if (!widthKeys.length) {
            return null;
        }

        const selectedWidthKey = widthKeys.sort(function (left, right) {
            return Math.abs(Number(left) - config.trickplayWidth) - Math.abs(Number(right) - config.trickplayWidth);
        })[0];

        const widthBucket = item.Trickplay[selectedWidthKey];
        const mediaSources = Array.isArray(item.MediaSources) ? item.MediaSources : [];
        const mediaSourceIds = mediaSources.map(function (source) {
            return source && source.Id;
        }).filter(Boolean);
        const manifestKeys = Object.keys(widthBucket || {});
        const selectedManifestKey = mediaSourceIds.find(function (id) {
            return Object.prototype.hasOwnProperty.call(widthBucket, id);
        }) || manifestKeys[0];
        const trickplayInfo = widthBucket && widthBucket[selectedManifestKey];

        if (!trickplayInfo || !trickplayInfo.Width || !trickplayInfo.TileWidth || !trickplayInfo.TileHeight || !trickplayInfo.ThumbnailCount) {
            return null;
        }

        return {
            itemId: item.Id,
            mediaSourceId: mediaSourceIds.indexOf(selectedManifestKey) !== -1 ? selectedManifestKey : (mediaSources[0] && mediaSources[0].Id) || null,
            width: Number(selectedWidthKey) || trickplayInfo.Width,
            manifestKey: selectedManifestKey,
            frameWidth: trickplayInfo.Width,
            frameHeight: trickplayInfo.Height || Math.round(trickplayInfo.Width * 9 / 16),
            tilesPerRow: trickplayInfo.TileWidth,
            tilesPerColumn: trickplayInfo.TileHeight,
            thumbnailCount: trickplayInfo.ThumbnailCount,
            intervalMs: trickplayInfo.Interval || 0,
            totalFramesPerTile: trickplayInfo.TileWidth * trickplayInfo.TileHeight,
            type: item.Type
        };
    }

    function getTrickplayInfo(itemId) {
        if (!itemId) {
            return Promise.resolve(null);
        }

        if (itemInfoCache.has(itemId)) {
            return itemInfoCache.get(itemId);
        }

        const apiClient = getGlobalApiClient();
        const userId = getCurrentUserId(apiClient);
        if (!apiClient || !userId) {
            debugLog('Skipping trickplay fetch because ApiClient or user id is missing.', itemId);
            return Promise.resolve(null);
        }

        const request = requestJson('Users/' + encodeURIComponent(userId) + '/Items/' + encodeURIComponent(itemId), {
            Fields: 'Trickplay,MediaSources'
        }).then(function (item) {
            if (!item || !SUPPORTED_TYPES.has(item.Type)) {
                debugLog('Item is unsupported or missing.', {
                    itemId: itemId,
                    type: item && item.Type
                });
                return null;
            }

            const normalized = normalizeTrickplayManifest(item);
            if (!normalized) {
                debugLog('No usable trickplay manifest found for item.', {
                    itemId: itemId,
                    type: item.Type,
                    trickplayKeys: item.Trickplay ? Object.keys(item.Trickplay) : []
                });
                return null;
            }

            debugLog('Resolved trickplay info.', normalized);
            return normalized;
        }).catch(function (error) {
            debugLog('Failed to load trickplay metadata for item.', itemId, error);
            return null;
        });

        itemInfoCache.set(itemId, request);
        return request;
    }

    function extractItemList(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }

        if (payload && Array.isArray(payload.Items)) {
            return payload.Items;
        }

        return [];
    }

    function getMediaSourceContainer(mediaSource) {
        if (!mediaSource || !mediaSource.Container) {
            return null;
        }

        return String(mediaSource.Container).split(',')[0].trim().toLowerCase() || null;
    }

    function isSupportedVideoContainer(container) {
        return new Set(['mp4', 'm4v', 'webm', 'ogg', 'ogv', 'mov']).has(container);
    }

    function getMediaSourceAspectRatio(mediaSource) {
        const streams = Array.isArray(mediaSource && mediaSource.MediaStreams)
            ? mediaSource.MediaStreams
            : [];
        const videoStream = streams.find(function (stream) {
            return stream && (stream.Type === 'Video' || stream.Type === 1) && stream.Width && stream.Height;
        });

        if (videoStream && videoStream.Width && videoStream.Height) {
            return {
                width: Number(videoStream.Width),
                height: Number(videoStream.Height)
            };
        }

        return {
            width: 16,
            height: 9
        };
    }

    function getTrailerPreviewPixelSize(aspectRatio) {
        const width = Math.max(320, Math.min(960, config.trickplayWidth * 2));
        const safeAspectRatio = aspectRatio && aspectRatio.width && aspectRatio.height
            ? aspectRatio
            : { width: 16, height: 9 };

        return {
            width: width,
            height: Math.max(180, Math.round(width * safeAspectRatio.height / safeAspectRatio.width))
        };
    }

    function buildLocalTrailerStreamUrl(itemId, mediaSource) {
        const container = getMediaSourceContainer(mediaSource);
        if (!container || !isSupportedVideoContainer(container)) {
            return null;
        }

        return buildApiUrl(
            'Videos/' + encodeURIComponent(itemId) + '/stream.' + encodeURIComponent(container),
            {
                Static: 'true',
                mediaSourceId: mediaSource && mediaSource.Id
            }
        );
    }

    function buildLocalTrailerTranscodeUrl(itemId, mediaSource, aspectRatio) {
        const previewSize = getTrailerPreviewPixelSize(aspectRatio);
        return buildApiUrl(
            'Videos/' + encodeURIComponent(itemId) + '/stream.mp4',
            {
                mediaSourceId: mediaSource && mediaSource.Id,
                VideoCodec: 'h264',
                AudioCodec: 'aac',
                Width: previewSize.width,
                Height: previewSize.height
            }
        );
    }

    function extractYouTubeVideoId(url) {
        if (!url) {
            return null;
        }

        try {
            const parsedUrl = new URL(url, window.location.origin);
            const hostname = parsedUrl.hostname.replace(/^www\./i, '').toLowerCase();

            if (hostname === 'youtu.be') {
                return parsedUrl.pathname.replace(/^\/+/, '').split('/')[0] || null;
            }

            if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'music.youtube.com' || hostname === 'youtube-nocookie.com') {
                if (parsedUrl.searchParams.get('v')) {
                    return parsedUrl.searchParams.get('v');
                }

                const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
                const embedIndex = pathParts.indexOf('embed');
                if (embedIndex !== -1 && pathParts[embedIndex + 1]) {
                    return pathParts[embedIndex + 1];
                }
            }
        } catch (error) {
            const directMatch = String(url).match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/i);
            return directMatch ? directMatch[1] : null;
        }

        return null;
    }

    function buildYouTubeEmbedUrl(videoId, muted, options) {
        if (!videoId) {
            return null;
        }

        const resolvedOptions = options || {};
        const controlsEnabled = !!resolvedOptions.controls;
        const startSeconds = Math.max(0, Math.floor(Number(resolvedOptions.startSeconds) || 0));

        return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId)
            + '?autoplay=1'
            + '&mute=' + (muted ? '1' : '0')
            + '&controls=' + (controlsEnabled ? '1' : '0')
            + '&rel=0'
            + '&playsinline=1'
            + '&modestbranding=1'
            + '&showinfo=0'
            + '&iv_load_policy=3'
            + '&disablekb=1'
            + '&fs=0'
            + '&enablejsapi=1'
            + '&origin=' + encodeURIComponent(window.location.origin)
            + (startSeconds > 0 ? '&start=' + encodeURIComponent(startSeconds) : '')
            + '&loop=1'
            + '&playlist=' + encodeURIComponent(videoId);
    }

    function normalizeRemoteTrailerCandidate(remoteTrailer) {
        if (!remoteTrailer || !remoteTrailer.Url) {
            return null;
        }

        const youtubeId = extractYouTubeVideoId(remoteTrailer.Url);
        if (youtubeId) {
            return {
                provider: 'youtube',
                kind: 'iframe',
                title: remoteTrailer.Name || 'Remote Trailer',
                youtubeId: youtubeId,
                aspectRatio: {
                    width: 16,
                    height: 9
                }
            };
        }

        try {
            const parsedUrl = new URL(remoteTrailer.Url, window.location.origin);
            const extension = parsedUrl.pathname.split('.').pop().toLowerCase();
            if (isSupportedVideoContainer(extension)) {
                return {
                    provider: 'remote-video',
                    kind: 'video',
                    title: remoteTrailer.Name || 'Remote Trailer',
                    src: parsedUrl.toString(),
                    aspectRatio: {
                        width: 16,
                        height: 9
                    }
                };
            }
        } catch (error) {
            debugLog('Failed to parse remote trailer URL.', remoteTrailer.Url, error);
        }

        return null;
    }

    function normalizeLocalTrailerCandidate(trailerItem) {
        if (!trailerItem || !trailerItem.Id) {
            return null;
        }

        const mediaSources = Array.isArray(trailerItem.MediaSources) ? trailerItem.MediaSources : [];
        const playableMediaSource = mediaSources.find(function (mediaSource) {
            return !!buildLocalTrailerTranscodeUrl(trailerItem.Id, mediaSource, getMediaSourceAspectRatio(mediaSource));
        });

        if (!playableMediaSource) {
            return null;
        }

        const aspectRatio = getMediaSourceAspectRatio(playableMediaSource);
        const directSrc = buildLocalTrailerStreamUrl(trailerItem.Id, playableMediaSource);
        const transcodeSrc = buildLocalTrailerTranscodeUrl(trailerItem.Id, playableMediaSource, aspectRatio);

        return {
            provider: 'local-trailer',
            kind: 'video',
            title: trailerItem.Name || 'Local Trailer',
            src: directSrc || transcodeSrc,
            fallbackSrc: directSrc && transcodeSrc && directSrc !== transcodeSrc ? transcodeSrc : null,
            aspectRatio: aspectRatio
        };
    }

    function getTrailerInfo(itemId) {
        if (!itemId) {
            return Promise.resolve(null);
        }

        if (trailerInfoCache.has(itemId)) {
            return trailerInfoCache.get(itemId);
        }

        const apiClient = getGlobalApiClient();
        const userId = getCurrentUserId(apiClient);
        if (!apiClient || !userId) {
            debugLog('Skipping trailer fetch because ApiClient or user id is missing.', itemId);
            return Promise.resolve(null);
        }

        const request = requestJson('Users/' + encodeURIComponent(userId) + '/Items/' + encodeURIComponent(itemId), {
            Fields: 'LocalTrailerCount,RemoteTrailers'
        }).then(function (item) {
            if (!item || !SUPPORTED_TYPES.has(item.Type)) {
                return null;
            }

            // Prefer local trailers first because they stay fully inside Jellyfin
            // and behave more consistently than remote providers.
            const localTrailerPromise = Number(item.LocalTrailerCount) > 0
                ? requestJson('Items/' + encodeURIComponent(itemId) + '/LocalTrailers').then(function (payload) {
                    return extractItemList(payload).map(normalizeLocalTrailerCandidate).filter(Boolean);
                }).catch(function (error) {
                    debugLog('Failed to load local trailers.', itemId, error);
                    return [];
                })
                : Promise.resolve([]);

            return localTrailerPromise.then(function (localCandidates) {
                const remoteCandidates = Array.isArray(item.RemoteTrailers)
                    ? item.RemoteTrailers.map(normalizeRemoteTrailerCandidate).filter(Boolean)
                    : [];

                const candidates = localCandidates.concat(remoteCandidates);
                if (!candidates.length) {
                    debugLog('No usable trailer candidates found.', {
                        itemId: itemId,
                        localTrailerCount: item.LocalTrailerCount || 0,
                        remoteTrailerCount: Array.isArray(item.RemoteTrailers) ? item.RemoteTrailers.length : 0
                    });
                    return null;
                }

                const trailerInfo = {
                    itemId: itemId,
                    candidates: candidates
                };
                debugLog('Resolved trailer candidates.', trailerInfo);
                return trailerInfo;
            });
        }).catch(function (error) {
            debugLog('Failed to resolve trailer info for item.', itemId, error);
            return null;
        });

        trailerInfoCache.set(itemId, request);
        return request;
    }

    function getTrickplayPreview(itemId, percent) {
        return getTrickplayInfo(itemId).then(function (info) {
            if (!info) {
                return null;
            }

            const normalizedPercent = Math.max(0, Math.min(1, Number(percent) || 0));
            const frameIndex = getTrickplayFrameIndex(info, normalizedPercent);
            const tileIndex = Math.floor(frameIndex / info.totalFramesPerTile);
            const frameIndexInTile = frameIndex % info.totalFramesPerTile;
            const frameColumn = frameIndexInTile % info.tilesPerRow;
            const frameRow = Math.floor(frameIndexInTile / info.tilesPerRow);
            const tileUrl = buildApiUrl(
                'Videos/' + encodeURIComponent(itemId) + '/Trickplay/' + encodeURIComponent(info.width) + '/' + encodeURIComponent(tileIndex) + '.jpg',
                info.mediaSourceId ? { mediaSourceId: info.mediaSourceId } : undefined
            );

            return {
                source: PREVIEW_SOURCE_TRICKPLAY,
                info: info,
                percent: normalizedPercent,
                frameIndex: frameIndex,
                tileIndex: tileIndex,
                tileUrl: tileUrl,
                frameColumn: frameColumn,
                frameRow: frameRow
            };
        });
    }

    function getTrailerPreview(itemId) {
        return getTrailerInfo(itemId).then(function (info) {
            if (!info || !Array.isArray(info.candidates) || !info.candidates.length) {
                return null;
            }

            const candidate = info.candidates[0];
            return {
                source: PREVIEW_SOURCE_TRAILER,
                trailer: candidate,
                info: {
                    frameWidth: candidate.aspectRatio.width,
                    frameHeight: candidate.aspectRatio.height
                }
            };
        });
    }

    function updateTrailerAudioState(mediaElement) {
        if (!mediaElement || mediaElement.tagName !== 'VIDEO') {
            return;
        }

        const canUseAudio = canPlayTrailerAudio();

        mediaElement.volume = clamp((Number(config.trailerVolumePercent) || 0) / 100, 0, 1);
        mediaElement.muted = !canUseAudio;
        mediaElement.defaultMuted = !canUseAudio;
    }

    function canPlayTrailerAudio() {
        const browserActivation = window.navigator && window.navigator.userActivation && window.navigator.userActivation.hasBeenActive;
        return !!config.trailerAudioEnabled && (pageHasUserActivation || !!browserActivation);
    }

    function getPreviewUrl(itemId, percent) {
        const effectiveSource = getEffectivePreviewSource();

        if (effectiveSource === PREVIEW_SOURCE_TRICKPLAY) {
            return getTrickplayPreview(itemId, percent);
        }

        if (effectiveSource === PREVIEW_SOURCE_TRAILER) {
            return getTrailerPreview(itemId);
        }

        if (effectiveSource === PREVIEW_SOURCE_PREFER_TRICKPLAY) {
            return getTrickplayPreview(itemId, percent).then(function (preview) {
                return preview || getTrailerPreview(itemId);
            });
        }

        if (effectiveSource === PREVIEW_SOURCE_PREFER_TRAILER) {
            return getTrailerPreview(itemId).then(function (preview) {
                return preview || getTrickplayPreview(itemId, percent);
            });
        }

        return Promise.resolve(null);
    }

    // DOM creation and preview rendering
    function ensureInjectedStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.jhs-preview-backdrop{position:absolute;inset:0;z-index:10;pointer-events:none;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;display:none;border-radius:inherit;}',
            '.jhs-preview-layer{position:absolute;inset:0;z-index:20;pointer-events:none;opacity:1;background-repeat:no-repeat;background-position:0 0;background-color:transparent;overflow:hidden;border-radius:inherit;}',
            '.jhs-trailer-layer{position:absolute;inset:0;z-index:30;pointer-events:none;overflow:hidden;border-radius:inherit;background:transparent;display:none;}',
            '.jhs-trailer-actions{position:absolute;z-index:45;display:none;pointer-events:none;}',
            '.jhs-trailer-actions.pos-top-left{top:10px;left:10px;}',
            '.jhs-trailer-actions.pos-top-right{top:10px;right:10px;}',
            '.jhs-trailer-actions.pos-bottom-left{bottom:10px;left:10px;}',
            '.jhs-trailer-actions.pos-bottom-right{bottom:10px;right:10px;}',
            '.jhs-trailer-expand{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:0;border-radius:999px;background:rgba(10,14,20,.76);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.28);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer;pointer-events:auto;transition:transform .18s ease,background .18s ease,opacity .18s ease;}',
            '.jhs-trailer-expand:hover{transform:scale(1.06);background:rgba(22,28,38,.9);}',
            '.jhs-trailer-expand .material-icons{font-size:19px;line-height:1;}',
            '.jhs-trailer-layer.jhs-debug-visible{outline:2px solid rgba(0,255,255,.9);box-shadow:0 0 0 1px rgba(0,0,0,.6) inset;}',
            '.jhs-trailer-media{position:absolute;z-index:1;border:0;pointer-events:none;background:transparent;display:block;visibility:visible;opacity:1;}',
            '.jhs-progress{position:absolute;left:8px;right:8px;bottom:8px;z-index:90;height:3px;border-radius:999px;background:rgba(255,255,255,.18);pointer-events:none;overflow:hidden;}',
            '.jhs-progress-bar{height:100%;width:0;background:rgba(255,255,255,.88);transform-origin:left center;}',
            '.jhs-expanded-trailer-overlay{position:fixed;inset:0;z-index:10000;display:none;opacity:0;pointer-events:none;transition:opacity .24s ease;}',
            '.jhs-expanded-trailer-overlay.is-open{opacity:1;pointer-events:auto;}',
            '.jhs-expanded-trailer-backdrop{position:absolute;inset:0;background:rgba(5,8,14,.72);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);}',
            '.jhs-expanded-trailer-viewport{position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;border-radius:22px;background:#000;box-shadow:0 24px 80px rgba(0,0,0,.45);transition:left .24s ease,top .24s ease,width .24s ease,height .24s ease,border-radius .24s ease;pointer-events:auto;}',
            '.jhs-expanded-trailer-media-host{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:auto;}',
            '.jhs-expanded-trailer-shell{position:absolute;inset:0;pointer-events:none;}',
            '.jhs-expanded-trailer-ui{position:absolute;top:20px;right:20px;left:20px;display:flex;align-items:center;justify-content:flex-end;gap:16px;z-index:2;pointer-events:none;}',
            '.jhs-expanded-trailer-title{display:none;}',
            '.jhs-expanded-trailer-close{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border:0;border-radius:999px;background:rgba(10,14,20,.76);color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.28);cursor:pointer;pointer-events:auto;transition:transform .18s ease,background .18s ease;}',
            '.jhs-expanded-trailer-close:hover{transform:scale(1.06);background:rgba(22,28,38,.92);}',
            '.jhs-expanded-trailer-close .material-icons{font-size:22px;line-height:1;}',
            '.jhs-trailer-media.jhs-interactive{pointer-events:auto;}'
        ].join('');
        document.head.appendChild(style);
    }

    function getOrCreateCardState(card) {
        let state = cardState.get(card);
        if (!state) {
            state = {
                hoverTimer: null,
                leaveHoldTimer: null,
                pointerInside: false,
                previewActive: false,
                previewBackdrop: null,
                previewFrame: null,
                trailerLayer: null,
                trailerActions: null,
                trailerExpandButton: null,
                trailerMedia: null,
                trailerMediaKind: null,
                currentTrailer: null,
                trailerPlaybackStartedAt: 0,
                progress: null,
                progressBar: null,
                lastPreviewKey: null,
                activePreviewSource: null,
                lastMoveAt: 0,
                queuedPercent: null,
                queuedMoveTimer: null,
                queuedMoveFrame: null,
                latestRequestToken: 0,
                rootHost: null,
                autoScrubTimer: null,
                autoScrubPercent: null,
                autoScrubDirection: 1,
                autoScrubAnimationFrame: null,
                autoScrubStartedAt: null,
                currentTrickplayInfo: null,
                lastRequestedTrickplayFrameIndex: null,
                lastRenderedTrickplayFrameIndex: null,
                lastTrickplayRenderAt: 0
            };
            cardState.set(card, state);
        }

        return state;
    }

    function ensurePreviewDom(card, state) {
        const imageHost = getImageRenderHost(card);
        if (!imageHost) {
            return null;
        }

        const positionedHost = imageHost;
        if (window.getComputedStyle(positionedHost).position === 'static') {
            positionedHost.style.position = 'relative';
        }
        if (window.getComputedStyle(positionedHost).overflow !== 'hidden') {
            positionedHost.style.overflow = 'hidden';
        }

        state.rootHost = positionedHost;

        if (!state.previewBackdrop) {
            const previewBackdrop = document.createElement('div');
            previewBackdrop.className = 'jhs-preview-backdrop';
            previewBackdrop.setAttribute('aria-hidden', 'true');
            positionedHost.appendChild(previewBackdrop);
            state.previewBackdrop = previewBackdrop;
        }

        if (!state.previewFrame) {
            const previewFrame = document.createElement('div');
            previewFrame.className = 'jhs-preview-layer';
            previewFrame.setAttribute('aria-hidden', 'true');
            previewFrame.style.display = 'none';
            positionedHost.appendChild(previewFrame);
            state.previewFrame = previewFrame;
        }

        if (!state.trailerLayer) {
            const trailerLayer = document.createElement('div');
            trailerLayer.className = 'jhs-trailer-layer';
            trailerLayer.setAttribute('aria-hidden', 'true');
            positionedHost.appendChild(trailerLayer);
            state.trailerLayer = trailerLayer;
        }

        if (!state.trailerActions) {
            const trailerActions = document.createElement('div');
            trailerActions.className = 'jhs-trailer-actions';
            trailerActions.setAttribute('aria-hidden', 'true');
            trailerActions.style.display = 'none';

            const trailerExpandButton = document.createElement('button');
            trailerExpandButton.className = 'jhs-trailer-expand';
            trailerExpandButton.type = 'button';
            trailerExpandButton.title = 'Expand trailer';
            trailerExpandButton.setAttribute('aria-label', 'Expand trailer');
            trailerExpandButton.innerHTML = '<span class="material-icons" aria-hidden="true">open_in_full</span>';
            trailerExpandButton.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                expandTrailer(card);
            });
            trailerExpandButton.addEventListener('pointerdown', function (event) {
                event.stopPropagation();
            });

            trailerActions.appendChild(trailerExpandButton);
            positionedHost.appendChild(trailerActions);

            state.trailerActions = trailerActions;
            state.trailerExpandButton = trailerExpandButton;
        }

        applyTrailerExpandButtonSettings(state);

        if (!state.progress) {
            const progress = document.createElement('div');
            progress.className = 'jhs-progress';
            progress.setAttribute('aria-hidden', 'true');
            progress.style.display = 'none';

            const progressBar = document.createElement('div');
            progressBar.className = 'jhs-progress-bar';
            progress.appendChild(progressBar);
            positionedHost.appendChild(progress);

            state.progress = progress;
            state.progressBar = progressBar;
        }

        return state;
    }

    function resetPreviewBackdrop(state) {
        if (!state || !state.previewBackdrop) {
            return;
        }

        state.previewBackdrop.style.display = 'none';
        state.previewBackdrop.style.background = 'transparent';
        state.previewBackdrop.style.backdropFilter = 'none';
        state.previewBackdrop.style.webkitBackdropFilter = 'none';
    }

    function setTrailerExpandVisible(state, isVisible) {
        if (!state || !state.trailerActions) {
            return;
        }

        applyTrailerExpandButtonSettings(state);
        state.trailerActions.style.display = isVisible && config.trailerExpandButtonEnabled ? 'block' : 'none';
    }

    function applyTrailerExpandButtonSettings(state) {
        if (!state || !state.trailerActions) {
            return;
        }

        state.trailerActions.classList.remove('pos-top-left', 'pos-top-right', 'pos-bottom-left', 'pos-bottom-right');
        state.trailerActions.classList.add('pos-' + config.trailerExpandButtonPosition);
    }

    function applyPreviewBackdrop(state) {
        if (!state || !state.previewBackdrop) {
            return;
        }

        const backdropStyles = getPreviewBackdropStyles();
        const shouldShow = !(backdropStyles.background === 'transparent' && backdropStyles.backdropFilter === 'none');

        state.previewBackdrop.style.display = shouldShow ? 'block' : 'none';
        state.previewBackdrop.style.background = backdropStyles.background;
        state.previewBackdrop.style.backdropFilter = backdropStyles.backdropFilter;
        state.previewBackdrop.style.webkitBackdropFilter = backdropStyles.webkitBackdropFilter;
    }

    function setTrailerLayerVisible(state, isVisible) {
        if (!state || !state.trailerLayer) {
            return;
        }

        state.trailerLayer.style.display = isVisible ? 'block' : 'none';
        state.trailerLayer.style.visibility = isVisible ? 'visible' : 'hidden';
        state.trailerLayer.style.opacity = isVisible ? '1' : '0';
    }

    function hidePreviewFrame(state) {
        if (!state || !state.previewFrame) {
            return;
        }

        state.previewFrame.style.display = 'none';
        state.previewFrame.style.backgroundImage = '';
    }

    function showProgress(state, percent) {
        if (!state || !state.progress || !state.progressBar) {
            return;
        }

        state.progress.style.display = '';
        state.progressBar.style.width = Math.round((percent || 0) * 100) + '%';
    }

    function hideProgress(state) {
        if (!state || !state.progress) {
            return;
        }

        state.progress.style.display = 'none';
    }

    function ensureExpandedTrailerDom() {
        if (expandedTrailerDom) {
            return expandedTrailerDom;
        }

        const overlay = document.createElement('div');
        overlay.className = 'jhs-expanded-trailer-overlay';
        overlay.setAttribute('aria-hidden', 'true');

        const backdrop = document.createElement('div');
        backdrop.className = 'jhs-expanded-trailer-backdrop';

        const shell = document.createElement('div');
        shell.className = 'jhs-expanded-trailer-shell';

        const viewport = document.createElement('div');
        viewport.className = 'jhs-expanded-trailer-viewport';

        const mediaHost = document.createElement('div');
        mediaHost.className = 'jhs-expanded-trailer-media-host';
        viewport.appendChild(mediaHost);

        const ui = document.createElement('div');
        ui.className = 'jhs-expanded-trailer-ui';

        const title = document.createElement('div');
        title.className = 'jhs-expanded-trailer-title';
        title.textContent = '';

        const closeButton = document.createElement('button');
        closeButton.className = 'jhs-expanded-trailer-close';
        closeButton.type = 'button';
        closeButton.title = 'Close expanded trailer';
        closeButton.setAttribute('aria-label', 'Close expanded trailer');
        closeButton.innerHTML = '<span class="material-icons" aria-hidden="true">close</span>';

        ui.appendChild(title);
        ui.appendChild(closeButton);
        shell.appendChild(viewport);
        shell.appendChild(ui);
        overlay.appendChild(backdrop);
        overlay.appendChild(shell);
        document.body.appendChild(overlay);

        backdrop.addEventListener('click', function () {
            collapseExpandedTrailer();
        });
        viewport.addEventListener('click', function (event) {
            event.stopPropagation();
        });
        mediaHost.addEventListener('click', function (event) {
            event.stopPropagation();
        });
        closeButton.addEventListener('click', function () {
            collapseExpandedTrailer();
        });
        window.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && expandedTrailerSession) {
                collapseExpandedTrailer();
            }
        });
        window.addEventListener('resize', function () {
            if (!expandedTrailerSession) {
                return;
            }

            const viewportRect = getExpandedTrailerViewportRect(expandedTrailerSession);
            applyExpandedViewportRect(viewport, viewportRect);
            syncExpandedTrailerMediaLayout(expandedTrailerSession);
        });

        expandedTrailerDom = {
            overlay: overlay,
            viewport: viewport,
            mediaHost: mediaHost,
            title: title
        };

        return expandedTrailerDom;
    }

    function getExpandedTrailerViewportRect(session) {
        const trailer = session && session.trailer || {};
        const aspectWidth = Math.max(1, trailer.aspectRatio && trailer.aspectRatio.width || 16);
        const aspectHeight = Math.max(1, trailer.aspectRatio && trailer.aspectRatio.height || 9);
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720;
        const safeWidth = Math.max(320, viewportWidth - 80);
        const safeHeight = Math.max(240, viewportHeight - 80);
        const scale = Math.min(safeWidth / aspectWidth, safeHeight / aspectHeight);
        const width = Math.round(aspectWidth * scale);
        const height = Math.round(aspectHeight * scale);

        return {
            left: Math.round((viewportWidth - width) / 2),
            top: Math.round((viewportHeight - height) / 2),
            width: width,
            height: height
        };
    }

    function applyExpandedViewportRect(viewport, rect) {
        if (!viewport || !rect) {
            return;
        }

        viewport.style.left = rect.left + 'px';
        viewport.style.top = rect.top + 'px';
        viewport.style.width = rect.width + 'px';
        viewport.style.height = rect.height + 'px';
    }

    function syncExpandedTrailerMediaLayout(session) {
        if (!session || !expandedTrailerDom) {
            return;
        }

        const trailer = session.trailer || {};
        const previewMode = getPreviewModeForCard(session.card);
        const targetRect = getExpandedTrailerViewportRect(session);
        const mediaElement = session.expandedMedia || (session.state && session.state.trailerMedia);
        if (!mediaElement) {
            return;
        }

        applyMediaLayout(
            expandedTrailerDom.mediaHost,
            mediaElement,
            targetRect,
            previewMode,
            Math.max(1, trailer.aspectRatio && trailer.aspectRatio.width || 16),
            Math.max(1, trailer.aspectRatio && trailer.aspectRatio.height || 9),
            '22px'
        );
    }

    function getApproximateTrailerPlaybackSeconds(state) {
        if (!state || !state.trailerPlaybackStartedAt) {
            return 0;
        }

        return Math.max(0, Math.floor((Date.now() - state.trailerPlaybackStartedAt) / 1000));
    }

    function expandTrailer(card) {
        const state = getOrCreateCardState(card);
        if (!state || !state.trailerMedia || !state.currentTrailer || !state.trailerLayer || state.trailerLayer.style.display === 'none') {
            return;
        }

        if (expandedTrailerSession && expandedTrailerSession.card === card) {
            return;
        }

        collapseExpandedTrailer({ immediate: true });

        const overlayState = ensureExpandedTrailerDom();
        const sourceRect = state.trailerLayer.getBoundingClientRect();
        if (!sourceRect.width || !sourceRect.height) {
            return;
        }

        expandedTrailerSession = {
            card: card,
            state: state,
            trailer: state.currentTrailer,
            expandedMedia: null,
            expandedPlaybackStartedAt: 0,
            collapsedMedia: state.trailerMedia,
            sourceRect: {
                left: sourceRect.left,
                top: sourceRect.top,
                width: sourceRect.width,
                height: sourceRect.height
            }
        };

        state.pointerInside = true;
        overlayState.title.textContent = state.currentTrailer.title || 'Trailer';
        overlayState.overlay.style.display = 'block';
        overlayState.overlay.setAttribute('aria-hidden', 'false');
        applyExpandedViewportRect(overlayState.viewport, expandedTrailerSession.sourceRect);
        setTrailerExpandVisible(state, false);
        state.trailerLayer.style.visibility = 'hidden';

        if (state.trailerMediaKind === 'iframe' && state.currentTrailer && state.currentTrailer.youtubeId) {
            const expandedMedia = document.createElement('iframe');
            const startSeconds = getApproximateTrailerPlaybackSeconds(state);
            expandedMedia.className = 'jhs-trailer-media jhs-interactive';
            expandedMedia.setAttribute('aria-hidden', 'true');
            expandedMedia.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
            expandedMedia.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            expandedMedia.setAttribute('tabindex', '-1');
            expandedMedia.src = buildYouTubeEmbedUrl(state.currentTrailer.youtubeId, !canPlayTrailerAudio(), {
                controls: true,
                startSeconds: startSeconds
            });
            expandedTrailerSession.expandedMedia = expandedMedia;
            expandedTrailerSession.expandedPlaybackStartedAt = Date.now() - (startSeconds * 1000);
            overlayState.mediaHost.appendChild(expandedMedia);
            state.trailerMedia.src = 'about:blank';
        } else {
            overlayState.mediaHost.appendChild(state.trailerMedia);
            state.trailerMedia.classList.add('jhs-interactive');
            if (state.trailerMediaKind === 'video') {
                state.trailerMedia.controls = true;
            }
        }

        window.requestAnimationFrame(function () {
            if (!expandedTrailerSession || expandedTrailerSession.card !== card) {
                return;
            }

            overlayState.overlay.classList.add('is-open');
            const targetRect = getExpandedTrailerViewportRect(expandedTrailerSession);
            applyExpandedViewportRect(overlayState.viewport, targetRect);
            syncExpandedTrailerMediaLayout(expandedTrailerSession);
        });
    }

    function collapseExpandedTrailer(options) {
        if (!expandedTrailerSession || !expandedTrailerDom) {
            return;
        }

        const session = expandedTrailerSession;
        const state = session.state;
        const overlayState = expandedTrailerDom;
        const immediate = !!(options && options.immediate);
        const targetRect = state.trailerLayer ? state.trailerLayer.getBoundingClientRect() : session.sourceRect;

        function finalizeCollapse() {
            expandedTrailerSession = null;
            overlayState.overlay.classList.remove('is-open');
            overlayState.overlay.style.display = 'none';
            overlayState.overlay.setAttribute('aria-hidden', 'true');
            overlayState.title.textContent = '';

            if (state.trailerLayer) {
                if (session.expandedMedia) {
                    if (session.collapsedMedia && session.collapsedMedia !== session.expandedMedia && session.collapsedMedia.parentNode) {
                        session.collapsedMedia.parentNode.removeChild(session.collapsedMedia);
                    }

                    state.trailerMedia = session.expandedMedia;
                    state.trailerMediaKind = 'iframe';
                    state.trailerPlaybackStartedAt = session.expandedPlaybackStartedAt || Date.now();
                    state.trailerMedia.classList.remove('jhs-interactive');
                    state.trailerLayer.appendChild(state.trailerMedia);
                } else if (state.trailerMedia) {
                    if (state.trailerMediaKind === 'video') {
                        state.trailerMedia.controls = false;
                        state.trailerMedia.classList.remove('jhs-interactive');
                    }

                    state.trailerLayer.appendChild(state.trailerMedia);
                }

                state.trailerLayer.style.visibility = 'visible';
            }

            if (state.currentTrailer && state.rootHost && state.trailerLayer && state.trailerMedia) {
                const hostRect = state.rootHost.getBoundingClientRect();
                applyMediaLayout(
                    state.trailerLayer,
                    state.trailerMedia,
                    hostRect,
                    getPreviewModeForCard(session.card),
                    Math.max(1, state.currentTrailer.aspectRatio && state.currentTrailer.aspectRatio.width || 16),
                    Math.max(1, state.currentTrailer.aspectRatio && state.currentTrailer.aspectRatio.height || 9),
                    window.getComputedStyle(state.rootHost).borderRadius
                );
            }

            state.pointerInside = false;
            restoreCard(session.card);
        }

        if (immediate) {
            finalizeCollapse();
            return;
        }

        overlayState.overlay.classList.remove('is-open');
        if (targetRect && targetRect.width && targetRect.height) {
            applyExpandedViewportRect(overlayState.viewport, {
                left: targetRect.left,
                top: targetRect.top,
                width: targetRect.width,
                height: targetRect.height
            });
        }

        window.setTimeout(finalizeCollapse, EXPANDED_TRAILER_TRANSITION_MS);
    }

    function ensureTrailerMediaElement(state, kind) {
        if (!state.trailerLayer) {
            return null;
        }

        if (state.trailerMedia && state.trailerMediaKind === kind) {
            return state.trailerMedia;
        }

        if (state.trailerMedia && state.trailerMedia.parentNode) {
            state.trailerMedia.parentNode.removeChild(state.trailerMedia);
        }

        const mediaElement = document.createElement(kind === 'iframe' ? 'iframe' : 'video');
        mediaElement.className = 'jhs-trailer-media';
        mediaElement.setAttribute('aria-hidden', 'true');

        if (kind === 'iframe') {
            mediaElement.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
            mediaElement.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            mediaElement.setAttribute('tabindex', '-1');
        } else {
            mediaElement.autoplay = true;
            mediaElement.loop = true;
            mediaElement.playsInline = true;
            mediaElement.preload = 'metadata';
            mediaElement.controls = false;
            updateTrailerAudioState(mediaElement);
        }

        state.trailerLayer.appendChild(mediaElement);
        state.trailerMedia = mediaElement;
        state.trailerMediaKind = kind;
        return mediaElement;
    }

    function clearTrailerMedia(state) {
        if (!state) {
            return;
        }

        if (expandedTrailerSession && expandedTrailerSession.state === state) {
            collapseExpandedTrailer({ immediate: true });
        }

        setTrailerLayerVisible(state, false);
        setTrailerExpandVisible(state, false);
        resetPreviewBackdrop(state);
        state.currentTrailer = null;

        if (!state.trailerMedia) {
            return;
        }

        if (state.trailerMediaKind === 'iframe') {
            state.trailerMedia.src = 'about:blank';
            return;
        }

        state.trailerMedia.pause();
        state.trailerMedia.removeAttribute('src');
        state.trailerMedia.load();
    }

    function applyMediaLayout(layer, mediaElement, hostRect, mode, sourceWidth, sourceHeight, rootBorderRadius) {
        let scaleX = hostRect.width / sourceWidth;
        let scaleY = hostRect.height / sourceHeight;
        const isIframe = mediaElement && mediaElement.tagName === 'IFRAME';
        const overscan = isIframe ? getYouTubeOverscanMultiplier() : 1;

        layer.style.left = '0';
        layer.style.top = '0';
        layer.style.width = hostRect.width + 'px';
        layer.style.height = hostRect.height + 'px';
        layer.style.borderRadius = rootBorderRadius;

        if (mode === PREVIEW_MODE_CONTAIN) {
            const containScale = Math.min(scaleX, scaleY);
            const containedWidth = sourceWidth * containScale;
            const containedHeight = sourceHeight * containScale;
            const mediaWidth = containedWidth * overscan;
            const mediaHeight = containedHeight * overscan;

            mediaElement.style.left = ((hostRect.width - mediaWidth) / 2) + 'px';
            mediaElement.style.top = ((hostRect.height - mediaHeight) / 2) + 'px';
            mediaElement.style.width = mediaWidth + 'px';
            mediaElement.style.height = mediaHeight + 'px';
            return;
        }

        if (mode === PREVIEW_MODE_STRETCH) {
            const mediaWidth = hostRect.width * overscan;
            const mediaHeight = hostRect.height * overscan;
            mediaElement.style.left = ((hostRect.width - mediaWidth) / 2) + 'px';
            mediaElement.style.top = ((hostRect.height - mediaHeight) / 2) + 'px';
            mediaElement.style.width = mediaWidth + 'px';
            mediaElement.style.height = mediaHeight + 'px';
            return;
        }

        const coverScale = Math.max(scaleX, scaleY);
        const coverWidth = sourceWidth * coverScale * overscan;
        const coverHeight = sourceHeight * coverScale * overscan;

        mediaElement.style.left = ((hostRect.width - coverWidth) / 2) + 'px';
        mediaElement.style.top = ((hostRect.height - coverHeight) / 2) + 'px';
        mediaElement.style.width = coverWidth + 'px';
        mediaElement.style.height = coverHeight + 'px';
    }

    function preloadTileUrls(preview) {
        if (!preview || !preview.info) {
            return;
        }

        const indexes = [
            preview.tileIndex - 1,
            preview.tileIndex,
            preview.tileIndex + 1
        ].filter(function (index) {
            const maxTileIndex = Math.ceil(preview.info.thumbnailCount / preview.info.totalFramesPerTile) - 1;
            return index >= 0 && index <= maxTileIndex;
        });

        indexes.forEach(function (tileIndex) {
            const preloadUrl = buildApiUrl(
                'Videos/' + encodeURIComponent(preview.info.itemId) + '/Trickplay/' + encodeURIComponent(preview.info.width) + '/' + encodeURIComponent(tileIndex) + '.jpg',
                preview.info.mediaSourceId ? { mediaSourceId: preview.info.mediaSourceId } : undefined
            );

            if (!preloadUrl || tilePreloadCache.has(preloadUrl)) {
                return;
            }

            tilePreloadCache.add(preloadUrl);
            const image = new Image();
            image.src = preloadUrl;
        });
    }

    function applyTrickplayPreview(card, preview, percent) {
        const state = getOrCreateCardState(card);
        if (!ensurePreviewDom(card, state) || !preview || !preview.tileUrl || !preview.info) {
            return;
        }

        const rootHost = state.rootHost;
        if (!rootHost) {
            return;
        }

        const hostRect = rootHost.getBoundingClientRect();
        if (!hostRect.width || !hostRect.height) {
            return;
        }

        const previewMode = PREVIEW_MODE_CONTAIN;
        let scaleX = hostRect.width / preview.info.frameWidth;
        let scaleY = hostRect.height / preview.info.frameHeight;
        let offsetX;
        let offsetY;

        if (previewMode === PREVIEW_MODE_CONTAIN) {
            const scale = Math.min(scaleX, scaleY);
            scaleX = scale;
            scaleY = scale;
        } else if (previewMode === PREVIEW_MODE_STRETCH) {
            scaleX = hostRect.width / preview.info.frameWidth;
            scaleY = hostRect.height / preview.info.frameHeight;
        } else {
            const scale = Math.max(scaleX, scaleY);
            scaleX = scale;
            scaleY = scale;
        }

        const renderedFrameWidth = preview.info.frameWidth * scaleX;
        const renderedFrameHeight = preview.info.frameHeight * scaleY;
        const renderedTileWidth = renderedFrameWidth * preview.info.tilesPerRow;
        const renderedTileHeight = renderedFrameHeight * preview.info.tilesPerColumn;

        if (previewMode === PREVIEW_MODE_CONTAIN) {
            offsetX = -(preview.frameColumn * renderedFrameWidth);
            offsetY = -(preview.frameRow * renderedFrameHeight);
        } else {
            const cropOffsetX = (renderedFrameWidth - hostRect.width) / 2;
            const cropOffsetY = (renderedFrameHeight - hostRect.height) / 2;
            offsetX = -((preview.frameColumn * renderedFrameWidth) + cropOffsetX);
            offsetY = -((preview.frameRow * renderedFrameHeight) + cropOffsetY);
        }

        const previewKey = [
            preview.tileUrl,
            preview.frameColumn,
            preview.frameRow,
            Math.round(renderedFrameWidth),
            Math.round(renderedFrameHeight),
            previewMode
        ].join('|');

        if (state.lastPreviewKey === previewKey) {
            if (state.progressBar) {
                state.progressBar.style.width = Math.round((percent || 0) * 100) + '%';
            }
            return;
        }

        state.lastPreviewKey = previewKey;
        state.previewActive = true;
        state.activePreviewSource = PREVIEW_SOURCE_TRICKPLAY;
        state.currentTrailer = null;
        state.currentTrickplayInfo = preview.info;
        state.lastRenderedTrickplayFrameIndex = preview.frameIndex;
        state.lastRequestedTrickplayFrameIndex = preview.frameIndex;
        state.lastTrickplayRenderAt = Date.now();
        clearTrailerMedia(state);
        state.previewFrame.style.display = '';
        state.previewFrame.style.backgroundImage = 'url("' + preview.tileUrl.replace(/"/g, '\\"') + '")';
        state.previewFrame.style.backgroundSize = renderedTileWidth + 'px ' + renderedTileHeight + 'px';
        state.previewFrame.style.backgroundPosition = offsetX + 'px ' + offsetY + 'px';
        state.previewFrame.style.borderRadius = window.getComputedStyle(rootHost).borderRadius;
        state.previewFrame.style.left = '0';
        state.previewFrame.style.top = '0';
        state.previewFrame.style.width = hostRect.width + 'px';
        state.previewFrame.style.height = hostRect.height + 'px';
        state.previewFrame.classList.remove('jhs-contain');
        state.previewFrame.style.removeProperty('--jhs-fade-size');
        state.previewFrame.style.removeProperty('--jhs-fade-color');
        state.previewFrame.style.filter = 'none';
        resetPreviewBackdrop(state);

        if (previewMode === PREVIEW_MODE_CONTAIN) {
            state.previewFrame.style.left = ((hostRect.width - renderedFrameWidth) / 2) + 'px';
            state.previewFrame.style.top = ((hostRect.height - renderedFrameHeight) / 2) + 'px';
            state.previewFrame.style.width = renderedFrameWidth + 'px';
            state.previewFrame.style.height = renderedFrameHeight + 'px';
            state.previewFrame.style.borderRadius = '0';
            state.previewFrame.classList.add('jhs-contain');
            applyPreviewBackdrop(state);
        }

        if (config.showProgressIndicator) {
            showProgress(state, percent);
        } else {
            hideProgress(state);
        }

        preloadTileUrls(preview);
    }

    function applyTrailerPreview(card, preview) {
        const state = getOrCreateCardState(card);
        if (!ensurePreviewDom(card, state) || !preview || !preview.trailer) {
            return;
        }

        const rootHost = state.rootHost;
        if (!rootHost) {
            return;
        }

        const hostRect = rootHost.getBoundingClientRect();
        if (!hostRect.width || !hostRect.height) {
            return;
        }

        const trailer = preview.trailer;
        const sourceWidth = Math.max(1, trailer.aspectRatio && trailer.aspectRatio.width || 16);
        const sourceHeight = Math.max(1, trailer.aspectRatio && trailer.aspectRatio.height || 9);
        const previewMode = getPreviewModeForCard(card);
        const rootBorderRadius = window.getComputedStyle(rootHost).borderRadius;
        const previewKey = [
            trailer.kind,
            trailer.src || trailer.embedUrl,
            previewMode,
            Math.round(hostRect.width),
            Math.round(hostRect.height)
        ].join('|');

        if (state.lastPreviewKey === previewKey && state.trailerLayer && state.trailerLayer.style.display !== 'none') {
            return;
        }

        state.lastPreviewKey = previewKey;
        state.previewActive = true;
        state.activePreviewSource = PREVIEW_SOURCE_TRAILER;
        hidePreviewFrame(state);
        resetPreviewBackdrop(state);
        applyPreviewBackdrop(state);

        const mediaElement = ensureTrailerMediaElement(state, trailer.kind);
        if (!mediaElement) {
            return;
        }

        state.currentTrailer = trailer;
        applyMediaLayout(state.trailerLayer, mediaElement, hostRect, previewMode, sourceWidth, sourceHeight, rootBorderRadius);
        setTrailerLayerVisible(state, true);
        setTrailerExpandVisible(state, true);
        state.trailerLayer.style.background = 'transparent';
        mediaElement.style.background = 'transparent';
        state.trailerLayer.classList.toggle('jhs-debug-visible', !!config.debug);
        debugLog('Applying trailer preview.', {
            title: trailer.title || null,
            kind: trailer.kind,
            mode: previewMode,
            cropStrength: config.youTubeCropStrength,
            hostWidth: Math.round(hostRect.width),
            hostHeight: Math.round(hostRect.height),
            hostOffsetLeft: 0,
            hostOffsetTop: 0,
            layerWidth: state.trailerLayer.style.width,
            layerHeight: state.trailerLayer.style.height,
            layerLeft: state.trailerLayer.style.left,
            layerTop: state.trailerLayer.style.top
        });

        if (trailer.kind === 'iframe') {
            const iframeUrl = trailer.youtubeId
                ? buildYouTubeEmbedUrl(trailer.youtubeId, !canPlayTrailerAudio(), {
                    controls: false
                })
                : trailer.embedUrl;

            if (mediaElement.src !== iframeUrl) {
                mediaElement.src = iframeUrl;
                state.trailerPlaybackStartedAt = Date.now();
            }
        } else {
            updateTrailerAudioState(mediaElement);

            mediaElement.onerror = function () {
                if (trailer.fallbackSrc && mediaElement.dataset.jhsFallbackApplied !== 'true') {
                    debugLog('Local trailer direct playback failed. Falling back to transcoded MP4.', trailer.title || trailer.src);
                    mediaElement.dataset.jhsFallbackApplied = 'true';
                    mediaElement.src = trailer.fallbackSrc;
                    mediaElement.load();
                    updateTrailerAudioState(mediaElement);
                    const fallbackPromise = mediaElement.play();
                    if (fallbackPromise && typeof fallbackPromise.catch === 'function') {
                        fallbackPromise.catch(function (error) {
                            debugLog('Transcoded trailer autoplay failed.', trailer.title || trailer.fallbackSrc, error);
                        });
                    }
                }
            };

            if (mediaElement.src !== trailer.src) {
                mediaElement.dataset.jhsFallbackApplied = 'false';
                mediaElement.src = trailer.src;
                mediaElement.load();
                state.trailerPlaybackStartedAt = Date.now();
            }

            const playPromise = mediaElement.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(function (error) {
                    debugLog('Trailer autoplay failed.', trailer.title || trailer.src, error);
                });
            }
        }

        hideProgress(state);
    }

    function applyPreview(card, preview, percent) {
        if (!preview) {
            return;
        }

        if (preview.source === PREVIEW_SOURCE_TRAILER) {
            applyTrailerPreview(card, preview);
            return;
        }

        applyTrickplayPreview(card, preview, percent);
    }

    function clearPendingMove(state) {
        if (state && state.queuedMoveTimer) {
            window.clearTimeout(state.queuedMoveTimer);
            state.queuedMoveTimer = null;
        }

        if (state && state.queuedMoveFrame) {
            window.cancelAnimationFrame(state.queuedMoveFrame);
            state.queuedMoveFrame = null;
        }
    }

    function clearLeaveHold(state) {
        if (state && state.leaveHoldTimer) {
            window.clearTimeout(state.leaveHoldTimer);
            state.leaveHoldTimer = null;
        }
    }

    function clearAutoScrub(state) {
        if (state && state.autoScrubTimer) {
            window.clearInterval(state.autoScrubTimer);
            state.autoScrubTimer = null;
        }

        if (state && state.autoScrubAnimationFrame) {
            window.cancelAnimationFrame(state.autoScrubAnimationFrame);
            state.autoScrubAnimationFrame = null;
        }
    }

    // Hover lifecycle and interaction handling
    function restoreCard(card) {
        const state = cardState.get(card);
        if (!state) {
            return;
        }

        if (expandedTrailerSession && expandedTrailerSession.card === card) {
            return;
        }

        if (state.hoverTimer) {
            window.clearTimeout(state.hoverTimer);
            state.hoverTimer = null;
        }

        clearLeaveHold(state);
        clearPendingMove(state);
        clearAutoScrub(state);
        state.previewActive = false;
        state.lastPreviewKey = null;
        state.activePreviewSource = null;
        state.queuedPercent = null;
        state.autoScrubPercent = null;
        state.currentTrickplayInfo = null;
        state.lastRequestedTrickplayFrameIndex = null;
        state.lastRenderedTrickplayFrameIndex = null;
        state.lastTrickplayRenderAt = 0;

        if (config.restoreOnLeave) {
            hidePreviewFrame(state);
        }

        clearTrailerMedia(state);
        resetPreviewBackdrop(state);

        hideProgress(state);
    }

    function getRelativePercent(card, event) {
        const rect = card.getBoundingClientRect();
        if (!rect.width) {
            return 0;
        }

        return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    }

    function runPreviewUpdate(card, percent) {
        const itemId = getItemIdFromCard(card);
        if (!itemId) {
            return;
        }

        const state = getOrCreateCardState(card);
        state.latestRequestToken += 1;
        const requestToken = state.latestRequestToken;

        getPreviewUrl(itemId, percent).then(function (preview) {
            if (!preview) {
                return;
            }

            if (!state.previewActive || requestToken !== state.latestRequestToken) {
                return;
            }

            applyPreview(card, preview, percent);
        }).catch(function (error) {
            debugLog('Preview update failed.', itemId, error);
        });
    }

    function schedulePreviewUpdate(card, percent) {
        const state = getOrCreateCardState(card);
        state.queuedPercent = percent;
        const queueUpdateOnFrame = function () {
            if (state.queuedMoveFrame) {
                return;
            }

            state.queuedMoveFrame = window.requestAnimationFrame(function () {
                state.queuedMoveFrame = null;
                state.queuedMoveTimer = null;
                const nextPercent = state.queuedPercent;
                state.lastMoveAt = Date.now();

                if (state.currentTrickplayInfo) {
                    const nextFrameIndex = getTrickplayFrameIndex(state.currentTrickplayInfo, nextPercent);
                    if (nextFrameIndex === state.lastRequestedTrickplayFrameIndex) {
                        return;
                    }

                    state.lastRequestedTrickplayFrameIndex = nextFrameIndex;
                }

                runPreviewUpdate(card, nextPercent);
            });
        };

        if (!state.currentTrickplayInfo) {
            queueUpdateOnFrame();
            return;
        }

        const nextFrameIndex = getTrickplayFrameIndex(state.currentTrickplayInfo, percent);
        if (nextFrameIndex === state.lastRequestedTrickplayFrameIndex) {
            return;
        }

        const minHoldMs = config.hoverMode === HOVER_MODE_AUTO
            ? clampAdaptiveDelay(getAdaptiveTrickplayFrameHoldMs(state.currentTrickplayInfo))
            : getAdaptiveTrickplayFrameHoldMs(state.currentTrickplayInfo);
        const elapsedSinceLastRender = Date.now() - (state.lastTrickplayRenderAt || 0);
        if (elapsedSinceLastRender >= minHoldMs) {
            queueUpdateOnFrame();
            return;
        }

        if (state.queuedMoveTimer) {
            return;
        }

        state.queuedMoveTimer = window.setTimeout(function () {
            queueUpdateOnFrame();
        }, Math.max(0, minHoldMs - elapsedSinceLastRender));
    }

    function handlePointerEnter(card, event) {
        if (!config.enabled || event.pointerType !== 'mouse' || expandedTrailerSession) {
            return;
        }

        const state = getOrCreateCardState(card);
        if (state.pointerInside) {
            return;
        }

        clearLeaveHold(state);
        state.pointerInside = true;
        restoreCard(card);
        debugCardSummary(card, 'Pointer entered card.');

        state.hoverTimer = window.setTimeout(function () {
            state.hoverTimer = null;
            state.previewActive = true;

            const itemId = getItemIdFromCard(card);
            if (!itemId) {
                return;
            }

            const initialPercent = config.hoverMode === HOVER_MODE_AUTO
                ? clamp((Number(config.autoScrubStartPercent) || 0) / 100, 0, 1)
                : getRelativePercent(card, event);

            getPreviewUrl(itemId, initialPercent).then(function (preview) {
                if (!state.previewActive || !preview) {
                    debugCardSummary(card, 'Hover activation found no preview source.', {
                        itemId: itemId,
                        previewSource: config.previewSource
                    });
                    return;
                }

                applyPreview(card, preview, initialPercent);

                if (preview.source === PREVIEW_SOURCE_TRAILER) {
                    return;
                }

                if (config.hoverMode === HOVER_MODE_AUTO) {
                    startAutoScrub(card);
                    return;
                }
            }).catch(function (error) {
                debugLog('Hover activation failed.', itemId, error);
            });
        }, config.hoverDelayMs);
    }

    function handlePointerMove(card, event) {
        if (expandedTrailerSession || (event.pointerType && event.pointerType !== 'mouse')) {
            return;
        }

        const state = getOrCreateCardState(card);
        if (!state.previewActive) {
            return;
        }

        if (state.activePreviewSource === PREVIEW_SOURCE_TRAILER) {
            return;
        }

        if (config.hoverMode === HOVER_MODE_AUTO) {
            return;
        }

        schedulePreviewUpdate(card, getRelativePercent(card, event));
    }

    function handlePointerLeave(card, event) {
        if (expandedTrailerSession || (event.pointerType && event.pointerType !== 'mouse')) {
            return;
        }

        const state = getOrCreateCardState(card);
        state.pointerInside = false;
        if (config.debug) {
            clearLeaveHold(state);
            state.leaveHoldTimer = window.setTimeout(function () {
                state.leaveHoldTimer = null;
                if (!state.pointerInside) {
                    restoreCard(card);
                }
            }, DEBUG_LEAVE_HOLD_MS);
            return;
        }

        restoreCard(card);
    }

    function resetPointerTracking(card, reason) {
        const state = getOrCreateCardState(card);
        state.pointerInside = false;
        clearLeaveHold(state);
        debugCardSummary(card, 'Reset pointer tracking.', { reason: reason || 'unknown' });
        if (expandedTrailerSession && expandedTrailerSession.card === card) {
            return;
        }
        restoreCard(card);
    }

    function handleMouseEnter(card, event) {
        if (expandedTrailerSession) {
            return;
        }

        const state = getOrCreateCardState(card);
        if (state.pointerInside) {
            return;
        }

        handlePointerEnter(card, {
            pointerType: 'mouse',
            clientX: event.clientX
        });
    }

    function handleMouseMove(card, event) {
        if (expandedTrailerSession) {
            return;
        }

        handlePointerMove(card, {
            pointerType: 'mouse',
            clientX: event.clientX
        });
    }

    function handleMouseLeave(card) {
        if (expandedTrailerSession) {
            return;
        }

        const state = getOrCreateCardState(card);
        if (!state.pointerInside && !state.previewActive && !state.hoverTimer) {
            return;
        }

        handlePointerLeave(card, {
            pointerType: 'mouse'
        });
    }

    function startAutoScrub(card) {
        const state = getOrCreateCardState(card);
        clearAutoScrub(state);
        const itemId = getItemIdFromCard(card);

        if (config.autoScrubMode === AUTO_SCRUB_MODE_SWEEP || config.autoScrubMode === AUTO_SCRUB_MODE_PING_PONG) {
            state.autoScrubPercent = clamp(config.autoScrubStartPercent / 100, 0, 1);
            state.autoScrubDirection = 1;
            state.autoScrubStartedAt = null;
            schedulePreviewUpdate(card, state.autoScrubPercent);

            getTrickplayInfo(itemId).then(function (info) {
                if (!state.previewActive || state.activePreviewSource === PREVIEW_SOURCE_TRAILER) {
                    return;
                }

                const durationMs = getEffectiveSmoothAutoScrubDurationMs(info);
                const startPercent = state.autoScrubPercent;
                const pingPong = config.autoScrubMode === AUTO_SCRUB_MODE_PING_PONG;

                function tick(timestamp) {
                    if (!state.previewActive) {
                        clearAutoScrub(state);
                        return;
                    }

                    if (state.autoScrubStartedAt === null) {
                        state.autoScrubStartedAt = timestamp - (startPercent * durationMs);
                    }

                    const progress = (timestamp - state.autoScrubStartedAt) / durationMs;

                    if (pingPong) {
                        const cycle = progress % 2;
                        state.autoScrubPercent = cycle <= 1 ? cycle : 2 - cycle;
                    } else {
                        state.autoScrubPercent = progress % 1;
                    }

                    schedulePreviewUpdate(card, clamp(state.autoScrubPercent, 0, 1));
                    state.autoScrubAnimationFrame = window.requestAnimationFrame(tick);
                }

                state.autoScrubAnimationFrame = window.requestAnimationFrame(tick);
            }).catch(function () {
                const durationMs = getEffectiveSmoothAutoScrubDurationMs(null);
                const startPercent = state.autoScrubPercent;
                const pingPong = config.autoScrubMode === AUTO_SCRUB_MODE_PING_PONG;

                function tick(timestamp) {
                    if (!state.previewActive) {
                        clearAutoScrub(state);
                        return;
                    }

                    if (state.autoScrubStartedAt === null) {
                        state.autoScrubStartedAt = timestamp - (startPercent * durationMs);
                    }

                    const progress = (timestamp - state.autoScrubStartedAt) / durationMs;

                    if (pingPong) {
                        const cycle = progress % 2;
                        state.autoScrubPercent = cycle <= 1 ? cycle : 2 - cycle;
                    } else {
                        state.autoScrubPercent = progress % 1;
                    }

                    schedulePreviewUpdate(card, clamp(state.autoScrubPercent, 0, 1));
                    state.autoScrubAnimationFrame = window.requestAnimationFrame(tick);
                }

                state.autoScrubAnimationFrame = window.requestAnimationFrame(tick);
            });
            return;
        }

        state.autoScrubPercent = clamp((Number(config.autoScrubStartPercent) || 0) / 100, 0, 1);
        schedulePreviewUpdate(card, state.autoScrubPercent);

        getTrickplayInfo(itemId).then(function (info) {
            if (!state.previewActive || state.activePreviewSource === PREVIEW_SOURCE_TRAILER) {
                return;
            }

            const frameCount = getAutoScrubFrameCount(info);
            const step = 1 / Math.max(1, frameCount - 1);
            const intervalMs = Math.max(16, Number(config.autoScrubIntervalMs) || 220);

            state.autoScrubTimer = window.setInterval(function () {
                if (!state.previewActive) {
                    clearAutoScrub(state);
                    return;
                }

                state.autoScrubPercent += step;
                if (state.autoScrubPercent > 1) {
                    state.autoScrubPercent = 0;
                }

                schedulePreviewUpdate(card, state.autoScrubPercent);
            }, intervalMs);
        }).catch(function () {
            const fallbackFrameCount = getAutoScrubFrameCount(null);
            const step = 1 / Math.max(1, fallbackFrameCount - 1);
            const intervalMs = Math.max(16, Number(config.autoScrubIntervalMs) || 220);

            state.autoScrubTimer = window.setInterval(function () {
                if (!state.previewActive) {
                    clearAutoScrub(state);
                    return;
                }

                state.autoScrubPercent += step;
                if (state.autoScrubPercent > 1) {
                    state.autoScrubPercent = 0;
                }

                schedulePreviewUpdate(card, state.autoScrubPercent);
            }, intervalMs);
        });
    }

    // Binding and SPA lifecycle
    function bindCard(card) {
        if (!card || card.getAttribute(STATE_ATTR) === 'true') {
            return;
        }

        if (!getItemIdFromCard(card)) {
            return;
        }

        if (!SUPPORTED_TYPES.has(getItemTypeFromCard(card))) {
            return;
        }

        const imageHost = getImageRenderHost(card);
        if (!imageHost) {
            debugCardSummary(card, 'Skipping bind because no image host was found.');
            return;
        }

        const state = getOrCreateCardState(card);
        ensurePreviewDom(card, state);

        const bindTarget = imageHost;

        bindTarget.addEventListener('pointerenter', function (event) {
            handlePointerEnter(card, event);
        }, { passive: true });

        bindTarget.addEventListener('pointermove', function (event) {
            handlePointerMove(card, event);
        }, { passive: true });

        bindTarget.addEventListener('pointerleave', function (event) {
            handlePointerLeave(card, event);
        }, { passive: true });

        bindTarget.addEventListener('mouseenter', function (event) {
            handleMouseEnter(card, event);
        }, { passive: true });

        bindTarget.addEventListener('mousemove', function (event) {
            handleMouseMove(card, event);
        }, { passive: true });

        bindTarget.addEventListener('mouseleave', function () {
            handleMouseLeave(card);
        }, { passive: true });

        bindTarget.addEventListener('pointercancel', function () {
            resetPointerTracking(card, 'pointercancel');
        }, { passive: true });

        bindTarget.addEventListener('contextmenu', function () {
            resetPointerTracking(card, 'contextmenu');
        }, { passive: true });

        card.setAttribute(STATE_ATTR, 'true');
        debugCardSummary(card, 'Bound card.');
    }

    function bindCards(rootNode) {
        if (!config.enabled) {
            return;
        }

        findCandidateCards(rootNode).forEach(bindCard);
    }

    function scheduleScan(rootNode) {
        if (scanScheduled) {
            return;
        }

        scanScheduled = true;
        window.requestAnimationFrame(function () {
            scanScheduled = false;
            bindCards(rootNode || document);
        });
    }

    function isPluginConfigurationLink(element) {
        return !!(element
            && element.tagName === 'A'
            && typeof element.getAttribute === 'function'
            && (element.getAttribute('href') || '').indexOf('#/configurationpage?name=') !== -1);
    }

    function getAdminNavigationContainers() {
        const pluginLinks = Array.from(document.querySelectorAll('a[href*="#/configurationpage?name="]'))
            .filter(function (link) {
                return isPluginConfigurationLink(link)
                    && (link.getAttribute('href') || '') !== CONFIGURATION_PAGE_HASH;
            });
        const containers = new Set();

        pluginLinks.forEach(function (link) {
            const parent = link.parentElement;
            if (!parent) {
                return;
            }

            const siblingPluginLinks = Array.from(parent.children).filter(function (child) {
                return isPluginConfigurationLink(child);
            });

            if (siblingPluginLinks.length >= 2) {
                containers.add(parent);
            }
        });

        return Array.from(containers);
    }

    function isMediaPreviewConfigurationRoute() {
        const hash = window.location.hash || '';
        if (!hash) {
            return false;
        }

        try {
            const normalizedHash = hash.charAt(0) === '#' ? hash.slice(1) : hash;
            const routeUrl = new URL(normalizedHash, window.location.origin);
            return routeUrl.pathname === '/configurationpage'
                && routeUrl.searchParams.get('name') === CONFIGURATION_PAGE_NAME;
        } catch (error) {
            return hash.indexOf(CONFIGURATION_PAGE_HASH) !== -1;
        }
    }

    function isPluginsDashboardRoute() {
        const hash = window.location.hash || '';
        return hash === '#/dashboard/plugins' || hash.indexOf('#/dashboard/plugins?') === 0;
    }

    function getSelectedNavClasses(container, currentEntry) {
        const selectedCandidate = Array.from(container.children).find(function (child) {
            if (!(child instanceof HTMLElement) || child === currentEntry) {
                return false;
            }

            return child.classList.contains('Mui-selected')
        });

        if (!selectedCandidate) {
            return [];
        }

        return Array.from(selectedCandidate.classList).filter(function (className) {
            return className === 'Mui-selected'
        });
    }

    function setAdminNavigationEntrySelected(entry, isSelected, selectedClasses) {
        if (!(entry instanceof HTMLElement)) {
            return;
        }

        if (isSelected) {
            entry.setAttribute('aria-current', 'page');
            ['Mui-selected'].concat(selectedClasses || []).forEach(function (className) {
                entry.classList.add(className);
            });
        } else {
            entry.removeAttribute('aria-current');
            ['Mui-selected'].forEach(function (className) {
                entry.classList.remove(className);
            });
        }
    }

    function syncPluginsRootSelection(shouldSelectCustomEntry) {
        const pluginsLinks = Array.from(document.querySelectorAll(
            'a[href="#/plugins"], a[href$="/#/plugins"], a[href="#/dashboard/plugins"], a[href$="/#/dashboard/plugins"]'
        ));

        pluginsLinks.forEach(function (link) {
            if (!(link instanceof HTMLElement) || link.getAttribute(ADMIN_NAV_LINK_ATTR) === 'true') {
                return;
            }

            if (shouldSelectCustomEntry) {
                link.removeAttribute('aria-current');
                ['Mui-selected'].forEach(function (className) {
                    link.classList.remove(className);
                });
            } else if (isPluginsDashboardRoute()) {
                link.setAttribute('aria-current', 'page');
                link.classList.add('Mui-selected');
            }
        });
    }

    function updateAdminNavigationEntry(entry) {
        entry.setAttribute(ADMIN_NAV_LINK_ATTR, 'true');
        entry.setAttribute('href', CONFIGURATION_PAGE_HASH);
        entry.setAttribute('title', 'Media Preview');
        entry.removeAttribute('id');

        const labelSelectors = [
            '.navMenuOptionText',
            '.listItemBodyText',
            '.drawerLinkText',
            '.sectionTitleText',
            '.button-text'
        ];
        let label = null;

        for (let i = 0; i < labelSelectors.length; i += 1) {
            label = entry.querySelector(labelSelectors[i]);
            if (label) {
                break;
            }
        }

        if (!label) {
            const spans = entry.querySelectorAll('span');
            label = spans.length ? spans[spans.length - 1] : null;
        }

        if (label) {
            label.textContent = 'Media Preview';
        } else {
            entry.textContent = 'Media Preview';
        }
    }

    function ensureAdminNavigationLink() {
        const shouldSelectEntry = isMediaPreviewConfigurationRoute();
        const containers = getAdminNavigationContainers();
        if (!containers.length) {
            return;
        }

        containers.forEach(function (container) {
            const selectedClasses = getSelectedNavClasses(container, null);
            syncPluginsRootSelection(shouldSelectEntry);
            const existing = Array.from(container.children).find(function (child) {
                return isPluginConfigurationLink(child)
                    && (child.getAttribute('href') || '') === CONFIGURATION_PAGE_HASH;
            });

            if (existing) {
                updateAdminNavigationEntry(existing);
                setAdminNavigationEntrySelected(existing, shouldSelectEntry, selectedClasses);
                return;
            }

            const template = Array.from(container.children).find(function (child) {
                return isPluginConfigurationLink(child);
            });
            if (!template) {
                return;
            }

            const entry = template.cloneNode(true);
            updateAdminNavigationEntry(entry);
            setAdminNavigationEntrySelected(entry, shouldSelectEntry, selectedClasses);
            container.appendChild(entry);
        });
    }

    function scheduleAdminNavigationRefresh() {
        if (adminNavRefreshScheduled) {
            return;
        }

        adminNavRefreshScheduled = true;
        window.requestAnimationFrame(function () {
            adminNavRefreshScheduled = false;
            ensureAdminNavigationLink();
        });
    }

    function observePageChanges() {
        if (observer || !document.body) {
            return;
        }

        observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1) {
                        scheduleScan(node);
                        scheduleAdminNavigationRefresh();
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function bindRouteEvents() {
        if (routeEventsBound) {
            return;
        }

        const scheduleFullScan = function () {
            scheduleScan(document);
            scheduleAdminNavigationRefresh();
        };

        window.addEventListener('hashchange', scheduleFullScan, { passive: true });
        window.addEventListener('popstate', scheduleFullScan, { passive: true });
        document.addEventListener('viewshow', scheduleFullScan, { passive: true });
        document.addEventListener('pageshow', scheduleFullScan, { passive: true });
        routeEventsBound = true;

        if (!historyPatched && window.history && typeof window.history.pushState === 'function') {
            historyPatched = true;
            ['pushState', 'replaceState'].forEach(function (methodName) {
                const original = window.history[methodName];
                window.history[methodName] = function () {
                    const result = original.apply(this, arguments);
                    window.setTimeout(scheduleFullScan, 0);
                    return result;
                };
            });
        }
    }

    function bindDelegatedHoverEvents() {
        if (delegatedHoverEventsBound) {
            return;
        }

        const onPointerOver = function (event) {
            if (event.pointerType && event.pointerType !== 'mouse') {
                return;
            }

            const card = getHoverCardFromEventTarget(event.target);
            if (!card) {
                return;
            }

            const previousCard = getHoverCardFromEventTarget(event.relatedTarget);
            if (previousCard === card) {
                return;
            }

            handlePointerEnter(card, event);
        };

        const onPointerMove = function (event) {
            if (event.pointerType && event.pointerType !== 'mouse') {
                return;
            }

            const card = getHoverCardFromEventTarget(event.target);
            if (!card) {
                return;
            }

            handlePointerMove(card, event);
        };

        const onPointerOut = function (event) {
            if (event.pointerType && event.pointerType !== 'mouse') {
                return;
            }

            const card = getHoverCardFromEventTarget(event.target);
            if (!card) {
                return;
            }

            const nextCard = getHoverCardFromEventTarget(event.relatedTarget);
            if (nextCard === card) {
                return;
            }

            handlePointerLeave(card, event);
        };

        const onMouseOver = function (event) {
            const card = getHoverCardFromEventTarget(event.target);
            if (!card) {
                return;
            }

            const previousCard = getHoverCardFromEventTarget(event.relatedTarget);
            if (previousCard === card) {
                return;
            }

            handleMouseEnter(card, event);
        };

        const onMouseMove = function (event) {
            const card = getHoverCardFromEventTarget(event.target);
            if (!card) {
                return;
            }

            handleMouseMove(card, event);
        };

        const onMouseOut = function (event) {
            const card = getHoverCardFromEventTarget(event.target);
            if (!card) {
                return;
            }

            const nextCard = getHoverCardFromEventTarget(event.relatedTarget);
            if (nextCard === card) {
                return;
            }

            handleMouseLeave(card);
        };

        document.addEventListener('pointerover', onPointerOver, true);
        document.addEventListener('pointermove', onPointerMove, true);
        document.addEventListener('pointerout', onPointerOut, true);
        document.addEventListener('mouseover', onMouseOver, true);
        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('mouseout', onMouseOut, true);
        delegatedHoverEventsBound = true;
    }

    function bindUserActivationEvents() {
        const markActivated = function () {
            pageHasUserActivation = true;
        };

        window.addEventListener('pointerdown', markActivated, { passive: true, once: true });
        window.addEventListener('keydown', markActivated, { passive: true, once: true });
        window.addEventListener('click', markActivated, { passive: true, once: true });
    }

    function destroy() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }

        document.querySelectorAll('[' + ADMIN_NAV_LINK_ATTR + '="true"]').forEach(function (entry) {
            entry.remove();
        });

        document.querySelectorAll('[' + STATE_ATTR + '="true"]').forEach(function (card) {
            restoreCard(card);
            card.removeAttribute(STATE_ATTR);
        });
    }

    function start() {
        normalizeConfig();

        if (!config.enabled) {
            debugLog('Hover scrub is disabled by config.');
            return;
        }

        if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            debugLog('Skipping media preview because the current device does not advertise precise hover.');
            return;
        }

        ensureInjectedStyles();
        bindUserActivationEvents();
        bindRouteEvents();
        bindDelegatedHoverEvents();
        bindCards(document);
        scheduleAdminNavigationRefresh();
        observePageChanges();
        debugLog('Hover scrub initialized.');
    }

    const api = {
        config: config,
        start: start,
        destroy: destroy,
        rebind: function () {
            scheduleScan(document);
        },
        debugHoldMs: DEBUG_LEAVE_HOLD_MS,
        findCandidateCards: findCandidateCards,
        getItemIdFromCard: getItemIdFromCard,
        getCardImageElement: getCardImageElement,
        getTrickplayInfo: getTrickplayInfo,
        getPreviewUrl: getPreviewUrl,
        applyPreview: applyPreview,
        restoreCard: restoreCard,
        bindCard: bindCard,
        observePageChanges: observePageChanges
    };

    window[NAMESPACE] = api;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }

    return api;
}));
