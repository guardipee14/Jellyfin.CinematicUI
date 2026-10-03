(function () {
    'use strict';

    const cfg = Object.assign({
        enableGlobalTheme: true,
        enableLibraryLayout: true,
        enablePlayerLayout: true,
        enableLoginExperience: true,
        enableHomeHero: true,
        hideMyMediaRow: true,
        hideOtherVideosHomeRows: true,
        hiddenNavigationLibraryNames: '',
        serverTitle: 'JELLYFIN',
        accentColor: '#e5a00d',
        heroRotationSeconds: 12,
        heroCandidateLimit: 36,
        heroMaxItems: 12,
        heroUseLogos: true,
        heroPauseOnHover: true,
        heroShowNavigationArrows: true,
        heroShowDots: true,
        heroOverviewLines: 3,
        heroAvoidRepeatCount: 6,
        heroArtworkZoomPercent: 8,
        heroLibraryNames: 'Anime,Movies,TV Shows',
        heroExcludedTitleKeywords: '',
        heroExcludePlayed: false,
        loginBackgroundMotion: true,
        loginBackgroundMotionSeconds: 65,
        loginBackgroundBlurPx: 3,
        loginOverlayDarknessPercent: 48,
        loginHideHeaderBranding: true
    }, window.CinematicUIConfig || {});

    document.documentElement.style.setProperty('--cinematic-accent', cfg.accentColor || '#e5a00d');
    document.documentElement.style.setProperty('--cinematic-login-motion', `${Math.max(15, cfg.loginBackgroundMotionSeconds || 65)}s`);
    document.documentElement.style.setProperty('--cinematic-hero-zoom', String(1 + Math.max(0, Math.min(20, cfg.heroArtworkZoomPercent || 8)) / 100));
    document.documentElement.style.setProperty('--cinematic-hero-overview-lines', String(Math.max(1, Math.min(5, cfg.heroOverviewLines || 3))));
    document.documentElement.style.setProperty('--cinematic-login-blur', `${Math.max(0, Math.min(12, cfg.loginBackgroundBlurPx ?? 3))}px`);
    document.documentElement.style.setProperty('--cinematic-login-darkness', String(Math.max(0, Math.min(85, cfg.loginOverlayDarknessPercent ?? 48)) / 100));

    let heroTimer = null;
    let heroItems = [];
    let heroIndex = 0;
    let lastHeroUserId = null;
    let heroLoading = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let heroPaused = reducedMotion.matches;
    let heroHovered = false;
    let currentBgObjectUrl = null;
    let currentLogoObjectUrl = null;
    let activeBgLayer = 0;
    let heroRenderToken = 0;

    function log(...args) {
        console.debug('[Cinematic UI]', ...args);
    }

    function warn(...args) {
        console.warn('[Cinematic UI]', ...args);
    }

    function visible(el) {
        if (!el) return false;
        const style = getComputedStyle(el);
        return !el.classList.contains('hide') && style.display !== 'none' && style.visibility !== 'hidden';
    }

    function applyGlobalTheme() {
        document.body.classList.toggle('cinematic-global', !!cfg.enableGlobalTheme);
    }

    function applyLogin() {
        const login = document.querySelector('#loginPage');
        const active = !!(cfg.enableLoginExperience && visible(login));
        document.body.classList.toggle('cinematic-login', active);
        document.body.classList.toggle('cinematic-login-motion', active && !!cfg.loginBackgroundMotion);
        document.body.classList.toggle('cinematic-login-hide-header', active && !!cfg.loginHideHeaderBranding);
        if (!active) return;

        login.dataset.cinematicUi = 'active';
        const visual = login.querySelector('.visualLoginForm');
        if (visual) {
            visual.setAttribute('data-cinematic-title', cfg.serverTitle || 'JELLYFIN');
            visual.querySelector('h1')?.setAttribute('aria-label', "Who's watching?");
        }

        const manual = login.querySelector('.btnManual');
        if (manual && !manual.dataset.cinematicRenamed) {
            const span = manual.querySelector('span');
            if (span) span.textContent = 'Sign in with another account';
            else manual.textContent = 'Sign in with another account';
            manual.dataset.cinematicRenamed = '1';
        }
    }

    function removeHiddenHomeSections(home) {
        if (cfg.hideMyMediaRow) {
            for (const heading of home.querySelectorAll('.sectionTitle, h2, h3')) {
                if ((heading.textContent || '').trim().toLowerCase() === 'my media') {
                    const section = heading.closest('.verticalSection') || heading.parentElement?.parentElement;
                    if (section) section.style.display = 'none';
                }
            }
        }

        if (cfg.hideOtherVideosHomeRows) {
            for (const heading of home.querySelectorAll('.sectionTitle, h2, h3')) {
                if ((heading.textContent || '').toLowerCase().includes('other videos')) {
                    const section = heading.closest('.verticalSection') || heading.parentElement?.parentElement;
                    if (section) section.style.display = 'none';
                }
            }
        }
    }

    function configuredNavigationHiddenNames() {
        return String(cfg.hiddenNavigationLibraryNames || '')
            .split(',')
            .map(value => value.trim().toLowerCase())
            .filter(Boolean);
    }

    function applyNavigationVisibility() {
        const hiddenNames = new Set(configuredNavigationHiddenNames());
        const roots = document.querySelectorAll('.skinHeader, .headerTop, .mainDrawer, header.MuiAppBar-root');
        for (const root of roots) {
            const candidates = root.querySelectorAll('a, button, .emby-tab-button, .navMenuOption, .headerButton');
            for (const element of candidates) {
                const text = String(element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                const shouldHide = !!text && hiddenNames.has(text);

                if (shouldHide) {
                    if (!element.dataset.cinematicNavHidden) {
                        element.dataset.cinematicNavHidden = '1';
                        element.dataset.cinematicPreviousDisplay = element.style.display || '';
                    }
                    element.style.setProperty('display', 'none', 'important');
                } else if (element.dataset.cinematicNavHidden) {
                    const previous = element.dataset.cinematicPreviousDisplay || '';
                    element.style.removeProperty('display');
                    if (previous) element.style.display = previous;
                    delete element.dataset.cinematicNavHidden;
                    delete element.dataset.cinematicPreviousDisplay;
                }
            }
        }
    }

    function applyLibraryLayout() {
        const page = Array.from(document.querySelectorAll('.libraryPage')).find(element => visible(element) && element.querySelector('.itemsContainer'));
        const header = document.querySelector('header.MuiAppBar-root');
        const toolbars = header ? Array.from(header.children).filter(element => element.classList.contains('MuiToolbar-root')) : [];
        const main = page?.closest('main');
        const spacer = main?.previousElementSibling;
        const active = !!(cfg.enableGlobalTheme && cfg.enableLibraryLayout && page && toolbars.length >= 2 && spacer?.tagName === 'DIV' && !spacer.childElementCount && !document.documentElement.classList.contains('layout-tv'));
        const toggle = (element, name, value) => {
            if (element && element.classList.contains(name) !== value) element.classList.toggle(name, value);
        };
        toggle(document.body, 'cinematic-library', active);
        if (!active) {
            document.querySelector('#cinematicLibraryNav')?.remove();
            document.querySelector('.cinematicLibraryHeading')?.remove();
            for (const name of ['cinematicLibraryShell', 'cinematicLibrarySpacer', 'cinematicLibraryTop', 'cinematicLibraryToolbar', 'cinematicLibrarySearch']) {
                document.querySelectorAll('.' + name).forEach(element => toggle(element, name, false));
            }
            document.querySelectorAll('[data-cinematic-library-nav]').forEach(element => element.removeAttribute('data-cinematic-library-nav'));
            return;
        }

        const top = toolbars[0], toolbar = toolbars[1];
        toggle(main, 'cinematicLibraryShell', true);
        toggle(spacer, 'cinematicLibrarySpacer', true);
        toggle(top, 'cinematicLibraryTop', true);
        toggle(toolbar, 'cinematicLibraryToolbar', true);
        toggle(top.querySelector('a[href^="#/search"]'), 'cinematicLibrarySearch', true);
        const hiddenNames = new Set(configuredNavigationHiddenNames());
        const sources = Array.from(top.querySelectorAll('a[href]')).filter(link => link.getAttribute('href').startsWith('#/') && link.textContent.trim());
        const entries = sources.map((source, index) => {
            if (index && !source.hasAttribute('data-cinematic-library-nav')) source.setAttribute('data-cinematic-library-nav', '1');
            return { source, href: source.getAttribute('href'), label: index ? source.textContent.trim() : 'Home' };
        }).filter(entry => !hiddenNames.has(entry.source.textContent.trim().toLowerCase()));
        const parentId = hash => new URLSearchParams(hash.split('?')[1] || '').get('topParentId');
        const currentId = parentId(location.hash);
        const selected = entries.find(entry => currentId ? parentId(entry.href) === currentId : entry.href === location.hash);
        const signature = JSON.stringify(entries.map(entry => [entry.href, entry.label]));
        let nav = document.querySelector('#cinematicLibraryNav');
        if (!nav) {
            nav = document.createElement('nav');
            nav.id = 'cinematicLibraryNav';
            nav.setAttribute('aria-label', 'Library navigation');
            document.body.appendChild(nav);
        }
        if (nav.dataset.signature !== signature) {
            nav.replaceChildren();
            let labelledLibraries = false;
            entries.forEach((entry, index) => {
                if (!labelledLibraries && parentId(entry.href)) {
                    labelledLibraries = true;
                    const section = document.createElement('div');
                    section.className = 'cinematicLibraryNavLabel';
                    section.textContent = 'Libraries';
                    nav.appendChild(section);
                }
                const link = document.createElement('a');
                link.className = 'cinematicLibraryLink';
                link.href = entry.href;
                if (entry.label === 'Home') {
                    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    icon.setAttribute('viewBox', '0 0 24 24');
                    const path = document.createElementNS(icon.namespaceURI, 'path');
                    path.setAttribute('d', 'M3 10 12 3l9 7v11h-6v-7H9v7H3z');
                    icon.appendChild(path);
                    icon.setAttribute('aria-hidden', 'true');
                    link.appendChild(icon);
                } else {
                    const icon = entry.source.querySelector('svg')?.cloneNode(true);
                    if (icon) { icon.setAttribute('aria-hidden', 'true'); link.appendChild(icon); }
                }
                const label = document.createElement('span');
                label.textContent = entry.label;
                link.appendChild(label);
                nav.appendChild(link);
            });
            nav.dataset.signature = signature;
        }
        for (const link of nav.querySelectorAll('a')) {
            const current = link.getAttribute('href') === selected?.href;
            if (current && link.getAttribute('aria-current') !== 'page') link.setAttribute('aria-current', 'page');
            else if (!current && link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
        }
        let heading = toolbar.querySelector('.cinematicLibraryHeading');
        if (!heading) {
            heading = document.createElement('div');
            heading.className = 'cinematicLibraryHeading';
            const title = document.createElement('h1');
            const section = document.createElement('span');
            section.className = 'cinematicLibrarySection';
            section.textContent = 'Library';
            heading.append(title, section);
            toolbar.prepend(heading);
        }
        const title = selected?.label || toolbar.querySelector('button')?.textContent.trim() || 'Library';
        if (heading.firstElementChild.textContent !== title) heading.firstElementChild.textContent = title;
    }

    function applyPlayerLayout() {
        const page = document.querySelector('#videoOsdPage');
        const controls = page?.querySelector('.videoOsdBottom-maincontrols .osdControls');
        const timeline = controls?.querySelector('.osdPositionSlider')?.closest('.sliderContainer')?.parentElement;
        const buttons = controls?.querySelector('.buttons');
        const transport = buttons?.querySelector(':scope > [dir="ltr"]');
        const mainText = controls?.querySelector('.osdMainTextContainer');
        const active = !!(cfg.enableGlobalTheme && cfg.enablePlayerLayout && page && visible(page) &&
            timeline?.parentElement === controls && transport?.querySelector('.btnPause') && mainText &&
            !document.documentElement.classList.contains('layout-tv'));
        const toggle = (element, name, value) => {
            if (element && element.classList.contains(name) !== value) element.classList.toggle(name, value);
        };
        toggle(document.body, 'cinematic-player', active);
        if (!active) {
            document.querySelectorAll('.cinematicPlayerTitle').forEach(element => element.remove());
            for (const name of ['cinematicPlayerControls', 'cinematicPlayerTimeline', 'cinematicPlayerButtons', 'cinematicPlayerTransport', 'cinematicPlayerHeaderTitle']) {
                document.querySelectorAll('.' + name).forEach(element => toggle(element, name, false));
            }
            return;
        }
        toggle(controls, 'cinematicPlayerControls', true);
        toggle(timeline, 'cinematicPlayerTimeline', true);
        toggle(buttons, 'cinematicPlayerButtons', true);
        toggle(transport, 'cinematicPlayerTransport', true);
        // Modern Jellyfin puts the title in its React header; project that visible text
        // into the footer without moving native nodes, binding controls, or reading media APIs.
        const headerTitle = document.querySelector('.videoOsd-appBar > p');
        const text = mainText.querySelector('.osdTitle')?.textContent.trim() ? '' : headerTitle?.textContent.trim();
        let title = mainText.querySelector('.cinematicPlayerTitle');
        if (text) {
            if (!title) {
                title = document.createElement('p');
                title.className = 'cinematicPlayerTitle';
                mainText.prepend(title);
            }
            if (title.textContent !== text) title.textContent = text;
        } else title?.remove();
        toggle(headerTitle, 'cinematicPlayerHeaderTitle', !!text);
    }

    function getCredentials() {
        try {
            const raw = localStorage.getItem('jellyfin_credentials');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const servers = (parsed.Servers || []).filter(s => s && s.AccessToken && s.UserId);
            if (!servers.length) return null;

            const host = location.host.toLowerCase();
            const matching = servers.filter(s => {
                const candidates = [s.ManualAddress, s.LocalAddress].filter(Boolean);
                return candidates.some(addr => {
                    try { return new URL(addr).host.toLowerCase() === host; } catch (_) { return false; }
                });
            });

            const pool = matching.length ? matching : servers;
            pool.sort((a, b) => Number(b.DateLastAccessed || 0) - Number(a.DateLastAccessed || 0));
            const server = pool[0];
            return {
                token: server.AccessToken,
                userId: server.UserId,
                serverId: server.Id || ''
            };
        } catch (error) {
            warn('could not read Jellyfin credentials', error);
            return null;
        }
    }

    function authHeaders(credentials) {
        return {
            'X-Emby-Token': credentials.token,
            'Authorization': `MediaBrowser Token="${credentials.token}"`
        };
    }

    async function apiJson(path, credentials) {
        const response = await fetch(path, {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: authHeaders(credentials)
        });
        if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`);
        return response.json();
    }

    function normalizeItems(payload) {
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.Items)) return payload.Items;
        return [];
    }

    function hasBackdrop(item) {
        return !!(Array.isArray(item?.BackdropImageTags) && item.BackdropImageTags.length);
    }

    function hasLogo(item) {
        return !!(item?.ImageTags?.Logo || (item?.ParentLogoItemId && item?.ParentLogoImageTag));
    }

    function hasUsefulImage(item) {
        return !!(hasBackdrop(item) || (item?.ImageTags && (item.ImageTags.Primary || item.ImageTags.Thumb)));
    }

    function configuredLibraryNames() {
        return String(cfg.heroLibraryNames || '')
            .split(',')
            .map(value => value.trim().toLowerCase())
            .filter(Boolean);
    }

    function configuredHeroExcludedKeywords() {
        return String(cfg.heroExcludedTitleKeywords || '')
            .split(',')
            .map(value => value.trim().toLowerCase())
            .filter(Boolean);
    }

    async function getUserViews(credentials) {
        const params = new URLSearchParams({
            UserId: credentials.userId,
            IncludeExternalContent: 'false',
            IncludeHidden: 'false'
        });
        return normalizeItems(await apiJson(`/Users/${encodeURIComponent(credentials.userId)}/Views?${params.toString()}`, credentials));
    }

    function chooseHeroViews(views) {
        const requested = configuredLibraryNames();
        const obviousExcluded = new Set(['other videos']);
        const usable = views.filter(view => {
            const name = String(view?.Name || '').trim();
            const lower = name.toLowerCase();
            if (!view?.Id || !name) return false;
            if (cfg.hideOtherVideosHomeRows && obviousExcluded.has(lower)) return false;
            return true;
        });

        if (requested.length) {
            const exact = usable.filter(view => requested.includes(String(view.Name || '').trim().toLowerCase()));
            if (exact.length) return exact;
        }

        return usable.filter(view => {
            const collectionType = String(view?.CollectionType || '').toLowerCase();
            return ['movies', 'tvshows', 'mixed'].includes(collectionType);
        });
    }

    function itemFields() {
        return [
            'Overview', 'Genres', 'ProductionYear', 'CommunityRating', 'OfficialRating',
            'BackdropImageTags', 'ImageTags', 'RunTimeTicks', 'DateCreated', 'PrimaryImageAspectRatio',
            'ParentId', 'Path'
        ].join(',');
    }

    async function queryItems(credentials, sortBy, requireBackdrop, parentId) {
        const limit = Math.max(10, Math.min(100, cfg.heroCandidateLimit || 36));
        const params = new URLSearchParams({
            Recursive: 'true',
            IncludeItemTypes: 'Movie,Series',
            Fields: itemFields(),
            Limit: String(limit),
            SortBy: sortBy,
            SortOrder: 'Descending',
            EnableImages: 'true',
            ImageTypeLimit: '1',
            EnableImageTypes: 'Backdrop,Primary,Thumb,Logo',
            EnableUserData: 'true'
        });
        if (parentId) params.set('ParentId', parentId);
        if (requireBackdrop) params.set('ImageTypes', 'Backdrop');

        return normalizeItems(await apiJson(`/Users/${encodeURIComponent(credentials.userId)}/Items?${params.toString()}`, credentials));
    }

    async function queryLatest(credentials, parentId) {
        const limit = Math.max(10, Math.min(100, cfg.heroCandidateLimit || 36));
        const params = new URLSearchParams({
            UserId: credentials.userId,
            IncludeItemTypes: 'Movie,Series',
            Fields: itemFields(),
            Limit: String(limit),
            EnableImages: 'true',
            ImageTypeLimit: '1',
            EnableImageTypes: 'Backdrop,Primary,Thumb,Logo',
            EnableUserData: 'true',
            GroupItems: 'true'
        });
        if (parentId) params.set('ParentId', parentId);
        return normalizeItems(await apiJson(`/Items/Latest?${params.toString()}`, credentials));
    }

    function uniqueById(items) {
        const seen = new Set();
        return items.filter(item => {
            if (!item?.Id || seen.has(item.Id)) return false;
            seen.add(item.Id);
            return true;
        });
    }

    function loadRecentHeroIds() {
        try {
            const value = JSON.parse(localStorage.getItem('cinematic-ui-hero-history') || '[]');
            return Array.isArray(value) ? value.filter(Boolean) : [];
        } catch (_) {
            return [];
        }
    }

    function rememberHeroId(id) {
        if (!id) return;
        const max = Math.max(0, Math.min(30, cfg.heroAvoidRepeatCount || 0));
        if (!max) return;
        const next = [id].concat(loadRecentHeroIds().filter(value => value !== id)).slice(0, max);
        try { localStorage.setItem('cinematic-ui-hero-history', JSON.stringify(next)); } catch (_) { }
    }

    function heroScore(item, recentIds) {
        let score = Math.random() * 12;
        if (hasBackdrop(item)) score += 80;
        if (hasLogo(item)) score += 22;
        if ((item?.Overview || '').trim().length >= 80) score += 14;
        if (item?.ProductionYear) score += 4;
        if (item?.OfficialRating) score += 4;
        if (item?.Genres?.length) score += 4;
        if (recentIds.has(item?.Id)) score -= 1000;
        return score;
    }

    function rankHeroItems(items) {
        const recentIds = new Set(loadRecentHeroIds().slice(0, Math.max(0, cfg.heroAvoidRepeatCount || 0)));
        const excludedKeywords = configuredHeroExcludedKeywords();
        return uniqueById(items)
            .filter(item => item && item.Id && item.Name && hasUsefulImage(item))
            .filter(item => {
                const name = String(item.Name || '').toLowerCase();
                return !excludedKeywords.some(keyword => keyword && name.includes(keyword));
            })
            .filter(item => !(cfg.heroExcludePlayed && item?.UserData?.Played))
            .map(item => ({ item, score: heroScore(item, recentIds) }))
            .sort((a, b) => b.score - a.score)
            .map(entry => entry.item);
    }

    async function fetchHeroItems(credentials) {
        let collected = [];
        let lastError = null;
        let views = [];

        try {
            views = chooseHeroViews(await getUserViews(credentials));
            if (views.length) log('hero source libraries:', views.map(v => v.Name).join(', '));
        } catch (error) {
            warn('could not enumerate hero source libraries; using global fallback', error);
        }

        const perViewAttempts = async (sortBy, requireBackdrop) => {
            for (const view of views) {
                try {
                    const result = await queryItems(credentials, sortBy, requireBackdrop, view.Id);
                    collected = uniqueById(collected.concat(result));
                    log(`hero ${sortBy} query for ${view.Name} returned ${result.length}`);
                } catch (error) {
                    lastError = error;
                    warn(`hero query for ${view.Name} failed`, error);
                }
            }
        };

        if (views.length) {
            // Stay inside the selected libraries. This intentionally avoids a root-level
            // fallback so a private/Other Videos library cannot leak into the hero.
            await perViewAttempts('Random', true);
            if (collected.length < 6) await perViewAttempts('DateCreated', true);
            if (collected.length < 6) await perViewAttempts('DateCreated', false);
            if (collected.length < 3) {
                for (const view of views) {
                    try { collected = uniqueById(collected.concat(await queryLatest(credentials, view.Id))); }
                    catch (error) { lastError = error; }
                }
            }
        } else {
            // Only use a root-level fallback when no eligible user view could be resolved.
            const attempts = [
                () => queryItems(credentials, 'Random', true, null),
                () => queryItems(credentials, 'DateCreated', true, null),
                () => queryItems(credentials, 'DateCreated', false, null),
                () => queryLatest(credentials, null)
            ];

            for (let i = 0; i < attempts.length; i += 1) {
                try {
                    const result = await attempts[i]();
                    collected = uniqueById(collected.concat(result));
                    if (collected.length >= 6) break;
                } catch (error) {
                    lastError = error;
                }
            }
        }

        const ranked = rankHeroItems(collected);
        if (!ranked.length && lastError) throw lastError;
        return ranked.slice(0, Math.max(3, Math.min(30, cfg.heroMaxItems || 12)));
    }

    function heroImageRequest(item) {
        if (hasBackdrop(item)) {
            return `/Items/${encodeURIComponent(item.Id)}/Images/Backdrop/0?maxWidth=2200&quality=92`;
        }
        if (item?.ImageTags?.Thumb) {
            return `/Items/${encodeURIComponent(item.Id)}/Images/Thumb/0?maxWidth=2200&quality=92`;
        }
        if (item?.ImageTags?.Primary) {
            return `/Items/${encodeURIComponent(item.Id)}/Images/Primary?maxWidth=2200&quality=92`;
        }
        return null;
    }

    function logoImageRequest(item) {
        if (item?.ImageTags?.Logo) {
            return `/Items/${encodeURIComponent(item.Id)}/Images/Logo?maxWidth=900&maxHeight=260&quality=95`;
        }
        if (item?.ParentLogoItemId && item?.ParentLogoImageTag) {
            return `/Items/${encodeURIComponent(item.ParentLogoItemId)}/Images/Logo?maxWidth=900&maxHeight=260&quality=95`;
        }
        return null;
    }

    async function objectUrl(path, credentials, cacheMode) {
        const response = await fetch(path, {
            credentials: 'same-origin',
            cache: cacheMode || 'force-cache',
            headers: authHeaders(credentials)
        });
        if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`);
        return URL.createObjectURL(await response.blob());
    }

    function formatRuntime(ticks) {
        if (!ticks) return '';
        const minutes = Math.round(ticks / 600000000);
        if (minutes < 60) return `${minutes}m`;
        const remainder = minutes % 60;
        return remainder ? `${Math.floor(minutes / 60)}h ${remainder}m` : `${Math.floor(minutes / 60)}h`;
    }

    function heroMeta(item) {
        return [
            item.ProductionYear,
            item.OfficialRating,
            item.Genres && item.Genres[0],
            formatRuntime(item.RunTimeTicks)
        ].filter(Boolean).join('  •  ');
    }

    function detailsUrl(item, credentials) {
        const sid = credentials.serverId ? `&serverId=${encodeURIComponent(credentials.serverId)}` : '';
        return `#/details?id=${encodeURIComponent(item.Id)}${sid}`;
    }

    function createHero(home) {
        let hero = document.querySelector('#cinematicHero');
        if (hero) return hero;

        hero = document.createElement('section');
        hero.id = 'cinematicHero';
        hero.dataset.ready = '0';
        hero.tabIndex = 0;
        hero.setAttribute('role', 'region');
        hero.setAttribute('aria-label', 'Featured titles');
        hero.setAttribute('aria-roledescription', 'carousel');
        hero.innerHTML = `
            <button type="button" class="cinematicHeroRotation">Pause rotation</button>
            <div class="cinematicHeroVisual" aria-hidden="true">
                <div class="cinematicHeroBlur"></div>
                <div class="cinematicHeroBg cinematicHeroBgA active"></div>
                <div class="cinematicHeroBg cinematicHeroBgB"></div>
            </div>
            <div class="cinematicHeroContent" role="group" aria-roledescription="slide" aria-labelledby="cinematicHeroTitle">
                <div class="cinematicHeroLogoWrap"><img class="cinematicHeroLogo" alt="" /></div>
                <h1 id="cinematicHeroTitle" class="cinematicHeroTitle"></h1>
                <div class="cinematicHeroMeta"></div>
                <div class="cinematicHeroOverview"></div>
                <div class="cinematicHeroActions">
                    <button type="button" class="cinematicHeroPlay">▶ Play</button>
                    <button type="button" class="cinematicHeroMore">More Info</button>
                </div>
            </div>
            <div class="cinematicHeroNav">
                <button type="button" class="cinematicHeroPrev" aria-label="Previous featured title">‹</button>
                <button type="button" class="cinematicHeroNext" aria-label="Next featured title">›</button>
            </div>
            <div class="cinematicHeroDots" role="group" aria-label="Choose a featured title"></div>`;

        const nav = hero.querySelector('.cinematicHeroNav');
        nav.hidden = !cfg.heroShowNavigationArrows || heroItems.length < 2;

        const rotation = hero.querySelector('.cinematicHeroRotation');
        let pausedBeforePointerFocus = heroPaused;
        rotation.addEventListener('pointerdown', () => { pausedBeforePointerFocus = heroPaused; });
        rotation.onclick = event => {
            // Pointer focus pauses before click. Preserve the action the pointer actually selected.
            heroPaused = !(event.detail > 0 ? pausedBeforePointerFocus : heroPaused);
            const credentials = getCredentials();
            if (credentials) restartHeroTimer(credentials);
        };

        // Keyboard focus latches a pause until the user explicitly resumes rotation.
        hero.addEventListener('focusin', () => {
            heroPaused = true;
            const credentials = getCredentials();
            if (credentials) restartHeroTimer(credentials);
        });
        if (cfg.heroPauseOnHover) {
            hero.addEventListener('mouseenter', () => {
                heroHovered = true;
                const credentials = getCredentials();
                if (credentials) restartHeroTimer(credentials);
            });
            hero.addEventListener('mouseleave', () => {
                heroHovered = false;
                const credentials = getCredentials();
                if (credentials) restartHeroTimer(credentials);
            });
        }

        function moveHero(delta) {
            const credentials = getCredentials();
            if (!credentials || !heroItems.length) return;
            heroIndex = (heroIndex + delta + heroItems.length) % heroItems.length;
            void renderHero(heroItems[heroIndex], credentials).catch(error => warn('hero navigation failed', error));
            restartHeroTimer(credentials);
        }

        hero.querySelector('.cinematicHeroPrev').onclick = () => moveHero(-1);
        hero.querySelector('.cinematicHeroNext').onclick = () => moveHero(1);
        hero.addEventListener('keydown', event => {
            if (event.target?.closest?.('button, a, input, select, textarea')) return;
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                moveHero(-1);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                moveHero(1);
            }
        });

        const target = home.querySelector('.homeSectionsContainer, .sections, .verticalSection') || home.firstElementChild;
        if (target && target.parentElement) target.parentElement.insertBefore(hero, target);
        else home.prepend(hero);
        return hero;
    }

    function updateDots(hero, credentials) {
        const dots = hero.querySelector('.cinematicHeroDots');
        const nav = hero.querySelector('.cinematicHeroNav');
        if (nav) nav.hidden = !cfg.heroShowNavigationArrows || heroItems.length < 2;
        dots.hidden = !cfg.heroShowDots || heroItems.length < 2;
        if (dots.hidden) return;
        // Reconcile only when the item set changes; replacing buttons on every slide loses focus.
        const existing = Array.from(dots.children);
        const sameItems = existing.length === heroItems.length && existing.every((button, index) => button.dataset.itemId === heroItems[index].Id);
        if (!sameItems) dots.replaceChildren();
        heroItems.forEach((item, index) => {
            const dot = sameItems ? existing[index] : document.createElement('button');
            if (!sameItems) {
                dot.className = 'cinematicHeroDot';
                dot.type = 'button';
                dot.dataset.itemId = item.Id;
                dot.title = item?.Name || `Featured item ${index + 1}`;
                dot.setAttribute('aria-label', `Show ${item?.Name || `featured item ${index + 1}`}`);
                dot.onclick = () => {
                    if (index === heroIndex) return;
                    heroIndex = index;
                    void renderHero(heroItems[heroIndex], credentials).catch(error => warn('hero render failed', error));
                    restartHeroTimer(credentials);
                };
                dots.appendChild(dot);
            }
            const selected = index === heroIndex;
            dot.classList.toggle('active', selected);
            dot.setAttribute('aria-current', String(selected));
            dot.setAttribute('aria-disabled', String(selected));
        });
    }

    async function renderHero(item, credentials) {
        if (!item) return;
        const renderToken = ++heroRenderToken;
        const hero = document.querySelector('#cinematicHero');
        if (!hero) return;

        const backgroundRequest = heroImageRequest(item);
        if (!backgroundRequest) throw new Error('No usable hero artwork');
        const backgroundUrl = await objectUrl(backgroundRequest, credentials, 'force-cache');
        if (renderToken !== heroRenderToken) {
            URL.revokeObjectURL(backgroundUrl);
            return;
        }

        const bgLayers = [hero.querySelector('.cinematicHeroBgA'), hero.querySelector('.cinematicHeroBgB')];
        const oldLayer = bgLayers[activeBgLayer];
        const nextLayerIndex = activeBgLayer === 0 ? 1 : 0;
        const nextLayer = bgLayers[nextLayerIndex];
        const blur = hero.querySelector('.cinematicHeroBlur');
        const previousBgUrl = currentBgObjectUrl;

        nextLayer.style.backgroundImage = `url("${backgroundUrl}")`;
        blur.style.backgroundImage = `url("${backgroundUrl}")`;

        const title = hero.querySelector('.cinematicHeroTitle');
        const logoWrap = hero.querySelector('.cinematicHeroLogoWrap');
        const logo = hero.querySelector('.cinematicHeroLogo');
        title.textContent = item.Name || '';
        hero.querySelector('.cinematicHeroMeta').textContent = heroMeta(item);
        hero.querySelector('.cinematicHeroOverview').textContent = item.Overview || '';
        hero.classList.remove('has-logo');
        logoWrap.hidden = true;
        logo.removeAttribute('src');

        if (currentLogoObjectUrl) {
            URL.revokeObjectURL(currentLogoObjectUrl);
            currentLogoObjectUrl = null;
        }

        if (cfg.heroUseLogos) {
            const logoRequest = logoImageRequest(item);
            if (logoRequest) {
                try {
                    const logoUrl = await objectUrl(logoRequest, credentials, 'force-cache');
                    if (renderToken !== heroRenderToken) {
                        URL.revokeObjectURL(logoUrl);
                        return;
                    }
                    currentLogoObjectUrl = logoUrl;
                    logo.src = logoUrl;
                    logo.alt = item.Name || '';
                    logoWrap.hidden = false;
                    hero.classList.add('has-logo');
                } catch (error) {
                    log('logo unavailable for hero item', item.Name, error);
                }
            }
        }

        const open = () => { location.hash = detailsUrl(item, credentials); };
        hero.querySelector('.cinematicHeroMore').onclick = open;
        hero.querySelector('.cinematicHeroPlay').onclick = function () {
            sessionStorage.setItem('cinematic-ui-autoplay-id', item.Id);
            open();
        };

        updateDots(hero, credentials);
        rememberHeroId(item.Id);

        requestAnimationFrame(() => {
            if (renderToken !== heroRenderToken) {
                URL.revokeObjectURL(backgroundUrl);
                return;
            }
            hero.dataset.ready = '1';
            nextLayer.classList.add('active');
            oldLayer.classList.remove('active');
            activeBgLayer = nextLayerIndex;
            currentBgObjectUrl = backgroundUrl;

            const inactiveBackground = oldLayer.style.backgroundImage;
            setTimeout(() => {
                // Rapid navigation can reuse this layer before its earlier fade finishes.
                if (!oldLayer.classList.contains('active') && oldLayer.style.backgroundImage === inactiveBackground) {
                    oldLayer.style.backgroundImage = 'none';
                }
                if (previousBgUrl && previousBgUrl !== currentBgObjectUrl) URL.revokeObjectURL(previousBgUrl);
            }, 950);
        });
    }

    function restartHeroTimer(credentials) {
        if (heroTimer) clearInterval(heroTimer);
        heroTimer = null;
        const rotation = document.querySelector('#cinematicHero .cinematicHeroRotation');
        if (rotation) {
            const label = heroPaused ? 'Resume rotation' : 'Pause rotation';
            if (rotation.textContent !== label) rotation.textContent = label;
            rotation.hidden = heroItems.length < 2;
        }
        if (heroItems.length < 2 || heroPaused || heroHovered || document.hidden || !document.body.classList.contains('cinematic-home')) return;
        heroTimer = setInterval(() => {
            if (heroPaused || heroHovered) return;
            heroIndex = (heroIndex + 1) % heroItems.length;
            void renderHero(heroItems[heroIndex], credentials).catch(error => warn('hero rotation failed', error));
        }, Math.max(5, cfg.heroRotationSeconds || 12) * 1000);
    }

    async function ensureHero(home) {
        if (!cfg.enableHomeHero) {
            document.querySelector('#cinematicHero')?.remove();
            return;
        }

        const credentials = getCredentials();
        if (!credentials || heroLoading) return;

        if (credentials.userId === lastHeroUserId && heroItems.length) {
            if (!document.querySelector('#cinematicHero')) {
                createHero(home);
                await renderHero(heroItems[heroIndex] || heroItems[0], credentials);
            }
            if (!heroTimer) restartHeroTimer(credentials);
            return;
        }

        heroLoading = true;
        try {
            const items = await fetchHeroItems(credentials);
            if (!items.length) {
                document.querySelector('#cinematicHero')?.remove();
                warn('no usable movie/series items found for the hero');
                return;
            }

            heroItems = items;
            heroIndex = 0;
            lastHeroUserId = credentials.userId;
            createHero(home);
            await renderHero(heroItems[0], credentials);
            restartHeroTimer(credentials);
            log(`hero ready with ${heroItems.length} items`);
        } catch (error) {
            document.querySelector('#cinematicHero')?.remove();
            warn('hero load failed; keeping the normal Jellyfin home instead', error);
        } finally {
            heroLoading = false;
        }
    }

    function maybeAutoplayDetails() {
        const requested = sessionStorage.getItem('cinematic-ui-autoplay-id');
        if (!requested || !location.hash.includes(`id=${requested}`)) return;
        const play = document.querySelector('#itemDetailPage:not(.hide) .btnPlay, #itemDetailPage:not(.hide) button[title="Play"], #itemDetailPage:not(.hide) button[aria-label="Play"]');
        if (play) {
            sessionStorage.removeItem('cinematic-ui-autoplay-id');
            setTimeout(() => play.click(), 150);
        }
    }

    function applyHome() {
        const home = document.querySelector('#homeTab');
        const active = !!(home && visible(home));
        document.body.classList.toggle('cinematic-home', active);
        if (!active) {
            if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
            heroHovered = false;
            return;
        }

        home.dataset.cinematicUi = 'active';
        removeHiddenHomeSections(home);
        void ensureHero(home);
    }

    function applyAll() {
        try { applyGlobalTheme(); } catch (error) { warn('global theme apply failed', error); }
        try { applyNavigationVisibility(); } catch (error) { warn('navigation apply failed', error); }
        try { applyLogin(); } catch (error) { warn('login apply failed', error); }
        try { applyLibraryLayout(); } catch (error) { warn('library layout apply failed', error); }
        try { applyPlayerLayout(); } catch (error) { warn('player layout apply failed', error); }
        try { applyHome(); } catch (error) { warn('home apply failed', error); }
        try { maybeAutoplayDetails(); } catch (error) { warn('autoplay failed', error); }
    }

    let queued = false;
    function schedule() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            applyAll();
        });
    }

    window.addEventListener('hashchange', schedule);
    window.addEventListener('popstate', schedule);
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) heroPaused = true;
        const credentials = getCredentials();
        if (credentials) restartHeroTimer(credentials);
    });
    document.addEventListener('viewshow', schedule, true);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
            return;
        }
        const credentials = getCredentials();
        if (credentials) restartHeroTimer(credentials);
        schedule();
    });
    new MutationObserver(schedule).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
    setInterval(schedule, 2500);
    schedule();
})();
