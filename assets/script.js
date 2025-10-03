document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE & CACHE ---
    let currentTeam = [];
    const MAX_TEAM_SIZE = 6;
    const SHINY_CHANCE = 1 / 4096;
    const apiCache = new Map();
    const statShortNames = { 'hp': 'HP', 'attack': 'ATK', 'defense': 'DEF', 'special-attack': 'SpA', 'special-defense': 'SpD', 'speed': 'SPD' };
    let wtpScore = 0;
    let allPokemonNames = [];
    let allHoldableItems = []; // This will be populated from precache
    let wtpHighScore = parseInt(localStorage.getItem('wtpHighScore')) || 0;
    let allMoves = [];
    let allNatures = [];

    // --- DOM ELEMENT SELECTORS ---
    const dom = {
        appTabs: document.querySelectorAll('.app-tab'),
        loadingOverlay: document.getElementById('loading-overlay'),
        sidebarMain: document.getElementById('sidebar-main'),
        sidebarOverlay: document.getElementById('sidebar-overlay'),
        closeSidebarBtns: document.querySelectorAll('.close-sidebar-btn'),
        notificationContainer: document.getElementById('notification-container'),
        confirmationModal: document.getElementById('confirmation-modal'),
        confirmationMessage: document.getElementById('confirmation-message'),
        confirmYesBtn: document.getElementById('confirm-yes-btn'),
        confirmNoBtn: document.getElementById('confirm-no-btn'),
        inputModal: document.getElementById('input-modal'),
        inputModalMessage: document.getElementById('input-modal-message'),
        inputModalInput: document.getElementById('input-modal-input'),
        inputModalOkBtn: document.getElementById('input-modal-ok-btn'),
        inputModalCancelBtn: document.getElementById('input-modal-cancel-btn'),
        assignModal: document.getElementById('assign-modal'),
        assignModalTitle: document.getElementById('assign-modal-title'),
        closeAssignModalBtn: document.getElementById('close-assign-modal-btn'),
        teamSelectionList: document.getElementById('team-selection-list'),
        typeCoverageModal: document.getElementById('type-coverage-modal'),
        closeCoverageModalBtn: document.getElementById('close-coverage-modal-btn'),
        coverageOutput: document.getElementById('coverage-output'),
        teamExportModal: document.getElementById('team-export-modal'),
        closeExportModalBtn: document.getElementById('close-export-modal-btn'),
        exportTextarea: document.getElementById('export-textarea'),
        copyExportBtn: document.getElementById('copy-export-btn'),
        moveDetailsModal: document.getElementById('move-details-modal'),
        moveModalName: document.getElementById('move-modal-name'),
        moveModalContent: document.getElementById('move-modal-content'),
        closeMoveModalBtn: document.getElementById('close-move-modal-btn'),
        manualMoveModal: document.getElementById('manual-move-modal'),
        manualMoveModalTitle: document.getElementById('manual-move-modal-title'),
        manualMoveModalContent: document.getElementById('manual-move-modal-content'),
        closeManualMoveModalBtn: document.getElementById('close-manual-move-modal-btn'),
        manualAbilityModal: document.getElementById('manual-ability-modal'),
        manualAbilityModalTitle: document.getElementById('manual-ability-modal-title'),
        manualAbilityModalContent: document.getElementById('manual-ability-modal-content'),
        closeManualAbilityModalBtn: document.getElementById('close-manual-ability-modal-btn'),
        manualItemModal: document.getElementById('manual-item-modal'),
        manualItemModalTitle: document.getElementById('manual-item-modal-title'),
        manualItemModalContent: document.getElementById('manual-item-modal-content'),
        closeManualItemModalBtn: document.getElementById('close-manual-item-modal-btn'),
        teraTypeModal: document.getElementById('tera-type-modal'),
        teraTypeModalTitle: document.getElementById('tera-type-modal-title'),
        natureModal: document.getElementById('nature-modal'),
        natureModalTitle: document.getElementById('nature-modal-title'),
        natureModalContent: document.getElementById('nature-modal-content'),
        closeNatureModalBtn: document.getElementById('close-nature-modal-btn'),
        teraTypeModalContent: document.getElementById('tera-type-modal-content'),
        closeTeraTypeModalBtn: document.getElementById('close-tera-type-modal-btn'),
        teamImportModal: document.getElementById('team-import-modal'),
        closeImportModalBtn: document.getElementById('close-import-modal-btn'),
        importTextarea: document.getElementById('import-textarea'),
        importTeamBtn: document.getElementById('import-team-btn'),

        // Generator
        generatorForm: document.getElementById('generatorForm'),
        resultOutput: document.getElementById('result-output'),
        initialState: document.getElementById('initial-state'),
        colorFilterSelect: document.getElementById('color-filter'),

        // Team Builder
        teamBuilderOutput: document.getElementById('team-builder-output'),
        clearTeamBtn: document.getElementById('clearTeamBtn'),
        teamNameInput: document.getElementById('teamNameInput'),
        saveTeamBtn: document.getElementById('saveTeamBtn'),
        savedTeamsList: document.getElementById('saved-teams-list'),
        savedTeamsSearch: document.getElementById('saved-teams-search'),
        analyzeTeamBtn: document.getElementById('analyze-team-btn'),
        randomTeamBtn: document.getElementById('random-team-btn'),
        exportTeamBtn: document.getElementById('export-team-btn'),
        showImportBtn: document.getElementById('show-import-btn'),
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        themeIconLight: document.getElementById('theme-icon-light'),
        themeIconDark: document.getElementById('theme-icon-dark'),
        startTourBtn: document.getElementById('start-tour-btn'),

        // Pokédex
        pokedexForm: document.getElementById('pokedexForm'),
        pokedexSearch: document.getElementById('pokedexSearch'),
        pokedexView: document.getElementById('pokedex-view'),
        pokedexCardContainer: document.getElementById('pokedex-card-container'),
        evolutionChainContainer: document.getElementById('evolution-chain-container'),

        // Other Generators
        abilityRerollerContent: document.getElementById('ability-reroller-content'),
        rerollAbilityBtn: document.getElementById('reroll-ability-btn'),
        abilityResultOutput: document.getElementById('ability-result-output'),
        abilityCountInput: document.getElementById('ability-count'),
        itemGeneratorForm: document.getElementById('itemGeneratorForm'),
        moveGeneratorForm: document.getElementById('moveGeneratorForm'),
        moveTypeFilter: document.getElementById('move-type-filter'),
        moveCategoryFilter: document.getElementById('move-category-filter'),
        natureBoostFilter: document.getElementById('nature-boost-filter'),
        natureLowerFilter: document.getElementById('nature-lower-filter'),
        natureGeneratorForm: document.getElementById('natureGeneratorForm'),

        // Who's That Pokémon?
        wtpStartGameBtn: document.getElementById('wtp-start-game-btn'),
        wtpStartScreen: document.getElementById('wtp-start-screen'),
        wtpGameContainer: document.getElementById('wtp-game-area'),
        wtpScoreDisplay: document.getElementById('wtp-score'),
        wtpHighScoreDisplay: document.getElementById('wtp-high-score'),

        // Update Log
        buildVersion: document.getElementById('build-version'),
    };

    // --- INITIALIZATION ---
    async function initializeApp() {
        applyTheme();
        document.body.style.overflow = 'hidden'; // Prevent scrolling during load

        // --- OPTIMIZATION: Load all initial data from a single pre-cached file ---
        try {
            const res = await fetch('assets/precache.json');
            if (!res.ok) throw new Error('Could not load precache.json');
            const precachedData = await res.json();

            allHoldableItems = precachedData.allHoldableItems;
            allMoves = precachedData.allMoves;
            allNatures = precachedData.allNatures;
            apiCache.set('https://pokeapi.co/api/v2/nature?limit=25', { results: allNatures });
            apiCache.set('https://pokeapi.co/api/v2/ability?limit=400', { results: precachedData.allAbilities });
            apiCache.set('https://pokeapi.co/api/v2/pokemon-color', { results: precachedData.allColors });

            await fetchAllPokemonNames();
            populateMoveFilters();
            populateNatureFilters();

            populateColorFilter(); // This will now use the cache
            console.log('Successfully loaded data from precache.json');
        } catch (error) {
            showNotification('Failed to load initial data. Please try refreshing.', 'error');
            console.error(error);
        }

        if (dom.savedTeamsList) renderSavedTeams();
        setupEventListeners();
        setupDragAndDrop();
        setupAbilityReroller();
        setupTooltips();

        // Hide loading screen with a fade-out effect
        if (dom.loadingOverlay) {
            dom.loadingOverlay.style.opacity = '0';
            dom.loadingOverlay.addEventListener('transitionend', () => {
                dom.loadingOverlay?.remove();
                document.body.style.overflow = ''; // Restore scrolling after load
                document.body.classList.remove('loading'); // Show the main content
            });
        }
        if (dom.wtpHighScoreDisplay) dom.wtpHighScoreDisplay.textContent = wtpHighScore;
        if (dom.buildVersion) dom.buildVersion.textContent = 'v2.3.7';
    }

    function startIntroJs() {
        // Don't start if the user has opted out
        if (localStorage.getItem('hideTour') === 'true') return;

        const intro = introJs();

        // Helper to advance the tour when a specific element is clicked
        const waitForClick = (element, callback) => {
            const listener = (e) => {
                e.preventDefault();
                e.stopPropagation();
                element.removeEventListener('click', listener);
                if (callback) callback();
                setTimeout(() => intro.nextStep(), 200); // Small delay for visual feedback
            };
            element.addEventListener('click', listener);
        };

        intro.setOptions({
            showStepNumbers: true,
            showBullets: false,
            exitOnOverlayClick: false,
            exitOnEsc: true,
            nextLabel: 'Next →',
            prevLabel: '← Back',
            doneLabel: 'Done',
            tooltipClass: 'custom-tooltip',
            steps: [
                {
                    title: 'Welcome!',
                    intro: "Let's take a quick tour of the Pokémon Toolkit. You can press ESC or click 'Skip' at any time to exit."
                },
                {
                    element: document.querySelector('[data-target="generator-panel"]'),
                    title: 'Navigation',
                    intro: 'Use these tabs to switch between different tools. We are currently in the <strong>Generator</strong>.'
                },
                {
                    element: document.querySelector('#generatorForm button[type="submit"]'),
                    title: 'Generate a Pokémon',
                    intro: 'Click this button to generate a random Pokémon. <strong>The tour will continue after you click it.</strong>'
                },
                {
                    element: '#result-output .card-container',
                    title: 'Pokémon Card',
                    intro: 'Great! Here is your generated Pokémon. You can click the card to flip it over and see more details like stats and abilities.'
                },
                {
                    element: '#result-output .add-to-team-btn',
                    title: 'Add to Team',
                    intro: 'Now, click here to add this Pokémon to your team. <strong>The tour will continue after you click it.</strong>'
                },
                {
                    element: document.querySelector('[data-target="team-builder-panel"]'),
                    title: 'Team Builder',
                    intro: 'Excellent! Your Pokémon has been added to the <strong>Team Builder</strong>. Let\'s go there now. <strong>Click this tab to continue.</strong>'
                },
                {
                    element: '#team-builder-output .team-member',
                    title: 'Your Team',
                    intro: 'Here is your new team member. You can click on its Ability, Item, or Tera Type to change them.'
                },
                {
                    element: '#analyze-team-btn',
                    title: 'Analyze Your Team',
                    intro: 'Once you have a team, you can analyze its defensive weaknesses and offensive coverage here.'
                },
                {
                    title: 'All Done!',
                    intro: "That's the basics! You can restart this tour anytime by clicking the '?' icon in the navigation bar. Enjoy building!"
                }
            ]
        });

        intro.onbeforechange(function (targetElement) {
            // For interactive steps, hide the 'Next' button and wait for a click
            if (this._currentStep === 2) { // Generate button
                document.querySelector('.introjs-nextbutton').style.display = 'none';
                waitForClick(targetElement, () => dom.generatorForm.dispatchEvent(new Event('submit')));
            } else if (this._currentStep === 4) { // Add to team button
                document.querySelector('.introjs-nextbutton').style.display = 'none';
                waitForClick(targetElement, () => targetElement.click());
            } else if (this._currentStep === 5) { // Team builder tab
                document.querySelector('.introjs-nextbutton').style.display = 'none';
                waitForClick(targetElement, () => targetElement.click());
            } else {
                document.querySelector('.introjs-nextbutton').style.display = 'inline-block';
            }
        });

        intro.onexit(function () {
            if (confirm("Don't show this tour again?")) {
                localStorage.setItem('hideTour', 'true');
            }
        });

        intro.start();
    }


    initializeApp();

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        dom.appTabs.forEach(tab => tab.addEventListener('click', handleTabSwitch));
        dom.sidebarOverlay.addEventListener('click', closeSidebar);
        dom.closeSidebarBtns.forEach(btn => btn.addEventListener('click', closeSidebar));
        if (dom.startTourBtn) dom.startTourBtn.addEventListener('click', startIntroJs);
        if (dom.themeToggleBtn) dom.themeToggleBtn.addEventListener('click', toggleTheme);

        // Automatically start the tour on the first visit, after a short delay for the app to settle.
        if (!localStorage.getItem('hasRunBefore') && localStorage.getItem('hideTour') !== 'true') {
            localStorage.setItem('hasRunBefore', true);
            setTimeout(startIntroJs, 1000); // Delay tour start slightly
        }

        window.addEventListener('resize', handleResize);

        // Forms
        if (dom.generatorForm) dom.generatorForm.addEventListener('submit', handleGeneration);
        if (dom.pokedexSearch) dom.pokedexSearch.addEventListener('input', handlePokedexSearch);
        if (dom.pokedexForm) dom.pokedexForm.addEventListener('submit', handlePokedexSearch);
        if (dom.rerollAbilityBtn) dom.rerollAbilityBtn.addEventListener('click', handleAbilityReroll);
        if (dom.itemGeneratorForm) dom.itemGeneratorForm.addEventListener('submit', (e) => handleGenericGenerator(e, 'item'));
        if (dom.moveGeneratorForm) dom.moveGeneratorForm.addEventListener('submit', (e) => handleGenericGenerator(e, 'move'));
        if (dom.natureGeneratorForm) dom.natureGeneratorForm.addEventListener('submit', (e) => handleGenericGenerator(e, 'nature'));

        // Team Builder Buttons
        if (dom.clearTeamBtn) dom.clearTeamBtn.addEventListener('click', clearCurrentTeam);
        if (dom.saveTeamBtn) dom.saveTeamBtn.addEventListener('click', saveCurrentTeam);
        if (dom.analyzeTeamBtn) dom.analyzeTeamBtn.addEventListener('click', analyzeTeamCoverage);
        if (dom.randomTeamBtn) dom.randomTeamBtn.addEventListener('click', generateRandomTeam);
        if (dom.exportTeamBtn) dom.exportTeamBtn.addEventListener('click', openExportModal);
        if (dom.showImportBtn) dom.showImportBtn.addEventListener('click', () => dom.teamImportModal.classList.remove('hidden'));
        if (dom.savedTeamsSearch) dom.savedTeamsSearch.addEventListener('input', () => renderSavedTeams());
        if (dom.importTeamBtn) dom.importTeamBtn.addEventListener('click', handleTeamImport);
        if (dom.copyExportBtn) dom.copyExportBtn.addEventListener('click', copyTeamToClipboard);

        // Modals
        if (dom.closeAssignModalBtn) dom.closeAssignModalBtn.addEventListener('click', () => dom.assignModal.classList.add('hidden'));
        if (dom.closeCoverageModalBtn) dom.closeCoverageModalBtn.addEventListener('click', () => dom.typeCoverageModal.classList.add('hidden'));
        if (dom.closeExportModalBtn) dom.closeExportModalBtn.addEventListener('click', () => dom.teamExportModal.classList.add('hidden'));
        if (dom.closeMoveModalBtn) dom.closeMoveModalBtn.addEventListener('click', () => dom.moveDetailsModal.classList.add('hidden'));
        if (dom.closeManualAbilityModalBtn) dom.closeManualAbilityModalBtn.addEventListener('click', () => dom.manualAbilityModal.classList.add('hidden'));
        if (dom.closeManualItemModalBtn) dom.closeManualItemModalBtn.addEventListener('click', () => dom.manualItemModal.classList.add('hidden'));
        if (dom.closeTeraTypeModalBtn) dom.closeTeraTypeModalBtn.addEventListener('click', () => dom.teraTypeModal.classList.add('hidden'));
        if (dom.closeNatureModalBtn) dom.closeNatureModalBtn.addEventListener('click', () => dom.natureModal.classList.add('hidden'));
        if (dom.inputModalCancelBtn) dom.inputModalCancelBtn.addEventListener('click', () => dom.inputModal.classList.add('hidden'));

        if (dom.closeImportModalBtn) dom.closeImportModalBtn.addEventListener('click', () => dom.teamImportModal.classList.add('hidden'));

        // WTP Game
        if (dom.wtpStartGameBtn) dom.wtpStartGameBtn.addEventListener('click', () => beginWtpRound(false));
    }

    // --- UI & UTILITY FUNCTIONS ---
    const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ') : '';

    function applyTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (savedTheme === null && prefersDark);

        if (isDark) {
            document.documentElement.classList.add('dark');
            dom.themeIconLight.classList.add('hidden');
            dom.themeIconDark.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            dom.themeIconLight.classList.remove('hidden');
            dom.themeIconDark.classList.add('hidden');
        }
    }

    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        dom.themeIconLight.classList.toggle('hidden', isDark);
        dom.themeIconDark.classList.toggle('hidden', !isDark);
        showNotification(`Switched to ${isDark ? 'Dark' : 'Light'} Mode`, 'info');
    }

    function setupTooltips() {
        tippy('[data-tippy-content]', {
            theme: 'pkmn',
            animation: 'shift-away-subtle',
            placement: 'right'
        });
    }

    const formatDisplayName = (name) => {
        if (!name) return '';
        // Handle Nidoran male/female
        if (name === 'nidoran-f') return 'Nidoran♀';
        if (name === 'nidoran-m') return 'Nidoran♂';

        // General case for gendered forms
        name = name.replace('-female', '♀').replace('-male', '♂');

        // Capitalize each part of the name
        return name.split('-').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    };

    const levenshteinDistance = (a, b) => {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
        for (let i = 0; i <= a.length; i++) { matrix[0][i] = i; }
        for (let j = 0; j <= b.length; j++) { matrix[j][0] = j; }
        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost);
            }
        }
        return matrix[b.length][a.length];
    };

    function getSearchSuggestions(query, maxDistance = 3, count = 5) {
        if (allPokemonNames.length === 0) return [];
        return allPokemonNames
            .map(name => ({ name, distance: levenshteinDistance(query, name) }))
            .filter(item => item.distance <= maxDistance)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, count);
    }

    async function fetchAllPokemonNames() {
        if (allPokemonNames.length === 0) {
            console.log('[DEBUG] Fetching all Pokémon forms for search index...');
            const allPokemonList = await fetchFromApi('pokemon?limit=10000');
            allPokemonNames = allPokemonList.results.map(p => p.name);
            console.log(`[DEBUG] Initialized with ${allPokemonNames.length} total Pokémon forms.`);
        }
    }

    const formatForShowdown = (str, type = 'pokemon') => {
        if (!str) return '';

        const exceptions = {
            pokemon: {
                'mr-mime': 'Mr. Mime',
                'mime-jr': 'Mime Jr.',
                'mr-rime': 'Mr. Rime',
                'type-null': 'Type: Null',
                'jangmo-o': 'Jangmo-o',
                'hakamo-o': 'Hakamo-o',
                'kommo-o': 'Kommo-o',
                'ho-oh': 'Ho-Oh',
                'porygon-z': 'Porygon-Z',
                'nidoran-f': 'Nidoran-F',
                'nidoran-m': 'Nidoran-M',
                'farfetchd': "Farfetch'd",
                'sirfetchd': "Sirfetch'd",
            },
            ability: {
                'as-one-glastrier': 'As One (Glastrier)',
                'as-one-spectrier': 'As One (Spectrier)',
            }
        };

        if (exceptions[type] && exceptions[type][str]) {
            return exceptions[type][str];
        }

        return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    async function populateColorFilter() {
        if (!dom.colorFilterSelect) return;
        const colorData = await fetchFromApi('pokemon-color'); // This will now hit the cache
        colorData.results.forEach(color => {
            const option = document.createElement('option');
            option.value = color.name;
            option.textContent = capitalize(color.name);
            dom.colorFilterSelect.appendChild(option);
        });
    }

    function populateMoveFilters() {
        if (!dom.moveTypeFilter || !dom.moveCategoryFilter) return;

        const types = new Set();
        const categories = new Set();
        allMoves.forEach(move => {
            types.add(move.type.name);
            categories.add(move.damage_class.name);
        });

        [...types].sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = capitalize(type);
            dom.moveTypeFilter.appendChild(option);
        });

        [...categories].sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = capitalize(category);
            dom.moveCategoryFilter.appendChild(option);
        });
    }

    function populateNatureFilters() {
        if (!dom.natureBoostFilter || !dom.natureLowerFilter) return;
        const stats = ['attack', 'defense', 'special-attack', 'special-defense', 'speed'];
        stats.forEach(stat => {
            const option = document.createElement('option');
            option.value = stat;
            option.textContent = statShortNames[stat];
            dom.natureBoostFilter.appendChild(option.cloneNode(true));
            dom.natureLowerFilter.appendChild(option.cloneNode(true));
        });
    }

    async function processInBatches(items, asyncOperation, batchSize = 50) {
        let results = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchPromises = batch.map(asyncOperation);
            const batchResults = await Promise.all(batchPromises);
            results = results.concat(batchResults);
            // Add a small delay between batches to be kinder to the API
            if (items.length > batchSize) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        return results;
    }

    async function fetchFromApi(endpoint) {
        const fullUrl = `https://pokeapi.co/api/v2/${endpoint}`;

        // 1. Check in-memory cache first (fastest)
        if (apiCache.has(fullUrl)) {
            return apiCache.get(fullUrl);
        }

        // 2. Check session storage (persists on page reload)
        const cachedData = sessionStorage.getItem(fullUrl);
        if (cachedData) {
            const data = JSON.parse(cachedData);
            apiCache.set(fullUrl, data); // Populate in-memory cache for faster access next time
            return data;
        }

        // 3. If not cached, fetch from the network
        try {
            const res = await fetch(fullUrl);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const data = await res.json();

            // Store in both caches for future use
            apiCache.set(fullUrl, data); // Always cache in memory for the current session.

            // --- Smart Caching: Only save smaller, reusable data to sessionStorage ---
            const isLargeData = endpoint.startsWith('pokemon/') || endpoint.startsWith('pokemon-species/') || endpoint.endsWith('precache.json');
            if (!isLargeData) {
                try {
                    sessionStorage.setItem(fullUrl, JSON.stringify(data));
                } catch (e) {
                    // This can happen if storage is full. We'll log the warning but not retry.
                    // The in-memory cache will still work.
                    console.warn("Session storage is full. Could not cache item.", e);
                }
            }


            return data;
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        }
    }

    function showNotification(message, type = 'info') {
        if (!dom.notificationContainer) return;
        const notif = document.createElement('div');
        const typeClasses = { info: 'bg-blue-500', success: 'bg-green-500', error: 'bg-red-500' };
        notif.className = `p-4 rounded-lg shadow-lg text-white ${typeClasses[type] || 'bg-gray-500'} transition-opacity duration-300`;
        notif.textContent = message;
        dom.notificationContainer.appendChild(notif);
        setTimeout(() => {
            notif.style.opacity = '0';
            notif.addEventListener('transitionend', () => notif.remove());
        }, 3000);
    }

    function showConfirmation(message) {
        return new Promise(resolve => {
            if (!dom.confirmationModal) return resolve(false);
            dom.confirmationMessage.textContent = message;
            dom.confirmationModal.classList.remove('hidden');
            dom.confirmYesBtn.onclick = () => { dom.confirmationModal.classList.add('hidden'); resolve(true); };
            dom.confirmNoBtn.onclick = () => { dom.confirmationModal.classList.add('hidden'); resolve(false); };
        });
    }

    function showInputPrompt(message, defaultValue = '') {
        return new Promise(resolve => {
            if (!dom.inputModal) return resolve(null);
            dom.inputModalMessage.textContent = message;
            dom.inputModalInput.value = defaultValue;
            dom.inputModal.classList.remove('hidden');
            dom.inputModalInput.focus();
            dom.inputModalInput.select();

            dom.inputModalOkBtn.onclick = () => { dom.inputModal.classList.add('hidden'); resolve(dom.inputModalInput.value); };
            dom.inputModalCancelBtn.onclick = () => { dom.inputModal.classList.add('hidden'); resolve(null); };
            dom.inputModalInput.onkeydown = (e) => { if (e.key === 'Enter') dom.inputModalOkBtn.click(); if (e.key === 'Escape') dom.inputModalCancelBtn.click(); };
        });
    }

    // --- SIDEBAR & NAVIGATION ---
    function openSidebar() { if (dom.sidebarMain) { dom.sidebarMain.classList.add('open'); dom.sidebarOverlay.classList.add('show'); } }
    function closeSidebar() { if (dom.sidebarMain) { dom.sidebarMain.classList.remove('open'); dom.sidebarOverlay.classList.remove('show'); } }
    function handleTabSwitch(e) {
        // Prevent the tour button from acting like a tab
        if (e.currentTarget.id === 'start-tour-btn') {
            return;
        }

        const clickedTab = e.currentTarget;
        dom.appTabs.forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sidebar-panel, .main-view').forEach(el => el.classList.remove('active'));
        clickedTab.classList.add('active');
        document.getElementById(clickedTab.dataset.target)?.classList.add('active');
        document.getElementById(clickedTab.dataset.view)?.classList.add('active');
        if (clickedTab.dataset.target === 'ability-generator-panel') {
            setupAbilityReroller();
        }
        if (clickedTab.dataset.view === 'pokedex-view' && dom.pokedexCardContainer.innerHTML === '') {
            dom.pokedexCardContainer.innerHTML = '<p class="text-center text-sm text-gray-500 col-span-full">Search for a Pokémon to begin.</p>';
        }
        if (window.innerWidth < 768) closeSidebar();
    }
    function handleResize() { if (window.innerWidth >= 768) closeSidebar(); }

    // --- POKEMON GENERATOR ---
    async function handleGeneration(e) {
        e.preventDefault();
        const btn = document.querySelector('button[type="submit"][form="generatorForm"]');
        if (!btn) return;
        btn.disabled = true;
        btn.textContent = 'Searching...';
        if (dom.resultOutput) dom.resultOutput.innerHTML = '';
        if (dom.initialState) {
            dom.initialState.classList.remove('hidden');
            dom.initialState.querySelector('h3').textContent = 'Searching for Pokémon...';
        }
        try {
            const formData = new FormData(dom.generatorForm);
            const numToGenerate = Math.max(1, Math.min(6, parseInt(formData.get('count')) || 1));
            const filteredUrls = await getFilteredPokemonList(formData);
            const forceShiny = formData.get('force-shiny') === 'on';
            if (filteredUrls.length === 0) throw new Error("No Pokémon match the selected criteria.");
            if (filteredUrls.length < numToGenerate) showNotification(`Only found ${filteredUrls.length} Pokémon.`, 'info');
            if (dom.initialState) dom.initialState.classList.add('hidden');
            if (dom.resultOutput) dom.resultOutput.classList.remove('hidden');
            const chosenUrls = new Set();
            while (chosenUrls.size < Math.min(numToGenerate, filteredUrls.length)) {
                chosenUrls.add(filteredUrls[Math.floor(Math.random() * filteredUrls.length)]);
            }
            const pokemonPromises = [...chosenUrls].map(url => fetchFromApi(url.split('/v2/')[1]));
            const pokemonDataArr = await Promise.all(pokemonPromises);
            for (const pokemon of pokemonDataArr) {
                const speciesData = await fetchFromApi(pokemon.species.url.split('/v2/')[1]);
                const card = await createPokemonCard(pokemon, speciesData, forceShiny);
                if (dom.resultOutput) dom.resultOutput.appendChild(card);
            }
        } catch (error) {
            if (dom.resultOutput) dom.resultOutput.innerHTML = `<div class="placeholder"><h3 class="text-xl font-bold text-red-400">Error!</h3><p>${error.message}</p></div>`;
            if (dom.initialState) dom.initialState.classList.add('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Generate';
            if (window.innerWidth < 768) closeSidebar();
        }
    }

    async function getFilteredPokemonList(formData) {
        // --- Form Data Extraction ---
        const selectedGens = formData.getAll('gen');
        const selectedTypes = formData.getAll('type');
        const includeLegendary = formData.get('include-legendary') === 'on';
        const includeMythical = formData.get('include-mythical') === 'on';
        const includeForms = formData.get('include-forms') === 'on';
        const evoStages = formData.getAll('evolution-stage');
        const selectedColor = formData.get('color');

        // --- Efficient Filtering Logic ---
        let genPokemonUrls = new Set();
        let genPokemonNames = new Set();

        // 1. Get all Pokémon species and forms from the selected generations.
        if (selectedGens.length > 0) {
            const genPromises = selectedGens.map(gen => fetchFromApi(`generation/${gen}`));
            const genResults = await Promise.all(genPromises);
            genResults.forEach(genData => {
                genData.pokemon_species.forEach(p => genPokemonNames.add(p.name));
                // --- FIX: Also add the specific forms introduced in this generation ---
                if (genData.pokemon_species) { // Check if species list exists
                    genData.pokemon_species.forEach(p => genPokemonNames.add(p.name));
                }
                if (genData.pokemon) { // Some gen data might have this
                    genData.pokemon.forEach(p => {
                        genPokemonUrls.add(p.pokemon.url)
                    });
                }
            });
        } else {
            // If no generations are selected, start with all Pokémon.
            const allPokemonList = (await fetchFromApi('pokemon?limit=10000')).results;
            allPokemonList.forEach(p => genPokemonUrls.add(p.url));
            const allSpeciesList = (await fetchFromApi('pokemon-species?limit=10000')).results;
            allSpeciesList.forEach(s => genPokemonNames.add(s.name));
        }

        // 2. Get Pokémon from selected types
        let typePokemonNames = new Set();
        const allTypesSelected = selectedTypes.length === 18 || selectedTypes.length === 0;

        if (!allTypesSelected) {
            const typePromises = selectedTypes.map(type => fetchFromApi(`type/${type}`));
            const typeResults = await Promise.all(typePromises);
            typeResults.forEach(typeData => {
                typeData.pokemon.forEach(p => typePokemonNames.add(p.pokemon.name));
            });
        }

        // 3. Find the intersection of generation and type lists
        let candidateNames;
        if (!allTypesSelected) {
            candidateNames = [...genPokemonNames].filter(name => typePokemonNames.has(name));
        } else {
            candidateNames = [...genPokemonNames];
        }

        // --- FIX: Add forms from selected generations that might have been missed ---
        if (includeForms && genPokemonUrls.size > 0) {
            const formSpeciesNames = (await Promise.all([...genPokemonUrls].map(url => fetchFromApi(url.split('/v2/')[1])))).map(p => p.species.name);
            formSpeciesNames.forEach(name => candidateNames.push(name));
        }

        // 4. Fetch species data ONLY for the candidates in batches to avoid rate limiting
        let allSpeciesData = await processInBatches(candidateNames, name => fetchFromApi(`pokemon-species/${name}`), 100);

        // Filter by rarity
        allSpeciesData = allSpeciesData.filter(speciesData => {
            if (!speciesData) return false; // Handle cases where a species might not be found
            if (!includeLegendary && speciesData.is_legendary) return false;
            if (!includeMythical && speciesData.is_mythical) return false;
            return true;
        });

        // Filter by color
        allSpeciesData = allSpeciesData.filter(speciesData => {
            if (!selectedColor) return true; // If no color selected, keep all
            return speciesData.color.name === selectedColor;
        });

        // Filter by evolution stage, also in batches
        if (evoStages.length > 0 && evoStages.length < 2) {
            const evolutionChecks = await processInBatches(allSpeciesData, s => isPokemonFullyEvolved(s), 100);
            const shouldBeFullyEvolved = evoStages.includes('fully-evolved');
            allSpeciesData = allSpeciesData.filter((_, i) => evolutionChecks[i] === shouldBeFullyEvolved);
        }

        // 5. Get the final list of Pokémon variety URLs
        let pokemonUrls = allSpeciesData.flatMap(s => includeForms ? s.varieties.map(v => v.pokemon.url) : [s.varieties.find(v => v.is_default)?.pokemon.url]).filter(Boolean);

        return [...new Set(pokemonUrls)]; // Return unique URLs
    }

    async function isPokemonFullyEvolved(speciesData) {
        if (!speciesData || !speciesData.evolution_chain?.url) return true;
        const evoChainData = await fetchFromApi(speciesData.evolution_chain.url.split('/v2/')[1]);
        let currentStage = evoChainData.chain;
        while (currentStage?.species.name !== speciesData.name && currentStage?.evolves_to.length > 0) {
            currentStage = currentStage.evolves_to[0];
        }
        return currentStage ? currentStage.evolves_to.length === 0 : true;
    }

    async function createPokemonCard(pokemonData, speciesData, isShinyForced = false) {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'card-container w-full max-w-sm h-[480px]';
        const isShiny = isShinyForced || (Math.random() < SHINY_CHANCE);
        const primaryType = pokemonData.types[0].type.name;
        const sprite = isShiny ? pokemonData.sprites.front_shiny : pokemonData.sprites.front_default;
        const flavorText = speciesData.flavor_text_entries.find(e => e.language.name === 'en')?.flavor_text.replace(/[\n\f]/g, ' ') || 'No description available.';
        const abilityData = await Promise.all(pokemonData.abilities.map(a => fetchFromApi(a.ability.url.split('/v2/')[1])));
        const abilitiesHtml = pokemonData.abilities.map((ability, index) => {
            const effectEntry = abilityData[index]?.effect_entries?.find(e => e.language.name === 'en');
            const isHidden = ability.is_hidden ? ' <span class="text-xs text-gray-400">(Hidden)</span>' : '';
            return `<div class="mb-2"><strong class="capitalize">${capitalize(ability.ability.name)}${isHidden}</strong><p class="text-xs text-gray-300">${effectEntry ? effectEntry.short_effect : ''}</p></div>`;
        }).join('');
        const uniqueChartId = `stats-radar-chart-${pokemonData.id}-${Date.now()}`;
        const statsHtml = `<canvas id="${uniqueChartId}"></canvas>`;

        // --- Variety/Form Switcher ---
        let varietySwitcherHtml = '';
        const typeColors = { normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C', grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A', rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746', steel: '#B7B7CE', fairy: '#D685AD' };
        const type1 = pokemonData.types[0].type.name;
        const type2 = pokemonData.types[1]?.type.name || type1;
        const gradient = `linear-gradient(135deg, ${typeColors[type1]} 0%, ${typeColors[type2]} 100%)`;

        if (speciesData.varieties.length > 1) {
            varietySwitcherHtml = `<select id="variety-switcher" class="absolute top-4 left-4 bg-black/30 text-white text-xs rounded p-1 border border-white/20">`;
            varietySwitcherHtml += speciesData.varieties.map(v => {
                return `<option value="${v.pokemon.name}" ${v.pokemon.name === pokemonData.name ? 'selected' : ''}>${formatDisplayName(v.pokemon.name)}</option>`;
            }).join('');
            varietySwitcherHtml += `</select>`;
        }

        // --- Damage Relations ---
        const damageRelations = await calculateDamageRelations(pokemonData.types);
        let defensesHtml = '<div class="mt-4"><h4 class="font-bold text-center text-lg mb-2">Defenses</h4><div class="text-xs space-y-1">';
        const relationsOrder = { '4x': [], '2x': [], '½x': [], '¼x': [], '0x': [] };
        for (const [type, multiplier] of Object.entries(damageRelations)) {
            if (multiplier === 4) relationsOrder['4x'].push(type);
            else if (multiplier === 2) relationsOrder['2x'].push(type);
            else if (multiplier === 0.5) relationsOrder['½x'].push(type);
            else if (multiplier === 0.25) relationsOrder['¼x'].push(type);
            else if (multiplier === 0) relationsOrder['0x'].push(type);
        }
        if (relationsOrder['4x'].length > 0) defensesHtml += `<div><strong>4x Weak</strong>: ${relationsOrder['4x'].map(t => `<span class="type-icon type-${t} !w-5 !h-5 !text-[10px]">${t.slice(0, 3)}</span>`).join(' ')}</div>`;
        if (relationsOrder['2x'].length > 0) defensesHtml += `<div><strong>2x Weak</strong>: ${relationsOrder['2x'].map(t => `<span class="type-icon type-${t} !w-5 !h-5 !text-[10px]">${t.slice(0, 3)}</span>`).join(' ')}</div>`;
        if (relationsOrder['½x'].length > 0) defensesHtml += `<div><strong>Resists (½x)</strong>: ${relationsOrder['½x'].map(t => `<span class="type-icon type-${t} !w-5 !h-5 !text-[10px]">${t.slice(0, 3)}</span>`).join(' ')}</div>`;
        if (relationsOrder['¼x'].length > 0) defensesHtml += `<div><strong>Resists (¼x)</strong>: ${relationsOrder['¼x'].map(t => `<span class="type-icon type-${t} !w-5 !h-5 !text-[10px]">${t.slice(0, 3)}</span>`).join(' ')}</div>`;
        if (relationsOrder['0x'].length > 0) defensesHtml += `<div><strong>Immune (0x)</strong>: ${relationsOrder['0x'].map(t => `<span class="type-icon type-${t} !w-5 !h-5 !text-[10px]">${t.slice(0, 3)}</span>`).join(' ')}</div>`;
        defensesHtml += '</div></div>';

        cardContainer.innerHTML = `<div class="card-inner w-full h-full">
            <div class="card-front" style="border-color: ${typeColors[type1]};">
                <div class="card-bg-gradient" style="background: ${gradient};"></div>
                ${varietySwitcherHtml}
                <div class="absolute top-4 right-4 text-yellow-400 w-10 h-10 ${isShiny ? '' : 'hidden'}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor"><path d="M50 0 L61.2 35.5 H98 L70.6 57.3 L81.9 92.7 L50 71 L18.1 92.7 L29.4 57.3 L2 35.5 H38.8 Z"/></svg></div>
                <div class="flex flex-col items-center text-center h-full">
                    <div class="relative w-48 h-48 rounded-full flex items-center justify-center mb-4 cursor-pointer"><img src="${sprite}" alt="${pokemonData.name}" class="h-40 w-40 object-contain" style="image-rendering: pixelated;"></div>
                    <h2 class="text-3xl font-bold tracking-wide">${formatDisplayName(pokemonData.name)}</h2>
                    <p class="text-lg text-text-dark">#${String(speciesData.id).padStart(4, '0')}</p>
                    <div class="flex gap-2 mt-2">${pokemonData.types.map(t => `<span class="px-3 py-1 rounded-full text-sm font-semibold text-white capitalize shadow-md type-${t.type.name}">${t.type.name}</span>`).join('')}</div>
                    <div class="flex-grow flex items-center"><p class="text-text-dark text-sm">${flavorText}</p></div>
                    <div class="flex gap-2 mt-2 justify-center min-h-[40px] items-center"><button class="add-to-team-btn font-bold py-2 px-4 rounded-full transition-all">Add to Team</button></div>
                </div>
            </div>
            <div class="card-back" style="border-color: ${typeColors[type1]};">
                <div class="card-bg-gradient" style="background: ${gradient};"></div>
                <nav class="card-back-nav">
                    <button class="card-back-tab active" data-target="stats-content">Stats</button>
                    <button class="card-back-tab" data-target="abilities-content">Abilities</button>
                    <button class="card-back-tab" data-target="defenses-content">Defenses</button>
                </nav>
                <div id="stats-content" class="card-back-content active">${statsHtml}</div>
                <div id="abilities-content" class="card-back-content text-sm">${abilitiesHtml.replaceAll('text-gray-300', 'text-text-dark')}</div>
                <div id="defenses-content" class="card-back-content">${defensesHtml}</div>
            </div>
        </div>`;

        cardContainer.querySelector('.card-front').addEventListener('click', (e) => { if (!e.target.classList.contains('add-to-team-btn')) cardContainer.classList.toggle('is-flipped'); });
        cardContainer.querySelector('.card-back').addEventListener('click', () => cardContainer.classList.toggle('is-flipped'));
        cardContainer.querySelector('.add-to-team-btn').addEventListener('click', () => addToCurrentTeam(pokemonData));
        // Animate stat bars when card is flipped
        cardContainer.addEventListener('transitionstart', (e) => {
            const chartCanvas = cardContainer.querySelector(`#${uniqueChartId}`);
            // Only render the chart if it hasn't been rendered yet for this card
            if (e.propertyName === 'transform' && cardContainer.classList.contains('is-flipped') && chartCanvas && !chartCanvas.chart) {
                setTimeout(() => renderStatsChart(pokemonData, chartCanvas), 250); // Delay to sync with flip animation
            }
        });
        const varietySwitcher = cardContainer.querySelector('#variety-switcher');
        if (varietySwitcher) {
            varietySwitcher.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent card from flipping
                dom.pokedexSearch.value = e.target.value; // Set search input to the selected form
                handlePokedexSearch(new Event('submit'));
            });
        }
        // Tab switching for card back
        cardContainer.querySelectorAll('.card-back-tab').forEach(tab => {
            tab.addEventListener('click', (e) => { e.stopPropagation(); handleCardTabSwitch(e, cardContainer); });
        });

        return cardContainer;
    }

    // --- TEAM BUILDER ---
    function addToCurrentTeam(pokemonData) {
        if (currentTeam.length >= MAX_TEAM_SIZE) return showNotification("Your team is full!", 'error');
        if (currentTeam.some(p => p.id === pokemonData.id)) return showNotification(`${formatDisplayName(pokemonData.name)} is already on your team.`, 'info');
        const natures = apiCache.get(`https://pokeapi.co/api/v2/nature?limit=25`)?.results;
        pokemonData.assignedNature = natures ? natures[Math.floor(Math.random() * natures.length)] : null;
        pokemonData.assignedAbility = null;
        pokemonData.assignedItem = null;
        pokemonData.assignedMoves = [];
        pokemonData.evs = { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
        pokemonData.ivs = { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 };
        pokemonData.isShiny = false;
        pokemonData.teraType = pokemonData.types[0].type.name; // Default Tera Type to primary type
        pokemonData.nickname = ''; // Add nickname property
        currentTeam.push(pokemonData);
        showNotification(`${formatDisplayName(pokemonData.name)} added to team!`, 'success');
        renderCurrentTeam();
        setupAbilityReroller();
    }

    /**
     * Creates the DOM element for a single team member.
     * This function builds the static structure of the card.
     * @param {object} pokemon - The Pokémon data object.
     * @param {number} index - The index of the Pokémon in the current team.
     * @returns {HTMLElement} The team member card element.
     */
    function createTeamMemberElement(pokemon, index) {
        const memberEl = document.createElement('div');
        memberEl.className = 'team-member';
        memberEl.dataset.index = index;
        memberEl.draggable = true;

        // --- NEW: Two-Column Layout ---
        // Column 1: Identity (Sprite, Name, Types, Actions)
        const identityColumn = `
            <div class="flex flex-col items-center text-center gap-2">
                <img src="${pokemon.isShiny ? pokemon.sprites.front_shiny : pokemon.sprites.front_default}" alt="${pokemon.name}" class="w-24 h-24 pointer-events-none bg-tertiary-bg rounded-full team-member-sprite" draggable="false">
                <div class="flex-grow min-w-0">
                    <h3 class="font-bold text-2xl truncate cursor-pointer hover:text-accent nickname-display" data-index="${index}" title="Click to edit nickname">${pokemon.nickname || formatDisplayName(pokemon.name)}</h3>
                    ${pokemon.nickname ? `<p class="text-sm text-text-dark truncate">${formatDisplayName(pokemon.name)}</p>` : ''}
                </div>
                <div class="flex gap-1">${pokemon.types.map(t => `<span class="type-icon !w-7 !h-7 !text-xs" title="${capitalize(t.type.name)}">${t.type.name.slice(0, 3)}</span>`).join('')}</div>
                <div class="flex items-center flex-shrink-0 space-x-1 mt-2">
                    <button class="shiny-toggle-btn p-1.5 text-xl rounded-full hover:bg-tertiary-bg ${pokemon.isShiny ? 'text-yellow-400' : ''}" data-index="${index}" title="Toggle Shiny">✨</button>
                    <button class="action-btn p-1.5 text-xl rounded-full hover:bg-tertiary-bg" data-index="${index}" title="Generate Random Moveset">🪄</button>
                    <button class="remove-btn p-1.5 text-xl rounded-full hover:bg-tertiary-bg" data-index="${index}" title="Remove">✖</button>
                </div>
            </div>`;

        // Column 2: Battle Data (Ability, Item, Moves, Stats)
        const battleDataColumn = document.createElement('div');
        battleDataColumn.className = "flex flex-col gap-4";

        // --- Ability, Item, Nature, Tera ---
        const attributesHtml = `
            <div class="space-y-2 text-sm">
                <div class="ability-display team-member-row" data-index="${index}"><strong>Ability</strong><span class="font-medium capitalize">${pokemon.assignedAbility ? formatDisplayName(pokemon.assignedAbility.name) : 'Select...'}</span></div>
                <div class="item-display team-member-row" data-index="${index}"><strong>Item</strong><span class="font-medium capitalize">${pokemon.assignedItem ? formatDisplayName(pokemon.assignedItem.name) : 'Select...'}</span></div>
                <div class="nature-display team-member-row" data-index="${index}"><strong>Nature</strong><span class="font-medium capitalize">${pokemon.assignedNature ? formatDisplayName(pokemon.assignedNature.name) : 'Select...'}</span></div>
                <div class="tera-type-display team-member-row" data-index="${index}"><strong>Tera</strong><div class="flex items-center gap-2"><span class="type-icon type-${pokemon.teraType}">${pokemon.teraType.slice(0, 3)}</span><span class="font-medium capitalize">${formatDisplayName(pokemon.teraType)}</span></div></div>
            </div>`;

        // --- Moves Section ---
        let movesHtml = '<div><strong class="text-sm text-text-dark mb-2 block">Moves</strong><div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">';
        for (let i = 0; i < 4; i++) {
            const move = pokemon.assignedMoves[i];
            movesHtml += move
                ? `<div class="move-display cursor-pointer hover:text-accent truncate" data-move-name="${move.name}">- ${formatDisplayName(move.name)}</div>`
                : `<div class="move-display cursor-pointer text-text-dark opacity-60 hover:opacity-100 hover:text-accent">- (No Move)</div>`;
        }
        movesHtml += '</div></div>';

        // --- Stats Section ---
        const totalEVs = Object.values(pokemon.evs).reduce((a, b) => a + b, 0);
        let statsHtml = `<div class="stats-container" data-index="${index}">
            <div class="flex justify-between items-center mb-2">
                <strong class="text-sm text-text-dark">Stats (EVs/IVs)</strong>
                <span class="total-evs-display text-xs font-mono px-2 py-1 rounded ${totalEVs > 510 ? 'bg-red-500 text-white' : 'bg-tertiary-bg'}">${totalEVs} / 510</span>
            </div>
            <div class="space-y-1.5 text-sm">`;
        for (const statName in pokemon.evs) {
            const baseStat = pokemon.stats.find(s => s.stat.name === statName).base_stat;
            const natureMod = getNatureMultiplier(pokemon.assignedNature, statName);
            const finalStat = calculateStat(baseStat, pokemon.ivs[statName] || 31, pokemon.evs[statName] || 0, 100, statName === 'hp' ? 'hp' : natureMod);
            statsHtml += `
                <div class="stat-row" data-stat-name="${statName}">
                    <div class="grid grid-cols-[2.5rem,1fr,2.5rem] items-center gap-x-2">
                        <label class="font-bold text-text-dark">${statShortNames[statName]}</label>
                        <div class="stat-bar-container bg-tertiary-bg rounded-full h-4 overflow-hidden relative"><div class="stat-bar-ev h-full bg-accent" style="width: ${(pokemon.evs[statName] / 252) * 100}%"></div><span class="absolute inset-0 text-center text-xs font-bold text-white mix-blend-difference leading-4">${pokemon.evs[statName]}</span></div>
                        <span class="font-bold text-lg final-stat-display text-right">${finalStat}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-1 pl-12">
                        <input type="range" data-stat-type="ev" class="stat-slider w-full" value="${pokemon.evs[statName]}" min="0" max="252" step="4" title="EVs">
                        <div class="flex gap-1 items-center">
                            <button class="stat-quick-btn" data-stat-type="ev" data-value="0">0</button>
                            <button class="stat-quick-btn" data-stat-type="ev" data-value="252">252</button>
                            <input type="number" data-stat-type="iv" class="stat-input w-12 text-center" value="${pokemon.ivs[statName]}" min="0" max="31" title="IVs">
                            <button class="stat-quick-btn" data-stat-type="iv" data-value="31">31</button>
                        </div>
                    </div>
                </div>
            `;
        }
        statsHtml += '</div></div>';

        battleDataColumn.innerHTML = `${attributesHtml}${movesHtml}${statsHtml}`;

        memberEl.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-[1fr,2fr] md:gap-4">${identityColumn}<div>${battleDataColumn.innerHTML}</div></div>`;
        return memberEl;
    }

    /**
     * Attaches all necessary event listeners to a team member card.
     * @param {HTMLElement} memberEl - The team member card element.
     */
    function attachTeamMemberListeners(memberEl) {
        const index = parseInt(memberEl.dataset.index);

        memberEl.querySelector('.action-btn').addEventListener('click', (e) => generateMoveset(e, index));
        memberEl.querySelector('.remove-btn').addEventListener('click', (e) => removeTeamMember(e, index));
        memberEl.querySelector('.shiny-toggle-btn').addEventListener('click', (e) => toggleShiny(e, index));
        memberEl.querySelector('.nickname-display').addEventListener('click', (e) => editNickname(e, index));

        // Modal Openers
        memberEl.querySelector('.ability-display').addEventListener('click', (e) => { e.stopPropagation(); openManualAbilityModal(index); });
        memberEl.querySelector('.item-display').addEventListener('click', (e) => { e.stopPropagation(); openManualItemModal(index); });
        memberEl.querySelector('.tera-type-display').addEventListener('click', (e) => { e.stopPropagation(); openTeraTypeModal(index); });
        memberEl.querySelector('.nature-display').addEventListener('click', (e) => { e.stopPropagation(); openNatureModal(index); });

        // Moves modal and details
        const movesContainer = memberEl.querySelector('.move-display').parentElement.parentElement;
        movesContainer.addEventListener('click', (e) => {
            const moveEl = e.target.closest('[data-move-name]');
            if (moveEl) {
                showMoveDetails(moveEl.dataset.moveName);
            } else {
                openManualMoveModal(index);
            }
        });

        // Stat input handling
        memberEl.querySelectorAll('.stat-input').forEach(input => {
            input.addEventListener('change', (e) => handleStatInputChange(e, index));
        });
        memberEl.querySelectorAll('.stat-slider').forEach(slider => {
            slider.addEventListener('input', (e) => handleStatInputChange(e, index));
        });
        memberEl.querySelectorAll('.stat-quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                handleStatQuickSet(e, index);
            });
        });
    }

    /**
     * Handles changes to EV/IV input fields, updating state and UI without a full re-render.
     * @param {Event} e - The change event from the input.
     * @param {number} index - The index of the Pokémon being edited.
     */
    function handleStatInputChange(e, index) {
        const input = e.target;
        const statRow = e.target.closest('.stat-row');
        const statsContainer = e.target.closest('.stats-container');
        const statName = statRow.dataset.statName;
        const statType = input.dataset.statType; // 'ev' or 'iv'
        let value = parseInt(input.value) || 0;

        // Clamp value and update input field if necessary
        const max = statType === 'ev' ? 252 : 31;
        value = Math.max(0, Math.min(max, value));
        if (input.type !== 'range') input.value = value;
        else statRow.querySelector('.stat-slider').value = value; // Sync slider if number input changes

        // Update the team data state
        currentTeam[index][statType === 'ev' ? 'evs' : 'ivs'][statName] = value;

        // Update UI elements for the specific row
        if (statType === 'ev') {
            const evBar = statRow.querySelector('.stat-bar-ev');
            evBar.style.width = `${(value / 252) * 100}%`;
            evBar.nextElementSibling.textContent = value;
        }
        // Recalculate and update the final stat in the UI
        const baseStat = currentTeam[index].stats.find(s => s.stat.name === statName).base_stat;
        const natureMod = getNatureMultiplier(currentTeam[index].assignedNature, statName);
        const finalStat = calculateStat(baseStat, currentTeam[index].ivs[statName], currentTeam[index].evs[statName], 100, statName === 'hp' ? 'hp' : natureMod);
        statRow.querySelector('.final-stat-display').textContent = finalStat;

        // Update total EVs display
        const totalEVs = Object.values(currentTeam[index].evs).reduce((a, b) => a + b, 0);
        const totalEVsDisplay = statsContainer.querySelector('.total-evs-display');
        totalEVsDisplay.textContent = `${totalEVs} / 510`;
        totalEVsDisplay.classList.toggle('bg-red-500', totalEVs > 510);
        totalEVsDisplay.classList.toggle('text-white', totalEVs > 510);
        totalEVsDisplay.classList.toggle('bg-tertiary-bg', totalEVs <= 510);
    }

    function handleStatQuickSet(e, index) {
        const btn = e.target;
        const statRow = btn.closest('.stat-row');
        const statType = btn.dataset.statType;
        const value = parseInt(btn.dataset.value);

        let input;
        if (statType === 'ev') {
            input = statRow.querySelector('.stat-slider');
        } else { // iv
            input = statRow.querySelector('.stat-input[data-stat-type="iv"]');
        }
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true })); // Trigger update for EV slider
        input.dispatchEvent(new Event('change', { bubbles: true })); // Trigger update for IV number input
    }

    function renderCurrentTeam() {
        if (!dom.teamBuilderOutput) return;
        dom.teamBuilderOutput.innerHTML = '';

        if (currentTeam.length === 0) {
            dom.teamBuilderOutput.innerHTML = `<p class="text-center text-sm text-gray-500">No Pokémon in team.</p>`;
            return;
        }

        currentTeam.forEach((pokemon, index) => {
            const memberEl = createTeamMemberElement(pokemon, index);
            attachTeamMemberListeners(memberEl);
            dom.teamBuilderOutput.appendChild(memberEl);
        });
    }

    function setupDragAndDrop() {
        const teamList = dom.teamBuilderOutput;
        if (!teamList) return;

        let draggedItem = null;
        let placeholder = null;

        teamList.addEventListener('dragstart', (e) => {
            draggedItem = e.target.closest('.team-member');
            if (!draggedItem) return;

            // Create a placeholder
            placeholder = document.createElement('div');
            placeholder.className = 'team-member-placeholder';
            placeholder.style.height = `${draggedItem.offsetHeight}px`;

            setTimeout(() => {
                draggedItem.classList.add('dragging');
                teamList.insertBefore(placeholder, draggedItem);
            }, 0);
        });

        teamList.addEventListener('dragend', (e) => {
            if (!draggedItem) return;
            draggedItem.classList.remove('dragging');
            placeholder?.remove();

            // Update the currentTeam array based on the new DOM order
            const newTeamOrder = Array.from(teamList.querySelectorAll('.team-member'))
                .map(el => currentTeam[parseInt(el.dataset.index)]);
            currentTeam = newTeamOrder;

            // Re-render to update indices correctly without a full flash
            renderCurrentTeam();
            draggedItem = null;
        });

        teamList.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedItem) return;
            const afterElement = getDragAfterElement(teamList, e.clientY);
            teamList.insertBefore(placeholder, afterElement);
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.team-member:not([style*="opacity: 0.5"])')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function toggleShiny(e, index) {
        e.stopPropagation();
        const pokemon = currentTeam[index];
        pokemon.isShiny = !pokemon.isShiny;
        renderCurrentTeam();
    }

    async function editNickname(e, index) {
        e.stopPropagation();
        const pokemon = currentTeam[index];
        const newNickname = await showInputPrompt(`Enter a nickname for ${formatDisplayName(pokemon.name)}:`, pokemon.nickname || '');

        if (newNickname === null) return; // User cancelled

        // If the user enters an empty string, we reset the nickname.
        // Otherwise, we set it to their input, trimmed.
        pokemon.nickname = newNickname.trim();

        showNotification(`Nickname updated!`, 'success');
        renderCurrentTeam();
    }

    async function openManualMoveModal(pokemonIndex) {
        const pokemon = currentTeam[pokemonIndex];
        dom.manualMoveModalTitle.textContent = `Select Moves for ${formatDisplayName(pokemon.name)}`;
        dom.manualMoveModalContent.innerHTML = '<p>Loading moves...</p>';
        dom.manualMoveModal.classList.remove('hidden');

        const moveDetails = await Promise.all(pokemon.moves.map(m => fetchFromApi(m.move.url.split('/v2/')[1])));

        // Sort moves alphabetically
        moveDetails.sort((a, b) => a.name.localeCompare(b.name));

        const movesHtml = moveDetails.map(move => `
            <div class="p-2 border-b border-tertiary-bg flex justify-between items-center">
                <label class="grid grid-cols-[auto_1fr] items-center gap-x-3 cursor-pointer"><input type="checkbox" data-move-name="${move.name}" class="move-select-checkbox" ${pokemon.assignedMoves.some(m => m.name === move.name) ? 'checked' : ''}> <span>${formatDisplayName(move.name)}</span></label>
                <span class="type-icon type-${move.type.name}">${move.type.name.slice(0, 3)}</span>
            </div>`).join('');

        dom.manualMoveModalContent.innerHTML = `<div class="h-full">${movesHtml}</div>`;

        dom.manualMoveModalContent.querySelectorAll('.move-select-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const moveName = e.target.dataset.moveName;
                if (e.target.checked) {
                    // Add move
                    if (pokemon.assignedMoves.length < 4) {
                        const moveData = moveDetails.find(m => m.name === moveName);
                        pokemon.assignedMoves.push(moveData);
                    } else {
                        e.target.checked = false; // Prevent checking more than 4
                        showNotification('A Pokémon can only have 4 moves.', 'error');
                    }
                } else {
                    // Remove move
                    pokemon.assignedMoves = pokemon.assignedMoves.filter(m => m.name !== moveName);
                }
                renderCurrentTeam();
            });
        });
    }

    async function openManualAbilityModal(pokemonIndex) {
        const pokemon = currentTeam[pokemonIndex];
        dom.manualAbilityModalTitle.textContent = `Select Ability for ${formatDisplayName(pokemon.name)}`;
        dom.manualAbilityModalContent.innerHTML = '<p>Loading abilities...</p>';
        dom.manualAbilityModal.classList.remove('hidden');

        const abilityDetails = await Promise.all(pokemon.abilities.map(a => fetchFromApi(a.ability.url.split('/v2/')[1])));

        const abilitiesHtml = abilityDetails.map(ability => {
            const isHidden = pokemon.abilities.find(a => a.ability.name === ability.name)?.is_hidden;
            const effect = ability.effect_entries.find(e => e.language.name === 'en')?.short_effect || 'No description.';
            return `
                <div class="p-3 border-b border-border-color">
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="ability-select-${pokemonIndex}" data-ability-name="${ability.name}" ${pokemon.assignedAbility?.name === ability.name ? 'checked' : ''}>
                        <div>
                            <span class="font-bold text-text-light">${formatDisplayName(ability.name)}</span>
                            ${isHidden ? '<span class="text-xs text-gray-400">(Hidden)</span>' : ''}
                            <p class="text-sm text-gray-300">${effect}</p>
                        </div>
                    </label>
                </div>`;
        }).join('');

        dom.manualAbilityModalContent.innerHTML = `<div class="h-full">${abilitiesHtml}</div>`;

        dom.manualAbilityModalContent.querySelectorAll(`input[name="ability-select-${pokemonIndex}"]`).forEach(radio => {
            radio.addEventListener('change', (e) => {
                const abilityName = e.target.dataset.abilityName;
                pokemon.assignedAbility = abilityDetails.find(a => a.name === abilityName);
                renderCurrentTeam();
                dom.manualAbilityModal.classList.add('hidden');
                showNotification(`Set ability to ${formatDisplayName(abilityName)}!`, 'success');
            });
        });
    }

    async function openManualItemModal(pokemonIndex) {
        const pokemon = currentTeam[pokemonIndex];
        dom.manualItemModalTitle.textContent = `Select Item for ${formatDisplayName(pokemon.name)}`;
        dom.manualItemModalContent.innerHTML = '<p>Loading items...</p>';
        dom.manualItemModal.classList.remove('hidden');

        // Use pre-cached items
        if (allHoldableItems.length === 0) {
            dom.manualItemModalContent.innerHTML = '<p>Items are still loading, please try again in a moment.</p>';
            return;
        }

        const renderItems = (itemsToRender, isSearch = false) => {
            const itemsHtml = itemsToRender.map(item => `
                <div class="item-choice p-2 border-b border-tertiary-bg flex items-center gap-3 cursor-pointer hover:bg-tertiary-bg" data-item-name="${item.name}">
                    <img src="${item.sprites.default}" alt="${item.name}" class="w-8 h-8" style="image-rendering: pixelated;">
                    <span class="font-semibold">${formatDisplayName(item.name)}</span>
                </div>`).join('');
            dom.manualItemModalContent.innerHTML = `<div class="h-full">${itemsHtml}</div>`; // This was overwriting the search input, fixed below

            dom.manualItemModalContent.querySelectorAll('.item-choice').forEach(itemEl => {
                itemEl.addEventListener('click', () => {
                    const itemName = itemEl.dataset.itemName;
                    pokemon.assignedItem = allHoldableItems.find(i => i.name === itemName);
                    renderCurrentTeam();
                    dom.manualItemModal.classList.add('hidden');
                    showNotification(`Gave ${formatDisplayName(pokemon.name)} a ${formatDisplayName(itemName)}!`, 'success');
                });
            });
        };

        const itemSearchInput = document.getElementById('item-search-input');
        itemSearchInput.value = '';
        renderItems(allHoldableItems);

        if (!itemSearchInput.listenerAttached) {
            itemSearchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase().replace(/-/g, ' ');
                const filtered = allHoldableItems.filter(item => item.name.replace(/-/g, ' ').includes(searchTerm));
                renderItems(filtered, true);
            });
            itemSearchInput.listenerAttached = true;
        }
    }

    async function openTeraTypeModal(pokemonIndex) {
        const pokemon = currentTeam[pokemonIndex];
        dom.teraTypeModalTitle.textContent = `Select Tera Type for ${formatDisplayName(pokemon.name)}`;
        dom.teraTypeModalContent.innerHTML = '<p>Loading types...</p>';
        dom.teraTypeModal.classList.remove('hidden');

        const allTypes = (await fetchFromApi('type')).results.filter(t => t.name !== 'unknown' && t.name !== 'shadow');

        const typesHtml = allTypes.map(type => `
            <button class="tera-type-choice p-2 border-b border-tertiary-bg flex items-center gap-3 cursor-pointer hover:bg-tertiary-bg w-full text-left" data-type-name="${type.name}">
                <span class="type-icon type-${type.name}">${type.name.slice(0, 3)}</span>
                <span class="font-semibold">${formatDisplayName(type.name)}</span>
            </button>`).join('');

        dom.teraTypeModalContent.innerHTML = `<div class="h-full">${typesHtml}</div>`;

        dom.teraTypeModalContent.querySelectorAll('.tera-type-choice').forEach(button => {
            button.addEventListener('click', () => {
                const typeName = button.dataset.typeName;
                pokemon.teraType = typeName;
                renderCurrentTeam();
                dom.teraTypeModal.classList.add('hidden');
                showNotification(`Set ${formatDisplayName(pokemon.name)}'s Tera Type to ${formatDisplayName(typeName)}!`, 'success');
            });
        });
    }

    async function openNatureModal(pokemonIndex) {
        const pokemon = currentTeam[pokemonIndex];
        dom.natureModalTitle.textContent = `Select Nature for ${formatDisplayName(pokemon.name)}`;
        dom.natureModalContent.innerHTML = '';
        dom.natureModal.classList.remove('hidden');

        const naturesHtml = allNatures.map(nature => {
            const natureDetails = nature.increased_stat ? `(+${statShortNames[nature.increased_stat.name]}, -${statShortNames[nature.decreased_stat.name]})` : '(Neutral)';
            return `
                <button class="nature-choice p-2 border-b border-tertiary-bg flex justify-between items-center cursor-pointer hover:bg-tertiary-bg w-full text-left" data-nature-name="${nature.name}">
                    <span class="font-semibold">${formatDisplayName(nature.name)}</span>
                    <span class="text-xs text-text-dark">${natureDetails}</span>
                </button>`;
        }).join('');

        dom.natureModalContent.innerHTML = `<div class="h-full">${naturesHtml}</div>`;

        dom.natureModalContent.querySelectorAll('.nature-choice').forEach(button => {
            button.addEventListener('click', async () => {
                pokemon.assignedNature = await fetchFromApi(`nature/${button.dataset.natureName}`);
                renderCurrentTeam(); // Re-render to update all final stats
                dom.natureModal.classList.add('hidden');
            });
        });
    }

    async function showMoveDetails(moveName) {
        try {
            const moveData = await fetchFromApi(`move/${moveName}`);
            dom.moveModalName.textContent = formatDisplayName(moveData.name);
            const effect = moveData.effect_entries.find(e => e.language.name === 'en')?.short_effect.replace('$effect_chance', moveData.effect_chance) || 'No description.';

            dom.moveModalContent.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <span class="type-icon type-${moveData.type.name}">${moveData.type.name.slice(0, 3)}</span>
                    <span class="px-3 py-1 rounded-full text-sm font-semibold capitalize shadow-md bg-black/20">${moveData.damage_class.name}</span>
                </div>
                <div class="grid grid-cols-3 text-center gap-2 mb-4">
                    <div><div class="text-xs text-gray-400">Power</div><div class="font-bold text-lg">${moveData.power || '—'}</div></div>
                    <div><div class="text-xs text-gray-400">Accuracy</div><div class="font-bold text-lg">${moveData.accuracy || '—'}</div></div>
                    <div><div class="text-xs text-gray-400">PP</div><div class="font-bold text-lg">${moveData.pp}</div></div>
                </div>
                <p class="text-sm text-gray-300">${effect}</p>
            `;
            dom.moveDetailsModal.classList.remove('hidden');
        } catch (error) {
            showNotification('Could not fetch move details.', 'error');
        }
    }

    async function generateMoveset(e, index) {
        e.stopPropagation();
        const pokemon = currentTeam[index];
        showNotification(`Generating moves for ${formatDisplayName(pokemon.name)}...`, 'info');
        const availableMoves = pokemon.moves.map(m => m.move);
        const chosenMoves = new Set();
        if (availableMoves.length <= 4) {
            pokemon.assignedMoves = await Promise.all(availableMoves.map(m => fetchFromApi(m.url.split('/v2/')[1])));
        } else {
            while (chosenMoves.size < 4) {
                chosenMoves.add(availableMoves[Math.floor(Math.random() * availableMoves.length)]);
            }
            pokemon.assignedMoves = await Promise.all([...chosenMoves].map(m => fetchFromApi(m.url.split('/v2/')[1])));
        }
        renderCurrentTeam();
    }

    /**
     * Shuffles an array in place using the Fisher-Yates algorithm.
     * @param {Array} array The array to shuffle.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async function generateRandomTeam() {
        if (!(await showConfirmation("This will clear your current team and generate a new random one. Continue?"))) {
            return;
        }

        showNotification('Generating a random team...', 'info');
        if (dom.randomTeamBtn) {
            dom.randomTeamBtn.disabled = true;
            dom.randomTeamBtn.textContent = 'Building...';
        }

        try {
            // Use a simplified form data to get a standard pool of Pokémon
            const randomTeamFormData = new FormData();
            randomTeamFormData.append('evolution-stage', 'fully-evolved');
            // Fetch a large pool of standard, fully-evolved Pokémon
            const pokemonPoolUrls = await getFilteredPokemonList(randomTeamFormData);
            if (pokemonPoolUrls.length < MAX_TEAM_SIZE) {
                throw new Error("Not enough Pokémon in the pool to generate a full team.");
            }

            // Shuffle the pool and take the first 6 for true randomness
            shuffleArray(pokemonPoolUrls);
            const chosenUrls = pokemonPoolUrls.slice(0, MAX_TEAM_SIZE);

            const pokemonPromises = chosenUrls.map(async (url) => {
                const pokemonData = await fetchFromApi(url.split('/v2/')[1]);
                // Assign random ability
                const randomAbilityInfo = pokemonData.abilities[Math.floor(Math.random() * pokemonData.abilities.length)];
                pokemonData.assignedAbility = await fetchFromApi(randomAbilityInfo.ability.url.split('/v2/')[1]);
                // Assign random nature
                // Assign Tera Type
                pokemonData.teraType = pokemonData.types[Math.floor(Math.random() * pokemonData.types.length)].type.name;
                const natures = (await fetchFromApi('nature?limit=25')).results;
                // Assign default EVs/IVs
                pokemonData.evs = { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
                pokemonData.ivs = { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 };
                pokemonData.isShiny = false;
                pokemonData.assignedNature = natures[Math.floor(Math.random() * natures.length)];
                // Assign random moves
                const availableMoves = pokemonData.moves.map(m => m.move);
                const chosenMoves = new Set();
                while (chosenMoves.size < 4 && chosenMoves.size < availableMoves.length) {
                    chosenMoves.add(availableMoves[Math.floor(Math.random() * availableMoves.length)]);
                }
                pokemonData.assignedMoves = await Promise.all([...chosenMoves].map(m => fetchFromApi(m.url.split('/v2/')[1])));
                return pokemonData;
            });

            currentTeam = await Promise.all(pokemonPromises);
            renderCurrentTeam();
            setupAbilityReroller();
            showNotification('Random team generated!', 'success');
        } catch (error) {
            showNotification(`Failed to generate team: ${error.message}`, 'error');
            console.error(error);
        } finally {
            if (dom.randomTeamBtn) {
                dom.randomTeamBtn.disabled = false;
                dom.randomTeamBtn.textContent = 'Random Team';
            }
        }
    }

    function removeTeamMember(e, index) {
        e.stopPropagation();
        const pokemonName = formatDisplayName(currentTeam[index].name);
        currentTeam.splice(index, 1);
        showNotification(`${pokemonName} removed from team.`, 'info');
        renderCurrentTeam();
        setupAbilityReroller();
    }

    async function clearCurrentTeam() {
        if (currentTeam.length === 0) return;
        if (await showConfirmation("Are you sure you want to clear your current team?")) {
            currentTeam = [];
            renderCurrentTeam();
            setupAbilityReroller();
            showNotification("Team cleared.", 'info');
        }
    }

    async function saveCurrentTeam() {
        const teamName = dom.teamNameInput.value.trim();
        if (!teamName) return showNotification("Please enter a team name.", 'error');
        if (currentTeam.length === 0) return showNotification("Add Pokémon to your team before saving.", 'error');
        const savedTeams = JSON.parse(localStorage.getItem('pokemonTeamsV4') || '[]'); // Use a new key for the new format
        const teamToSave = {
            name: teamName,
            pokemon: currentTeam.map(p => ({
                id: p.id,
                isShiny: p.isShiny,
                ability: p.assignedAbility?.name,
                nickname: p.nickname,
                item: p.assignedItem?.name,
                moves: p.assignedMoves.map(m => m.name),
                nature: p.assignedNature?.name,
                teraType: p.teraType,
                evs: p.evs, ivs: p.ivs
            }))
        };
        const existingIndex = savedTeams.findIndex(t => t.name === teamName);
        if (existingIndex > -1) {
            if (!(await showConfirmation(`A team named "${teamName}" already exists. Overwrite it?`))) return;
            savedTeams[existingIndex] = teamToSave;
        } else {
            savedTeams.push(teamToSave);
        }
        localStorage.setItem('pokemonTeamsV4', JSON.stringify(savedTeams));
        dom.teamNameInput.value = '';
        showNotification(`Team "${teamName}" saved!`, 'success');
        renderSavedTeams();
    }

    function renderSavedTeams() {
        if (!dom.savedTeamsList) return;
        let savedTeams = JSON.parse(localStorage.getItem('pokemonTeamsV4') || '[]');
        if (savedTeams.length === 0) {
            dom.savedTeamsList.innerHTML = `<p class="text-center text-sm text-gray-500">No saved teams.</p>`;
            return;
        }
        dom.savedTeamsList.innerHTML = '';
        savedTeams.forEach((team, index) => {
            const item = document.createElement('div');
            item.className = 'bg-tertiary-bg p-2 rounded flex justify-between items-center';
            item.innerHTML = `<span>${team.name}</span><div><button class="load-btn p-1" data-index="${index}" title="Load">📥</button><button class="delete-btn p-1" data-index="${index}" title="Delete">🗑️</button></div>`;
            item.querySelector('.load-btn').addEventListener('click', (e) => loadTeam(e, index));
            item.querySelector('.delete-btn').addEventListener('click', (e) => deleteTeam(e, index));
            dom.savedTeamsList.appendChild(item);
        });
    }

    async function loadTeam(e, index) {
        e.stopPropagation();
        const savedTeams = JSON.parse(localStorage.getItem('pokemonTeamsV4') || '[]');
        const team = savedTeams[index];
        if (!team) return;
        try {
            showNotification(`Loading team "${team.name}"...`, 'info');
            const pokemonPromises = team.pokemon.map(async (p) => {
                const pokemonData = await fetchFromApi(`pokemon/${p.id}`);
                pokemonData.assignedAbility = p.ability ? await fetchFromApi(`ability/${p.ability}`) : null;
                pokemonData.assignedItem = p.item ? await fetchFromApi(`item/${p.item}`) : null;
                pokemonData.assignedMoves = p.moves ? await Promise.all(p.moves.map(m => fetchFromApi(`move/${m}`))) : [];
                pokemonData.assignedNature = p.nature ? await fetchFromApi(`nature/${p.nature}`) : null;
                pokemonData.nickname = p.nickname || '';
                pokemonData.teraType = p.teraType || pokemonData.types[0].type.name; // Fallback for older saved teams
                pokemonData.isShiny = p.isShiny || false;
                pokemonData.evs = p.evs || { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
                pokemonData.ivs = p.ivs || { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 };
                return pokemonData;
            });
            currentTeam = await Promise.all(pokemonPromises);
            renderCurrentTeam();
            setupAbilityReroller();
            showNotification(`Team "${team.name}" loaded!`, 'success');
        } catch (error) {
            showNotification('Failed to load team.', 'error');
            console.error(error);
        }
    }

    async function deleteTeam(e, index) {
        e.stopPropagation();
        const savedTeams = JSON.parse(localStorage.getItem('pokemonTeamsV4') || '[]');
        const teamName = savedTeams[index].name;
        if (await showConfirmation(`Are you sure you want to delete the team "${teamName}"?`)) {
            savedTeams.splice(index, 1);
            localStorage.setItem('pokemonTeamsV4', JSON.stringify(savedTeams));
            showNotification(`Team "${teamName}" deleted.`, 'info');
            renderSavedTeams();
        }
    }

    function openExportModal() {
        if (currentTeam.length === 0) return showNotification('Add Pokémon to your team to export.', 'error');
        let exportString = '';
        currentTeam.forEach(p => { // Use nickname if it exists
            exportString += `${formatForShowdown(p.name, 'pokemon')} ${p.isShiny ? '(Shiny) ' : ''}${p.assignedItem ? '@ ' + formatForShowdown(p.assignedItem.name, 'item') : ''}\n`;
            if (p.assignedAbility) exportString += `Ability: ${formatForShowdown(p.assignedAbility.name, 'ability')}\n`;
            if (p.assignedNature) exportString += `${formatForShowdown(p.assignedNature.name, 'nature')} Nature\n`;
            if (p.teraType) exportString += `Tera Type: ${formatForShowdown(p.teraType, 'type')}\n`;

            const evsString = Object.entries(p.evs)
                .filter(([_, val]) => val > 0)
                .map(([stat, val]) => `${val} ${statShortNames[stat]}`)
                .join(' / ');
            if (evsString) exportString += `EVs: ${evsString}\n`;

            const ivsString = Object.entries(p.ivs)
                .filter(([_, val]) => val < 31)
                .map(([stat, val]) => `${val} ${statShortNames[stat]}`)
                .join(' / ');
            if (ivsString) exportString += `IVs: ${ivsString}\n`;

            if (p.assignedMoves.length > 0) { p.assignedMoves.forEach(m => { exportString += `- ${formatForShowdown(m.name, 'move')}\n`; }); }
            exportString += '\n';
        });
        dom.exportTextarea.value = exportString.trim();
        dom.teamExportModal.classList.remove('hidden');
    }

    function copyTeamToClipboard() {
        dom.exportTextarea.select();
        document.execCommand('copy');
        showNotification('Team copied to clipboard!', 'success');
    }

    function findBestMatch(query, list, maxDistance = 2) {
        if (!query || list.length === 0) return null;
        const matches = list
            .map(item => ({ name: item, distance: levenshteinDistance(query, item) }))
            .filter(item => item.distance <= maxDistance)
            .sort((a, b) => a.distance - b.distance);
        return matches.length > 0 ? matches[0].name : null;
    }

    async function handleTeamImport() {
        const importText = dom.importTextarea.value.trim();
        if (!importText) return showNotification('Paste a team to import.', 'error');

        if (currentTeam.length > 0) {
            if (!(await showConfirmation("This will overwrite your current team. Continue?"))) return;
        }

        showNotification('Importing team...', 'info');
        dom.importTeamBtn.disabled = true;
        dom.importTeamBtn.textContent = 'Importing...';

        try {
            const allNatures = (await fetchFromApi('nature?limit=25')).results.map(n => n.name);
            const importedPokemon = [];
            const pokemonBlocks = importText.split('\n\n');

            for (const block of pokemonBlocks) {
                if (importedPokemon.length >= MAX_TEAM_SIZE) break;
                const lines = block.trim().split('\n');
                if (lines.length === 0) continue;

                // --- AI-Powered Regex Parsing ---
                const fullBlockText = lines.join('\n');

                // Regex to find name and potentially item
                const nameAndItemRegex = /^(?:(.+?)\s)?(\(Shiny\)\s*)?(?:@\s*(.+))?$/;
                const nameLineMatch = lines[0].trim().match(nameAndItemRegex);
                if (!nameLineMatch || !nameLineMatch[1]) continue;

                let pokemonName = nameLineMatch[1].trim().toLowerCase().replace(/ /g, '-').replace(/'/g, '').replace(/[.♀♂]/g, '');
                const isShiny = !!nameLineMatch[2];
                const itemNameFromLine = nameLineMatch[3]?.trim();

                let pokemonData;
                try {
                    pokemonData = await fetchFromApi(`pokemon/${pokemonName}`);
                } catch (e) {
                    showNotification(`Could not find "${pokemonName}". Trying to find a match...`, 'info');
                    const bestMatch = findBestMatch(pokemonName, allPokemonNames);
                    if (bestMatch) {
                        pokemonName = bestMatch;
                        pokemonData = await fetchFromApi(`pokemon/${pokemonName}`);
                        showNotification(`Using "${formatDisplayName(pokemonName)}" instead.`, 'success');
                    } else {
                        throw new Error(`Could not find a close match for "${pokemonName}".`);
                    }
                }

                pokemonData.assignedAbility = null;
                pokemonData.assignedItem = null;
                pokemonData.assignedMoves = [];
                pokemonData.assignedNature = null;
                pokemonData.teraType = pokemonData.types[0].type.name;
                pokemonData.nickname = ''; // Nickname is not part of standard Showdown format
                pokemonData.evs = { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
                pokemonData.isShiny = isShiny;
                pokemonData.ivs = { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 };

                // Ability
                const abilityMatch = fullBlockText.match(/Ability:\s*(.+)/i);
                if (abilityMatch) {
                    pokemonData.assignedAbility = await fetchFromApi(`ability/${abilityMatch[1].trim().toLowerCase().replace(/ /g, '-')}`);
                }

                // Item (from name line or 'Item:' line)
                const itemMatch = fullBlockText.match(/Item:\s*(.+)/i);
                const itemName = itemNameFromLine || (itemMatch ? itemMatch[1].trim() : null);
                if (itemName) {
                    pokemonData.assignedItem = await fetchFromApi(`item/${itemName.toLowerCase().replace(/ /g, '-')}`);
                }

                // Tera Type
                const teraMatch = fullBlockText.match(/Tera Type:\s*(.+)/i);
                if (teraMatch) {
                    pokemonData.teraType = teraMatch[1].trim().toLowerCase();
                }

                // Nature
                const natureMatch = fullBlockText.match(new RegExp(`^(${allNatures.join('|')})\\s+Nature`, 'im'));
                if (natureMatch) {
                    pokemonData.assignedNature = await fetchFromApi(`nature/${natureMatch[1].trim().toLowerCase()}`);
                }

                // EVs
                const evsMatch = fullBlockText.match(/EVs:\s*(.+)/i);
                if (evsMatch) {
                    const evParts = evsMatch[1].split(' / ');
                    const statNameMapping = Object.fromEntries(Object.entries(statShortNames).map(([k, v]) => [v, k]));
                    evParts.forEach(part => {
                        const [val, statName] = part.split(' ');
                        const fullStatName = statNameMapping[statName];
                        if (fullStatName) pokemonData.evs[fullStatName] = parseInt(val);
                    });
                }

                // IVs
                const ivsMatch = fullBlockText.match(/IVs:\s*(.+)/i);
                if (ivsMatch) {
                    // Similar parsing logic as EVs can be added here if needed
                    const ivParts = ivsMatch[1].split(' / ');
                    const statNameMapping = Object.fromEntries(Object.entries(statShortNames).map(([k, v]) => [v, k]));
                    ivParts.forEach(part => {
                        const [val, statName] = part.split(' ');
                        const fullStatName = statNameMapping[statName];
                        if (fullStatName) pokemonData.ivs[fullStatName] = parseInt(val);
                    });
                }


                // Moves
                const moveMatches = fullBlockText.matchAll(/-\s*(.+)/g);
                for (const match of moveMatches) {
                    if (pokemonData.assignedMoves.length < 4) {
                        const moveName = match[1].trim().toLowerCase().replace(/ /g, '-');
                        pokemonData.assignedMoves.push(await fetchFromApi(`move/${moveName}`));
                    }
                }
                importedPokemon.push(pokemonData);
            }
            currentTeam = importedPokemon;
            renderCurrentTeam();
            setupAbilityReroller();
            dom.teamImportModal.classList.add('hidden');
            showNotification('Team imported successfully!', 'success');
        } catch (error) {
            showNotification(`Import failed: ${error.message}. Check format and spelling.`, 'error');
            console.error("Import Error:", error);
        } finally {
            dom.importTeamBtn.disabled = false;
            dom.importTeamBtn.textContent = 'Import';
        }
    }

    function calculateStat(base, iv = 31, ev = 0, level = 100, nature = 1.0) {
        // HP calculation
        if (nature === 'hp') {
            if (base === 1) return 1; // Shedinja case
            return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
        }
        // Other stats calculation
        const statTotal = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
        return Math.floor(statTotal * nature);
    }

    function getNatureMultiplier(nature, statName) {
        if (!nature || !nature.increased_stat) return 1.0;
        if (nature.increased_stat.name === statName) return 1.1;
        if (nature.decreased_stat.name === statName) return 0.9;
        return 1.0;
    }

    async function analyzeTeamCoverage() {
        if (currentTeam.length === 0) return showNotification('Add Pokémon to your team to analyze coverage.', 'error');
        showNotification('Analyzing team coverage...', 'info');
        const allTypes = (await fetchFromApi('type')).results.filter(t => t.name !== 'unknown' && t.name !== 'shadow');
        const allTypeDetails = await Promise.all(allTypes.map(t => fetchFromApi(`type/${t.name}`)));
        const defense = {};
        allTypes.forEach(t => defense[t.name] = { weaknesses: 0, resistances: 0, immunities: 0 });
        const individualDefenses = [];

        const offensiveCoverage = new Set();

        for (const pokemon of currentTeam) {
            const individualMultipliers = await calculateDamageRelations(pokemon.types);
            const pokeTypeDetails = await Promise.all(pokemon.types.map(t => fetchFromApi(`type/${t.type.name}`)));
            // Defensive calculation
            for (const attackingType of allTypeDetails) {
                let multiplier = 1;
                pokeTypeDetails.forEach(defendingType => {
                    if (defendingType.damage_relations.double_damage_from.some(t => t.name === attackingType.name)) multiplier *= 2;
                    if (defendingType.damage_relations.half_damage_from.some(t => t.name === attackingType.name)) multiplier *= 0.5;
                    if (defendingType.damage_relations.no_damage_from.some(t => t.name === attackingType.name)) multiplier *= 0;
                });
                if (multiplier > 1) defense[attackingType.name].weaknesses++;
                if (multiplier < 1) defense[attackingType.name].resistances++;
                if (multiplier === 0) defense[attackingType.name].immunities++;
            }
            // Offensive calculation
            individualDefenses.push({ pokemon, multipliers: individualMultipliers });
            if (!pokemon.assignedMoves || pokemon.assignedMoves.length === 0) continue;
            for (const move of pokemon.assignedMoves) {
                if (move.power > 0 && move.damage_class.name !== 'status') {
                    const moveTypeDetails = await fetchFromApi(`type/${move.type.name}`);
                    moveTypeDetails.damage_relations.double_damage_to.forEach(type => offensiveCoverage.add(type.name));
                }
            }
        }

        // --- AI Analysis & HTML Generation ---
        const aiReport = generateAiAnalysis(defense, offensiveCoverage, allTypes, individualDefenses);
        let coverageHtml = `<div class="bg-tertiary-bg border border-border-color p-4 rounded-lg mb-6"><h4 class="font-bold text-lg mb-2 text-accent">AI Analyst's Report</h4><div class="text-sm space-y-2">${aiReport}</div></div>`;

        // --- Speed Tier Section ---
        const speedTiers = currentTeam.map(pokemon => {
            const baseSpeed = pokemon.stats.find(s => s.stat.name === 'speed').base_stat;
            const natureMod = getNatureMultiplier(pokemon.assignedNature, 'speed');
            let finalSpeed = calculateStat(baseSpeed, pokemon.ivs.speed, pokemon.evs.speed, 100, natureMod);
            let modifiers = [];
            if (pokemon.assignedItem?.name === 'choice-scarf') {
                finalSpeed = Math.floor(finalSpeed * 1.5);
                modifiers.push('Choice Scarf');
            }
            // Add other speed modifiers here (e.g., Tailwind, Paralysis)
            return { name: pokemon.name, speed: finalSpeed, modifiers };
        }).sort((a, b) => b.speed - a.speed);

        coverageHtml += '<div><h4 class="font-bold text-lg mb-2 border-b border-border-color pb-1">Speed Tiers</h4><p class="text-sm text-text-dark mb-4">Your team\'s final speed stats, from fastest to slowest.</p><div class="space-y-2">';
        speedTiers.forEach(tier => {
            coverageHtml += `<div class="flex items-center justify-between p-2 rounded bg-tertiary-bg">
                <span class="font-semibold">${formatDisplayName(tier.name)}</span>
                <div>
                    <span class="font-bold text-lg">${tier.speed}</span>
                    ${tier.modifiers.length > 0 ? `<span class="text-xs ml-2 text-gray-400">(${tier.modifiers.join(', ')})</span>` : ''}
                </div>
            </div>`;
        });
        coverageHtml += '</div></div><hr class="my-6 border-border-color">';

        coverageHtml += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">';

        // --- Defensive Section ---
        coverageHtml += '<div><h4 class="font-bold text-lg mb-2 border-b border-border-color pb-1">Team Defenses</h4><p class="text-sm text-text-dark mb-4">Number of Pokémon weak or resistant to each attacking type.</p><div class="space-y-2">';
        Object.entries(defense).forEach(([typeName, counts]) => {
            if (counts.weaknesses > 0 || counts.resistances > 0 || counts.immunities > 0) {
                coverageHtml += `<div class="flex items-center gap-3 text-sm">
                    <span class="type-icon type-${typeName} flex-shrink-0 w-16 text-center">${typeName.slice(0, 3)}</span>
                    <div class="flex-grow flex items-center gap-4 text-text-light">
                        <div class="text-red-500 w-20" title="${counts.weaknesses} Pokémon are weak to this type.">Weak: <strong>${counts.weaknesses}</strong></div>
                        <div class="text-green-600 w-20" title="${counts.resistances} Pokémon resist this type.">Resist: <strong>${counts.resistances}</strong></div>
                        <div class="text-gray-500 w-20" title="${counts.immunities} Pokémon are immune to this type.">Immune: <strong>${counts.immunities}</strong></div>
                    </div>
                </div>`;
            }
        });
        coverageHtml += '</div></div>';

        // --- Offensive Section ---
        coverageHtml += '<div>';
        coverageHtml += '<h4 class="font-bold text-lg mb-2 border-b border-border-color pb-1">Offensive Coverage</h4><p class="text-sm text-text-dark mb-4">Types your team can hit super-effectively with their current moves.</p><div class="flex flex-wrap gap-2">';
        allTypes.forEach(type => {
            const iconClass = offensiveCoverage.has(type.name) ? `type-${type.name}` : 'bg-tertiary-bg opacity-40';
            coverageHtml += `<span class="type-icon ${iconClass}" title="${capitalize(type.name)}">${type.name.slice(0, 3)}</span>`;
        });
        coverageHtml += '</div>';

        // --- Coverage Gaps Section ---
        const coverageGaps = allTypes.filter(type => !offensiveCoverage.has(type.name));
        if (coverageGaps.length > 0) {
            coverageHtml += '<h4 class="font-bold text-lg mb-2 mt-6 border-b border-border-color pb-1">Offensive Gaps</h4><p class="text-sm text-text-dark mb-4">Types your team CANNOT hit super-effectively.</p><div class="flex flex-wrap gap-2">';
            coverageGaps.forEach(type => {
                coverageHtml += `<span class="type-icon type-${type.name}" title="${capitalize(type.name)}">${type.name.slice(0, 3)}</span>`;
            });
            coverageHtml += '</div>';
        }
        coverageHtml += '</div>'; // Close offensive column

        coverageHtml += '</div>'; // Close grid

        dom.coverageOutput.innerHTML = coverageHtml;
        dom.typeCoverageModal.classList.remove('hidden');
    }

    function generateAiAnalysis(defense, offensiveCoverage, allTypes, individualDefenses) {
        const report = [];
        const teamSize = currentTeam.length;
        const majorWeaknessThreshold = Math.max(2, Math.ceil(teamSize / 2));
        const pivotTypes = ['steel', 'water', 'fairy', 'flying'];

        // --- Defensive Analysis ---
        const majorWeaknesses = Object.entries(defense).filter(([_, counts]) => counts.weaknesses >= majorWeaknessThreshold);
        if (majorWeaknesses.length > 0) {
            const weakTypes = majorWeaknesses.map(([typeName, _]) => `<strong>${capitalize(typeName)}</strong>`).join(', ');
            const suggestion = pivotTypes.find(p => !majorWeaknesses.some(([wt]) => wt === p)) || 'defensive';
            report.push(`<p>🛡️ <strong class="text-red-500">Defensive Concern:</strong> Your team is very susceptible to ${weakTypes}-type attacks. Adding a solid <strong>${capitalize(suggestion)}</strong>-type pivot could greatly improve your resilience.</p>`);
        }

        const quadWeaknesses = [];
        individualDefenses.forEach(({ pokemon, multipliers }) => {
            for (const [type, multiplier] of Object.entries(multipliers)) {
                if (multiplier === 4) {
                    quadWeaknesses.push(`<li><strong>${formatDisplayName(pokemon.name)}</strong> has a 4x weakness to <strong>${capitalize(type)}</strong> attacks. A held item like a resistance Berry or a well-timed Tera could be crucial.</li>`);
                }
            }
        });

        if (quadWeaknesses.length > 0) {
            report.push(`<p class="text-yellow-500">⚠️ <strong>Critical Weaknesses Identified:</strong></p><ul class="list-disc list-inside pl-4 text-sm">${quadWeaknesses.join('')}</ul>`);
        }

        const keyImmunities = ['ground', 'dragon', 'fighting', 'ghost'];
        const immunitiesFound = Object.entries(defense)
            .filter(([_, counts]) => counts.immunities > 0 && keyImmunities.includes(_))
            .map(([typeName, _]) => `<strong>${capitalize(typeName)}</strong>`);

        if (immunitiesFound.length > 0) {
            report.push(`<p>✅ <strong class="text-green-600">Defensive Core:</strong> Your team's immunity to common ${immunitiesFound.join(', ')} attacks provides a strong defensive backbone. Use these Pokémon to switch in and absorb predicted hits.</p>`);
        }

        // --- Offensive Analysis ---
        const coverageGaps = allTypes.filter(type => !offensiveCoverage.has(type.name));
        if (coverageGaps.length > 2) {
            const gapTypes = coverageGaps.slice(0, 3).map(t => `<strong>${capitalize(t.name)}</strong>`).join(', ');
            const suggestionType = coverageGaps[0].name === 'normal' ? 'Fighting' : (coverageGaps[0].name === 'steel' ? 'Fire or Ground' : 'a coverage');
            report.push(`<p>⚔️ <strong class="text-yellow-500">Coverage Blind Spot:</strong> Your team struggles to effectively damage key types like ${gapTypes}. You may get walled by common defensive Pokémon. Consider adding a strong ${suggestionType} move to one of your attackers.</p>`);
        } else if (coverageGaps.length > 0) {
            const gapTypes = coverageGaps.map(t => `<strong>${capitalize(t.name)}</strong>`).join(', ');
            report.push(`<p>⚔️ <strong class="text-yellow-500">Minor Offensive Gap:</strong> Your team lacks super-effective coverage against ${gapTypes} Pokémon. This is a minor issue but could be optimized.</p>`);
        } else {
            report.push(`<p>🏆 <strong class="text-green-600">Perfect Offensive Coverage:</strong> Your team's moves can hit every Pokémon type for at least neutral damage. Excellent teambuilding!</p>`);
        }

        if (report.length === 0) {
            return '<p>Your team appears to be well-balanced both offensively and defensively. No major flaws detected!</p>';
        }
        return report.join('');
    }

    function handleCardTabSwitch(e, cardContainer) {
        const targetId = e.currentTarget.dataset.target;
        cardContainer.querySelectorAll('.card-back-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');

        cardContainer.querySelectorAll('.card-back-content').forEach(c => c.classList.remove('active'));
        cardContainer.querySelector(`#${targetId}`).classList.add('active');
    }

    function renderStatsChart(pokemonData, canvasElement) {
        if (!canvasElement) return;
        // If a chart instance already exists, destroy it before creating a new one.
        if (canvasElement.chart) {
            canvasElement.chart.destroy();
        }

        const statValues = pokemonData.stats.map(s => s.base_stat);
        const statLabels = pokemonData.stats.map(s => statShortNames[s.stat.name]);

        const chart = new Chart(canvasElement, {
            type: 'radar',
            data: {
                labels: statLabels,
                datasets: [{
                    label: 'Base Stats',
                    data: statValues,
                    backgroundColor: 'rgba(230, 57, 70, 0.2)',
                    borderColor: 'rgba(230, 57, 70, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(230, 57, 70, 1)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        pointLabels: { font: { size: 12, weight: 'bold' }, color: '#495057' },
                        ticks: { backdropColor: 'rgba(255, 255, 255, 0.75)', color: '#6c757d', stepSize: 50 },
                        min: 0,
                        max: 200,
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
        canvasElement.chart = chart; // Mark the canvas as having a chart instance
    }

    // --- POKEDEX ---
    async function handlePokedexSearch(e) {
        e.preventDefault();
        const query = dom.pokedexSearch.value.trim().toLowerCase().replace(/\s+/g, '-');
        if (!query) return;

        dom.pokedexCardContainer.innerHTML = `<p class="text-center col-span-full">Searching for Pokémon matching "${query}"...</p>`;
        if (dom.evolutionChainContainer) dom.evolutionChainContainer.innerHTML = '';
        try {
            const allMatches = allPokemonNames.filter(name => name.includes(query));
            if (allMatches.length === 0) throw new Error(`No Pokémon found matching "${query}".`);

            const matchesToDisplay = allMatches.slice(0, 60);
            if (allMatches.length > 60) {
                showNotification(`Showing the first 60 of ${allMatches.length} matches.`, 'info');
            }

            const pokemonPromises = matchesToDisplay.map(async (name) => {
                const pokemonData = await fetchFromApi(`pokemon/${name}`);
                const speciesData = await fetchFromApi(pokemonData.species.url.split('/v2/')[1]);
                return createPokemonCard(pokemonData, speciesData, false);
            });

            const cards = await Promise.all(pokemonPromises);

            if (cards.length === 1) {
                dom.pokedexCardContainer.innerHTML = '';
                dom.pokedexCardContainer.className = '';
                dom.pokedexCardContainer.appendChild(cards[0]);
                const singlePokemonData = await fetchFromApi(`pokemon/${matchesToDisplay[0]}`);
                const singlePokemonSpecies = await fetchFromApi(singlePokemonData.species.url.split('/v2/')[1]);
                if (singlePokemonSpecies.evolution_chain?.url) {
                    await displayEvolutionChain(singlePokemonSpecies.evolution_chain.url);
                }
            } else {
                dom.pokedexCardContainer.innerHTML = '';
                dom.pokedexCardContainer.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 w-full place-items-center';
                cards.forEach((card, index) => {
                    card.addEventListener('dblclick', () => {
                        dom.pokedexSearch.value = matchesToDisplay[index];
                        handlePokedexSearch(new Event('submit'));
                    });
                    dom.pokedexCardContainer.appendChild(card);
                });
            }

        } catch (error) {
            const suggestions = getSearchSuggestions(query, 3, 5);
            let suggestionsHtml = '';
            if (suggestions.length > 0) {
                suggestionsHtml = `<p class="mt-4 text-sm text-gray-400">Did you mean:</p><div class="flex gap-2 justify-center mt-2">${suggestions.map(s => `<button class="pokedex-suggestion-btn p-2 bg-tertiary-bg rounded hover:bg-accent">${formatDisplayName(s.name)}</button>`).join('')}</div>`;
                dom.pokedexCardContainer.innerHTML = `<div class="text-center placeholder p-8 col-span-full"><p class="text-red-500 font-bold">${error.message}</p>${suggestionsHtml}</div>`;

                document.querySelectorAll('.pokedex-suggestion-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        dom.pokedexSearch.value = btn.textContent;
                        handlePokedexSearch(new Event('submit'));
                    });
                });
            } else {
                dom.pokedexCardContainer.innerHTML = `<div class="text-center placeholder p-8 col-span-full"><p class="text-red-500 font-bold">${error.message}</p></div>`;
            }
        } finally {
            if (window.innerWidth < 768) closeSidebar();
        }
    }

    async function displayEvolutionChain(evoChainUrl) {
        if (!dom.evolutionChainContainer) return;
        dom.evolutionChainContainer.innerHTML = `<h3 class="text-2xl font-bold text-center mb-4">Evolution Chain</h3>`;
        const evoChainData = await fetchFromApi(evoChainUrl.split('/v2/')[1]);

        const chainContainer = document.createElement('div');
        chainContainer.className = 'flex justify-center items-center gap-2 md:gap-4 flex-wrap';

        let currentStage = evoChainData.chain;
        let isFirst = true;

        while (currentStage) {
            if (!isFirst) {
                chainContainer.innerHTML += `<div class="text-2xl font-bold text-gray-500 mx-2">→</div>`;
            }

            const speciesData = await fetchFromApi(currentStage.species.url.split('/v2/')[1]);
            const pokemonData = await fetchFromApi(`pokemon/${speciesData.id}`);

            const stageContainer = document.createElement('div');
            stageContainer.className = 'flex flex-col items-center gap-1 evo-stage-btn cursor-pointer p-2 rounded-lg hover:bg-tertiary-bg';
            stageContainer.dataset.name = currentStage.species.name;
            stageContainer.innerHTML = `
                <img src="${pokemonData.sprites.front_default}" alt="${currentStage.species.name}" class="w-24 h-24" style="image-rendering: pixelated;">
                <span class="text-sm font-semibold">${formatDisplayName(currentStage.species.name)}</span>
            `;
            stageContainer.addEventListener('click', () => {
                dom.pokedexSearch.value = stageContainer.dataset.name;
                handlePokedexSearch(new Event('submit'));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            chainContainer.appendChild(stageContainer);

            currentStage = currentStage.evolves_to[0];
            isFirst = false;
        }
        dom.evolutionChainContainer.appendChild(chainContainer);
    }

    async function calculateDamageRelations(types) {
        const allTypeNames = (await fetchFromApi('type')).results.map(t => t.name).filter(t => t !== 'unknown' && t.name !== 'shadow');
        const damageMultipliers = {};
        allTypeNames.forEach(t => damageMultipliers[t] = 1);

        const typeDetails = await Promise.all(types.map(t => fetchFromApi(`type/${t.type.name}`)));

        for (const attackingType of allTypeNames) {
            let finalMultiplier = 1;
            for (const defendingType of typeDetails) {
                if (defendingType.damage_relations.double_damage_from.some(t => t.name === attackingType)) finalMultiplier *= 2;
                if (defendingType.damage_relations.half_damage_from.some(t => t.name === attackingType)) finalMultiplier *= 0.5;
                if (defendingType.damage_relations.no_damage_from.some(t => t.name === attackingType)) finalMultiplier *= 0;
            }
            damageMultipliers[attackingType] = finalMultiplier;
        }
        return damageMultipliers;
    }

    // --- ABILITY REROLLER ---
    function setupAbilityReroller() {
        if (!dom.abilityRerollerContent) return;
        dom.abilityRerollerContent.innerHTML = '';
        dom.abilityResultOutput.innerHTML = '';

        if (currentTeam.length === 0) {
            dom.abilityRerollerContent.innerHTML = '<p class="text-sm text-gray-400">Add Pokémon to your team to use the reroller.</p>';
            dom.rerollAbilityBtn.disabled = true;
            if (dom.abilityCountInput) dom.abilityCountInput.disabled = true;
            return;
        }

        if (dom.rerollAbilityBtn) dom.rerollAbilityBtn.disabled = false;
        if (dom.abilityCountInput) dom.abilityCountInput.disabled = false;
        const selectLabel = document.createElement('label');
        selectLabel.htmlFor = 'reroll-pokemon-select';
        selectLabel.textContent = 'Select Pokémon';
        selectLabel.className = 'font-bold mb-2 block';

        const select = document.createElement('select');
        select.id = 'reroll-pokemon-select';
        select.className = 'w-full bg-primary-bg border border-border-color rounded p-2 mb-4';
        currentTeam.forEach((pokemon, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = formatDisplayName(pokemon.name);
            select.appendChild(option);
        });
        dom.abilityRerollerContent.appendChild(selectLabel);
        dom.abilityRerollerContent.appendChild(select);
    }

    async function handleAbilityReroll() {
        const select = document.getElementById('reroll-pokemon-select');
        if (!select) return;

        const pokemonIndex = select.value;
        const pokemon = currentTeam[pokemonIndex];
        if (!pokemon) return;

        const count = parseInt(dom.abilityCountInput.value) || 1;

        dom.rerollAbilityBtn.disabled = true;
        dom.rerollAbilityBtn.textContent = 'Rerolling...';
        dom.abilityResultOutput.innerHTML = '<p class="text-center">Searching for new abilities...</p>';

        try {
            const allAbilities = (await fetchFromApi('ability?limit=400')).results;
            const filteredAbilities = allAbilities; // Removed the non-battle abilities filter

            dom.abilityResultOutput.innerHTML = '';
            const resultsFragment = document.createDocumentFragment();

            const chosenAbilities = new Set();
            while (chosenAbilities.size < count && chosenAbilities.size < filteredAbilities.length) {
                chosenAbilities.add(filteredAbilities[Math.floor(Math.random() * filteredAbilities.length)]);
            }

            const abilityDataPromises = [...chosenAbilities].map(abilityInfo => fetchFromApi(abilityInfo.url.split('/v2/')[1]));
            const abilitiesData = await Promise.all(abilityDataPromises);

            for (const abilityData of abilitiesData) {
                const card = createGenericCard(abilityData, 'ability');
                // The generic card function adds assign functionality by default.
                // We need to replace it with our specific button for this context.
                card.innerHTML = ''; // Clear the default card content.
                const abilityEffect = abilityData.effect_entries.find(e => e.language.name === 'en')?.short_effect || 'No effect description.';
                card.innerHTML = `<div class="text-center"><h3 class="font-bold">${formatDisplayName(abilityData.name)}</h3></div><p class="text-sm text-gray-400 mt-2">${abilityEffect}</p>`;


                const assignBtn = document.createElement('button');
                assignBtn.textContent = `Assign to ${formatDisplayName(pokemon.name)}`;
                assignBtn.className = 'w-full p-2 mt-4 bg-accent rounded text-white font-bold hover:bg-accent-dark transition-colors';
                assignBtn.onclick = () => {
                    pokemon.assignedAbility = abilityData;
                    renderCurrentTeam();
                    showNotification(`Gave ${capitalize(pokemon.name)} the ${capitalize(abilityData.name)} ability!`, 'success');
                    dom.abilityResultOutput.innerHTML = `<p class="text-center text-green-400">Assigned!</p>`;
                };
                card.appendChild(assignBtn);
                resultsFragment.appendChild(card);
            }
            dom.abilityResultOutput.appendChild(resultsFragment);

        } catch (error) {
            dom.abilityResultOutput.innerHTML = `<p class="text-red-400 text-center">Could not fetch new abilities.</p>`;
            console.error(error);
        } finally {
            dom.rerollAbilityBtn.disabled = false;
            dom.rerollAbilityBtn.textContent = 'Reroll Ability';
        }
    }


    // --- GENERIC GENERATORS ---
    async function handleGenericGenerator(e, type) {
        e.preventDefault();
        const form = e.currentTarget;
        const formId = form.id;
        const btns = document.querySelectorAll(`button[type="submit"][form="${formId}"]`);
        const countInput = form.querySelector('input[type="number"]');
        const count = parseInt(countInput.value) || 1;
        const resultOutputEl = document.getElementById(`${type}-result-output`);

        if (!resultOutputEl) {
            console.error(`Result output for type "${type}" not found.`);
            return;
        }

        btns.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Searching...';
        });

        resultOutputEl.innerHTML = '';
        try {
            const listEndpointMap = { ability: 'ability?limit=367', item: 'item?limit=2110', move: 'move?limit=1000', nature: 'nature?limit=25' };
            let allResults;
            if (type === 'move') {
                allResults = allMoves;
            } else {
                allResults = (await fetchFromApi(listEndpointMap[type])).results;
            }

            let filteredResults = allResults;

            if (type === 'item') {
                const itemDetails = await Promise.all(allResults.map(i => fetchFromApi(i.url.split('/v2/')[1])));
                filteredResults = itemDetails.filter(i => i.attributes.some(a => a.name === 'holdable')).map(i => ({ name: i.name, url: i.url }));
            }
            if (type === 'move') {
                const typeFilter = form.querySelector('#move-type-filter').value;
                const categoryFilter = form.querySelector('#move-category-filter').value;
                if (typeFilter) filteredResults = filteredResults.filter(m => m.type.name === typeFilter);
                if (categoryFilter) filteredResults = filteredResults.filter(m => m.damage_class.name === categoryFilter);
            }
            if (type === 'nature') {
                const boostFilter = form.querySelector('#nature-boost-filter').value;
                const lowerFilter = form.querySelector('#nature-lower-filter').value;
                if (boostFilter) filteredResults = filteredResults.filter(n => n.increased_stat?.name === boostFilter);
                if (lowerFilter) filteredResults = filteredResults.filter(n => n.decreased_stat?.name === lowerFilter);
            }
            let detailsArr;
            if (type === 'move') {
                // OPTIMIZATION: Use pre-cached move data directly instead of re-fetching
                const chosenMoves = new Set();
                while (chosenMoves.size < count && chosenMoves.size < filteredResults.length) {
                    chosenMoves.add(filteredResults[Math.floor(Math.random() * filteredResults.length)]);
                }
                detailsArr = [...chosenMoves];
            } else {
                // Original logic for other types that require fetching
                const chosenUrls = new Set();
                while (chosenUrls.size < count && chosenUrls.size < filteredResults.length) {
                    chosenUrls.add(filteredResults[Math.floor(Math.random() * filteredResults.length)].url);
                }
                const detailPromises = [...chosenUrls].map(url => fetchFromApi(url.split('/v2/')[1]));
                detailsArr = await Promise.all(detailPromises);
            }
            detailsArr.forEach(data => resultOutputEl.appendChild(createGenericCard(data, type)));
        } // <--- Missing closing brace for the 'try' block was here
        catch (error) {
            resultOutputEl.innerHTML = `<p class="text-red-400">Could not fetch ${type}s.</p>`;
            console.error(error);
        } finally {
            btns.forEach(btn => {
                btn.disabled = false;
                btn.textContent = `Generate${type === 'move' ? ' Moves' : ''}`;
            });
            if (window.innerWidth < 768) closeSidebar();
        }
    }

    function createGenericCard(data, type) {
        const card = document.createElement('div');
        card.className = 'bg-secondary-bg rounded-lg shadow-lg p-4 w-full mx-auto';
        switch (type) {
            case 'ability':
                const abilityEffect = data.effect_entries.find(e => e.language.name === 'en')?.short_effect || 'No effect description.';
                card.innerHTML = `<div class="text-center"><h3 class="font-bold">${formatDisplayName(data.name)}</h3></div><p class="text-sm text-gray-400 mt-2">${abilityEffect}</p>`;
                card.classList.add('cursor-pointer', 'hover:ring-2', 'ring-accent');
                card.addEventListener('click', () => openAssignModal(data, type));
                break;
            case 'item':
                const itemEffect = data.effect_entries.find(e => e.language.name === 'en')?.short_effect || 'No effect description.';
                card.innerHTML = `<div class="text-center"><img src="${data.sprites?.default}" class="mx-auto h-12 w-12 mb-2" style="image-rendering: pixelated;" alt="${data.name}"><h3 class="font-bold">${formatDisplayName(data.name)}</h3></div><p class="text-sm text-gray-400 mt-2">${itemEffect}</p>`;
                card.classList.add('cursor-pointer', 'hover:ring-2', 'ring-accent');
                card.addEventListener('click', () => openAssignModal(data, type));
                break;
            case 'move':
                card.innerHTML = `<div class="flex justify-between items-center mb-2"><h3 class="font-bold text-lg">${formatDisplayName(data.name)}</h3><span class="type-icon type-${data.type.name}">${data.type.name.slice(0, 3)}</span></div><div><p class="text-sm">Power: ${data.power || '—'} | Acc: ${data.accuracy || '—'} | PP: ${data.pp}</p><p class="text-xs text-gray-400 mt-1">${data.effect_entries.find(e => e.language.name === 'en')?.short_effect.replace('$effect_chance', data.effect_chance)}</p></div>`;
                break;
            case 'nature':
                card.innerHTML = `<h3 class="font-bold capitalize text-center">${formatDisplayName(data.name)}</h3><p class="text-sm text-center mt-1">${data.increased_stat ? `+${statShortNames[data.increased_stat.name]}, -${statShortNames[data.decreased_stat.name]}` : 'Neutral'}</p>`;
                break;
        }
        return card;
    }

    function openAssignModal(data, type) {
        if (currentTeam.length === 0) return showNotification("Add Pokémon to your team first!", 'error');
        dom.assignModalTitle.textContent = `Assign ${formatDisplayName(data.name)} To...`;
        dom.teamSelectionList.innerHTML = '';
        currentTeam.forEach((pokemon, index) => {
            const item = document.createElement('button');
            item.className = 'team-member-item w-full text-left hover:bg-gray-600 p-2 rounded';
            item.innerHTML = `<div class="flex items-center gap-2 pointer-events-none"><img src="${pokemon.sprites.front_default}" alt="${pokemon.name}"><span>${formatDisplayName(pokemon.name)}</span></div>`;
            item.addEventListener('click', () => {
                if (type === 'ability') currentTeam[index].assignedAbility = data;
                if (type === 'item') currentTeam[index].assignedItem = data;
                renderCurrentTeam();
                dom.assignModal.classList.add('hidden');
                showNotification(`Assigned ${formatDisplayName(data.name)} to ${formatDisplayName(pokemon.name)}!`, 'success');
            });
            dom.teamSelectionList.appendChild(item);
        });
        dom.assignModal.classList.remove('hidden');
    }

    // --- WHO'S THAT POKEMON? ---
    async function beginWtpRound(isContinuation = false) {
        if (window.innerWidth < 768) closeSidebar();
        if (!dom.wtpGameContainer) return;

        if (!isContinuation) {
            wtpScore = 0;
        }
        dom.wtpScoreDisplay.textContent = wtpScore;
        dom.wtpHighScoreDisplay.textContent = wtpHighScore;

        // Hide start screen, show game area
        dom.wtpStartScreen.classList.add('hidden');
        const gameArea = document.getElementById('wtp-game-area');
        gameArea.classList.remove('hidden');
        gameArea.innerHTML = '<p>Loading new Pokémon...</p>';

        let retries = 5;
        while (retries > 0) {
            try {
                const selectedGens = Array.from(document.querySelectorAll('input[name="wtp-gen"]:checked')).map(cb => cb.value);
                const difficulty = document.querySelector('input[name="wtp-difficulty"]:checked').value;

                const pokemonPool = await getWtpPokemonPool(selectedGens);
                if (pokemonPool.length === 0) throw new Error("No Pokémon found for the selected generations.");

                const chosenPokemonInfo = pokemonPool[Math.floor(Math.random() * pokemonPool.length)];

                // --- FIX: Resolve species to a specific variety to handle forms ---
                // 1. Fetch the full species data to get its varieties
                const speciesData = await fetchFromApi(chosenPokemonInfo.url.split('/v2/')[1]);
                // 2. Pick a random variety from that species
                const chosenVariety = speciesData.varieties[Math.floor(Math.random() * speciesData.varieties.length)];

                const wrongAnswers = new Set();
                while (wrongAnswers.size < 3) {
                    const wrong = pokemonPool[Math.floor(Math.random() * pokemonPool.length)];
                    if (wrong.name !== speciesData.name) wrongAnswers.add(wrong.name);
                }
                // 3. Fetch the Pokémon data using the specific variety's name
                const correctPokemon = await fetchFromApi(`pokemon/${chosenVariety.pokemon.name}`);
                // This is a common failure point. If there's no artwork, retry.
                if (!correctPokemon.sprites.other['official-artwork'].front_default) {
                    throw new Error(`No artwork for ${correctPokemon.name}`);
                }

                const options = [...wrongAnswers, correctPokemon.name].sort(() => 0.5 - Math.random());

                dom.wtpGameContainer.innerHTML = `
                    <style>.wtp-sprite { filter: brightness(0); } .wtp-sprite.revealed { filter: none; }</style>
                    <img id="wtp-sprite" src="${correctPokemon.sprites.other['official-artwork'].front_default}" class="h-64 w-64 object-contain mx-auto wtp-sprite transition-all duration-500" draggable="false">
                    <div id="wtp-input-area" class="mt-4 max-w-md mx-auto"></div>
                    <div id="wtp-feedback" class="mt-4 font-bold text-xl text-center h-12"></div>
                `;

                const inputArea = document.getElementById('wtp-input-area');
                if (difficulty === 'easy') {
                    inputArea.innerHTML = `<div id="wtp-options" class="grid grid-cols-2 gap-4">${options.map(opt => `<button data-name="${opt}" class="p-2 bg-tertiary-bg rounded hover:bg-accent">${formatDisplayName(opt)}</button>`).join('')}</div>`;
                    inputArea.querySelectorAll('button').forEach(btn => btn.addEventListener('click', (e) => handleWtpGuess(e.target.dataset.name, correctPokemon.name)));
                } else { // Hard mode
                    inputArea.innerHTML = `<form id="wtp-text-form"><input type="text" id="wtp-text-input" class="w-full text-center" placeholder="Type your guess..." autocomplete="off"><button type="submit" class="hidden">Submit</button></form>`;
                    const form = document.getElementById('wtp-text-form');
                    const input = document.getElementById('wtp-text-input');
                    input.focus();
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        handleWtpGuess(input.value.trim().toLowerCase(), correctPokemon.name);
                    });
                }
                return; // Success, exit the loop
            } catch (e) {
                console.warn(`WTP game failed to start, retrying... (${retries - 1} left). Error:`, e.message);
                retries--;
            }
        }

        // If all retries fail, show an error
        dom.wtpGameContainer.innerHTML = '<p class="text-red-400">Failed to start game. Please try again.</p>';
    }

    async function getWtpPokemonPool(selectedGens) {
        let pool = [];
        if (selectedGens.length === 0) { // If none selected, use all
            return (await fetchFromApi('pokemon-species?limit=1025')).results;
        }
        const genPromises = selectedGens.map(gen => fetchFromApi(`generation/${gen}`));
        const genResults = await Promise.all(genPromises);
        genResults.forEach(genData => {
            pool.push(...genData.pokemon_species);
        });
        return [...new Map(pool.map(item => [item.name, item])).values()]; // Return unique species
    }

    function handleWtpGuess(guess, correctAnswer) {
        const sprite = document.getElementById('wtp-sprite');
        const feedbackEl = document.getElementById('wtp-feedback');
        const inputArea = document.getElementById('wtp-input-area');
        const difficulty = document.querySelector('input[name="wtp-difficulty"]:checked').value;

        sprite.classList.add('revealed');
        let isCorrect = false;

        if (difficulty === 'easy') {
            isCorrect = (guess === correctAnswer);
            inputArea.querySelectorAll('button').forEach(b => {
                b.disabled = true;
                if (b.dataset.name === correctAnswer) b.classList.add('!bg-green-600', 'text-white');
                if (b.dataset.name === guess && !isCorrect) b.classList.add('!bg-red-600', 'text-white');
            });
        } else { // Hard mode
            const distance = levenshteinDistance(guess, correctAnswer);
            isCorrect = (distance <= 2); // Allow for small typos
            const input = document.getElementById('wtp-text-input');
            input.disabled = true;
            input.classList.add(isCorrect ? 'bg-green-600' : 'bg-red-600', 'text-white');
        }

        if (isCorrect) {
            wtpScore++;
            if (wtpScore > wtpHighScore) {
                wtpHighScore = wtpScore;
                localStorage.setItem('wtpHighScore', wtpHighScore);
            }
            dom.wtpScoreDisplay.textContent = wtpScore;
            dom.wtpHighScoreDisplay.textContent = wtpHighScore;
            feedbackEl.innerHTML = `<span class="text-green-400">Correct! It's ${formatDisplayName(correctAnswer)}!</span><button id="wtp-continue" class="ml-4 p-2 text-sm bg-accent rounded">Next</button>`;
            document.getElementById('wtp-continue').addEventListener('click', () => beginWtpRound(true));
            setTimeout(() => document.getElementById('wtp-continue')?.focus(), 100);
        } else {
            feedbackEl.innerHTML = `<span class="text-red-400">Nope, it's ${formatDisplayName(correctAnswer)}!</span><button id="wtp-play-again" class="ml-4 p-2 text-sm bg-accent rounded">Play Again</button>`;
            document.getElementById('wtp-play-again').addEventListener('click', () => {
                // Reset to start screen
                document.getElementById('wtp-game-area').classList.add('hidden');
                document.getElementById('wtp-start-screen').classList.remove('hidden');
            });
            setTimeout(() => document.getElementById('wtp-play-again')?.focus(), 100);
        }
    }
});