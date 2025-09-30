document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE & CACHE ---
    let currentTeam = [];
    const MAX_TEAM_SIZE = 6;
    const SHINY_CHANCE = 1 / 4096;
    const apiCache = new Map();
    const statShortNames = { 'hp': 'HP', 'attack': 'ATK', 'defense': 'DEF', 'special-attack': 'SpA', 'special-defense': 'SpD', 'speed': 'SPD' };
    let wtpScore = 0;
    let allPokemonNames = [];
    let wtpHighScore = parseInt(localStorage.getItem('wtpHighScore')) || 0;

    // --- DOM ELEMENT SELECTORS ---
    const dom = {
        appTabs: document.querySelectorAll('.app-tab'),
        sidebarMain: document.getElementById('sidebar-main'),
        sidebarOverlay: document.getElementById('sidebar-overlay'),
        closeSidebarBtns: document.querySelectorAll('.close-sidebar-btn'),
        notificationContainer: document.getElementById('notification-container'),
        confirmationModal: document.getElementById('confirmation-modal'),
        confirmationMessage: document.getElementById('confirmation-message'),
        confirmYesBtn: document.getElementById('confirm-yes-btn'),
        confirmNoBtn: document.getElementById('confirm-no-btn'),
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
        analyzeTeamBtn: document.getElementById('analyze-team-btn'),
        randomTeamBtn: document.getElementById('random-team-btn'),
        exportTeamBtn: document.getElementById('export-team-btn'),

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
        natureGeneratorForm: document.getElementById('natureGeneratorForm'),

        // Who's That Pokémon?
        wtpNewGameBtn: document.getElementById('wtp-new-game-btn'),
        wtpGameContainer: document.getElementById('wtp-result'),
        wtpScoreDisplay: document.getElementById('wtp-score'),
        wtpHighScoreDisplay: document.getElementById('wtp-high-score'),
    };

    // --- INITIALIZATION ---
    async function initializeApp() {
        await Promise.all([
            fetchFromApi('nature?limit=25'), // Pre-load natures
            fetchFromApi('ability?limit=400'), // Pre-load abilities for reroller
            fetchFromApi('item?limit=2110'), // Pre-load all items
            populateColorFilter(), // Populate the new color filter
            fetchAllPokemonNames() // Pre-load all names for search suggestions
        ]);
        if (dom.savedTeamsList) renderSavedTeams();
        setupEventListeners();
        setupDragAndDrop();
        setupAbilityReroller();
        setupTooltips();
        if (dom.wtpHighScoreDisplay) dom.wtpHighScoreDisplay.textContent = wtpHighScore;
    }
    initializeApp();

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        dom.appTabs.forEach(tab => tab.addEventListener('click', handleTabSwitch));
        dom.sidebarOverlay.addEventListener('click', closeSidebar);
        dom.closeSidebarBtns.forEach(btn => btn.addEventListener('click', closeSidebar));
        window.addEventListener('resize', handleResize);

        // Forms
        if (dom.generatorForm) dom.generatorForm.addEventListener('submit', handleGeneration);
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
        if (dom.copyExportBtn) dom.copyExportBtn.addEventListener('click', copyTeamToClipboard);

        // Modals
        if (dom.closeAssignModalBtn) dom.closeAssignModalBtn.addEventListener('click', () => dom.assignModal.classList.add('hidden'));
        if (dom.closeCoverageModalBtn) dom.closeCoverageModalBtn.addEventListener('click', () => dom.typeCoverageModal.classList.add('hidden'));
        if (dom.closeExportModalBtn) dom.closeExportModalBtn.addEventListener('click', () => dom.teamExportModal.classList.add('hidden'));
        if (dom.closeMoveModalBtn) dom.closeMoveModalBtn.addEventListener('click', () => dom.moveDetailsModal.classList.add('hidden'));
        if (dom.closeManualAbilityModalBtn) dom.closeManualAbilityModalBtn.addEventListener('click', () => dom.manualAbilityModal.classList.add('hidden'));
        if (dom.closeManualItemModalBtn) dom.closeManualItemModalBtn.addEventListener('click', () => dom.manualItemModal.classList.add('hidden'));
        if (dom.closeManualMoveModalBtn) dom.closeManualMoveModalBtn.addEventListener('click', () => dom.manualMoveModal.classList.add('hidden'));

        // WTP Game
        if (dom.wtpNewGameBtn) dom.wtpNewGameBtn.addEventListener('click', () => startWtpGame(false));
    }

    // --- UI & UTILITY FUNCTIONS ---
    const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ') : '';

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
        const speciesList = await fetchFromApi('pokemon-species?limit=1302');
        allPokemonNames = speciesList.results.map(p => p.name);
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
        const colorData = await fetchFromApi('pokemon-color');
        colorData.results.forEach(color => {
            const option = document.createElement('option');
            option.value = color.name;
            option.textContent = capitalize(color.name);
            dom.colorFilterSelect.appendChild(option);
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
            apiCache.set(fullUrl, data);
            try {
                sessionStorage.setItem(fullUrl, JSON.stringify(data));
            } catch (e) {
                // This can happen if storage is full. Clear old items and try again.
                console.warn("Session storage is full. Clearing cache.", e);
                sessionStorage.clear();
                sessionStorage.setItem(fullUrl, JSON.stringify(data));
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

    // --- SIDEBAR & NAVIGATION ---
    function openSidebar() { if (dom.sidebarMain) { dom.sidebarMain.classList.add('open'); dom.sidebarOverlay.classList.add('show'); } }
    function closeSidebar() { if (dom.sidebarMain) { dom.sidebarMain.classList.remove('open'); dom.sidebarOverlay.classList.remove('show'); } }
    function handleTabSwitch(e) {
        const clickedTab = e.currentTarget;
        dom.appTabs.forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sidebar-panel, .main-view').forEach(el => el.classList.remove('active'));
        clickedTab.classList.add('active');
        document.getElementById(clickedTab.dataset.target)?.classList.add('active');
        document.getElementById(clickedTab.dataset.view)?.classList.add('active');
        if (clickedTab.dataset.target === 'ability-generator-panel') {
            setupAbilityReroller();
        }
        if (window.innerWidth < 768) openSidebar();
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
                const card = await createPokemonCard(pokemon, speciesData, false);
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

        // 1. Get Pokémon from selected generations
        let genPokemonNames = new Set();
        if (selectedGens.length > 0) {
            const genPromises = selectedGens.map(gen => fetchFromApi(`generation/${gen}`));
            const genResults = await Promise.all(genPromises);
            genResults.forEach(genData => {
                genData.pokemon_species.forEach(p => genPokemonNames.add(p.name));
            });
        } else {
            // If no generation is selected, we need a list of all pokemon to filter against types
            const allSpecies = (await fetchFromApi('pokemon-species?limit=1025')).results;
            allSpecies.forEach(p => genPokemonNames.add(p.name));
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
        let candidateNames = [];
        if (!allTypesSelected) {
            candidateNames = [...genPokemonNames].filter(name => typePokemonNames.has(name));
        } else {
            candidateNames = [...genPokemonNames];
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
        let pokemonUrls = [];
        allSpeciesData.forEach(s => {
            if (includeForms) {
                s.varieties.forEach(v => {
                    // The API sometimes includes species names instead of full URLs for varieties
                    if (!v.pokemon.url.includes('https')) {
                        pokemonUrls.push(`https://pokeapi.co/api/v2/pokemon/${v.pokemon.name}/`);
                    } else {
                        pokemonUrls.push(v.pokemon.url);
                    }
                });
            } else {
                const defaultVariety = s.varieties.find(v => v.is_default);
                if (defaultVariety) {
                    if (!defaultVariety.pokemon.url.includes('https')) {
                        pokemonUrls.push(`https://pokeapi.co/api/v2/pokemon/${defaultVariety.pokemon.name}/`);
                    } else {
                        pokemonUrls.push(defaultVariety.pokemon.url);
                    }
                }
            }
        });

        return [...new Set(pokemonUrls)]; // Return unique URLs
    }

    async function isPokemonFullyEvolved(speciesData) {
        if (!speciesData || !speciesData.evolution_chain?.url) return true; // Treat no-chain as fully evolved
        const evoChainData = await fetchFromApi(speciesData.evolution_chain.url.split('/v2/')[1]);
        let currentStage = evoChainData.chain;
        while (currentStage?.species.name !== speciesData.name && currentStage?.evolves_to.length > 0) {
            currentStage = currentStage.evolves_to[0];
        }
        return currentStage ? currentStage.evolves_to.length === 0 : true;
    }

    async function createPokemonCard(pokemonData, speciesData, isShinyForced) {
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
                    <p class="text-lg text-text-dark">#${String(pokemonData.id).padStart(4, '0')}</p>
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
        currentTeam.push(pokemonData);
        showNotification(`${formatDisplayName(pokemonData.name)} added to team!`, 'success');
        renderCurrentTeam();
        setupAbilityReroller();
    }

    function renderCurrentTeam() {
        if (!dom.teamBuilderOutput) return;
        dom.teamBuilderOutput.innerHTML = '';
        if (currentTeam.length === 0) {
            dom.teamBuilderOutput.innerHTML = `<p class="text-center text-sm text-gray-500">No Pokémon in team.</p>`;
            return;
        }
        currentTeam.forEach((pokemon, index) => {
            const item = document.createElement('div');
            item.className = 'team-member';
            item.dataset.index = index;
            item.draggable = true;
            const abilityHtml = `<div class="ability-display flex items-center gap-2 cursor-pointer hover:bg-tertiary-bg p-1.5 rounded-md" data-index="${index}"><strong class="text-sm w-16 text-text-dark">Ability</strong><span class="text-sm font-medium capitalize">${pokemon.assignedAbility ? formatDisplayName(pokemon.assignedAbility.name) : 'Select...'}</span></div>`;
            const itemHtml = `<div class="item-display flex items-center gap-2 cursor-pointer hover:bg-tertiary-bg p-1.5 rounded-md" data-index="${index}"><strong class="text-sm w-16 text-text-dark">Item</strong><span class="text-sm font-medium capitalize">${pokemon.assignedItem ? formatDisplayName(pokemon.assignedItem.name) : 'Select...'}</span></div>`;

            let movesHtml = '<div class="mt-3 pt-3 border-t border-border-color"><strong class="text-sm text-text-dark mb-2 block">Moves</strong><div class="grid grid-cols-2 gap-2 text-sm">';
            for (let i = 0; i < 4; i++) {
                const move = pokemon.assignedMoves[i];
                if (move) {
                    movesHtml += `<div class="move-display cursor-pointer hover:underline truncate" data-move-name="${move.name}">- ${formatDisplayName(move.name)}</div>`;
                } else {
                    movesHtml += `<div class="move-display cursor-pointer text-text-dark opacity-60 hover:opacity-100">- (No Move)</div>`;
                }
            }
            movesHtml += '</div></div>';

            item.innerHTML = `
            <div class="flex flex-col items-center gap-2">
                <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" class="flex-shrink-0 w-20 h-20 pointer-events-none bg-tertiary-bg rounded-full">
                <div class="flex gap-1">${pokemon.types.map(t => `<span class="type-icon !w-6 !h-6 !text-[10px]" title="${capitalize(t.type.name)}">${t.type.name.slice(0, 3)}</span>`).join('')}</div>
            </div>
            <div class="flex-grow overflow-hidden">
                <h3 class="font-bold text-xl truncate">${formatDisplayName(pokemon.name)}</h3>
                <div class="space-y-1 mt-2">
                    ${abilityHtml}
                    ${itemHtml}
                </div>
                ${movesHtml}
            </div>
            <div class="flex flex-col items-center flex-shrink-0 space-y-2">
                <button class="action-btn p-1.5 text-lg rounded-full hover:bg-tertiary-bg" data-index="${index}" title="Generate Random Moveset">🪄</button>
                <button class="remove-btn p-1.5 text-lg rounded-full hover:bg-tertiary-bg" data-index="${index}" title="Remove">✖</button>
            </div>`;

            item.querySelector('.action-btn').addEventListener('click', (e) => generateMoveset(e, index));
            item.querySelector('.remove-btn').addEventListener('click', (e) => removeTeamMember(e, index));
            item.querySelectorAll('[data-move-name]').forEach(moveEl => {
                moveEl.addEventListener('click', (e) => showMoveDetails(e.target.dataset.moveName));
            });
            dom.teamBuilderOutput.appendChild(item);
        });
        // Add event listeners for manual selection
        document.querySelectorAll('.team-member').forEach(memberEl => {
            memberEl.addEventListener('click', (e) => {
                // Prevent modal from opening if a button or another interactive element inside was clicked
                if (e.target.closest('button') || e.target.closest('.ability-display') || e.target.closest('.item-display')) return;
                const index = parseInt(memberEl.dataset.index);
                openManualMoveModal(index);
            });
            memberEl.querySelector('.ability-display').addEventListener('click', (e) => { e.stopPropagation(); openManualAbilityModal(parseInt(e.currentTarget.dataset.index)); });
            memberEl.querySelector('.item-display').addEventListener('click', (e) => { e.stopPropagation(); openManualItemModal(parseInt(e.currentTarget.dataset.index)); });
        });
    }

    function setupDragAndDrop() {
        const teamList = dom.teamBuilderOutput;
        if (!teamList) return;

        let draggedItem = null;

        teamList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('team-member')) {
                draggedItem = e.target;
                setTimeout(() => {
                    e.target.style.opacity = '0.5';
                }, 0);
            }
        });

        teamList.addEventListener('dragend', (e) => {
            if (draggedItem) {
                draggedItem.style.opacity = '1';
                draggedItem = null;

                // Rebuild the currentTeam array based on the new DOM order
                const newTeamOrder = [];
                const memberElements = teamList.querySelectorAll('.team-member');
                memberElements.forEach(el => {
                    newTeamOrder.push(currentTeam[parseInt(el.dataset.index)]);
                });
                currentTeam = newTeamOrder;

                // Re-render to fix indices and data attributes
                renderCurrentTeam();
            }
        });

        teamList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(teamList, e.clientY);
            if (afterElement == null) {
                teamList.appendChild(draggedItem);
            } else {
                teamList.insertBefore(draggedItem, afterElement);
            }
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

        const allItems = (await fetchFromApi('item?limit=2110')).results;
        const itemDetails = await processInBatches(allItems, item => fetchFromApi(item.url.split('/v2/')[1]), 100);
        const holdableItems = itemDetails.filter(i => i.attributes.some(a => a.name === 'holdable') && i.sprites.default);

        const renderItems = (itemsToRender) => {
            const itemsHtml = itemsToRender.map(item => `
                <div class="item-choice p-2 border-b border-tertiary-bg flex items-center gap-3 cursor-pointer hover:bg-tertiary-bg" data-item-name="${item.name}">
                    <img src="${item.sprites.default}" alt="${item.name}" class="w-8 h-8" style="image-rendering: pixelated;">
                    <span class="font-semibold">${formatDisplayName(item.name)}</span>
                </div>`).join('');
            dom.manualItemModalContent.innerHTML = `<div class="h-full">${itemsHtml}</div>`;

            dom.manualItemModalContent.querySelectorAll('.item-choice').forEach(itemEl => {
                itemEl.addEventListener('click', () => {
                    const itemName = itemEl.dataset.itemName;
                    pokemon.assignedItem = holdableItems.find(i => i.name === itemName);
                    renderCurrentTeam();
                    dom.manualItemModal.classList.add('hidden');
                    showNotification(`Gave ${formatDisplayName(pokemon.name)} a ${formatDisplayName(itemName)}!`, 'success');
                });
            });
        };

        renderItems(holdableItems);

        document.getElementById('item-search-input').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = holdableItems.filter(item => item.name.includes(searchTerm));
            renderItems(filtered);
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

    async function generateRandomTeam() {
        if (!(await showConfirmation("This will clear your current team and generate a new random one. Continue?"))) {
            return;
        }

        showNotification('Generating a random team...', 'info');
        const btn = dom.randomTeamBtn;
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Building...';
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

            // Pick 6 unique Pokémon from the pool
            const chosenUrls = new Set();
            while (chosenUrls.size < MAX_TEAM_SIZE) {
                chosenUrls.add(pokemonPoolUrls[Math.floor(Math.random() * pokemonPoolUrls.length)]);
            }

            const pokemonPromises = [...chosenUrls].map(async (url) => {
                const pokemonData = await fetchFromApi(url.split('/v2/')[1]);
                // Assign random ability
                const randomAbilityInfo = pokemonData.abilities[Math.floor(Math.random() * pokemonData.abilities.length)];
                pokemonData.assignedAbility = await fetchFromApi(randomAbilityInfo.ability.url.split('/v2/')[1]);
                // Assign random nature
                const natures = (await fetchFromApi('nature?limit=25')).results;
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
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Random Team';
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
        const savedTeams = JSON.parse(localStorage.getItem('pokemonTeams') || '[]');
        const teamToSave = { name: teamName, pokemon: currentTeam.map(p => ({ id: p.id, ability: p.assignedAbility?.name, item: p.assignedItem?.name, moves: p.assignedMoves.map(m => m.name), nature: p.assignedNature?.name })) };
        const existingIndex = savedTeams.findIndex(t => t.name === teamName);
        if (existingIndex > -1) {
            if (!(await showConfirmation(`A team named "${teamName}" already exists. Overwrite it?`))) return;
            savedTeams[existingIndex] = teamToSave;
        } else {
            savedTeams.push(teamToSave);
        }
        localStorage.setItem('pokemonTeams', JSON.stringify(savedTeams));
        dom.teamNameInput.value = '';
        showNotification(`Team "${teamName}" saved!`, 'success');
        renderSavedTeams();
    }

    function renderSavedTeams() {
        if (!dom.savedTeamsList) return;
        dom.savedTeamsList.innerHTML = '';
        const savedTeams = JSON.parse(localStorage.getItem('pokemonTeams') || '[]');
        if (savedTeams.length === 0) {
            dom.savedTeamsList.innerHTML = `<p class="text-center text-sm text-gray-500">No saved teams.</p>`;
            return;
        }
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
        const savedTeams = JSON.parse(localStorage.getItem('pokemonTeams') || '[]');
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
        const savedTeams = JSON.parse(localStorage.getItem('pokemonTeams') || '[]');
        const teamName = savedTeams[index].name;
        if (await showConfirmation(`Are you sure you want to delete the team "${teamName}"?`)) {
            savedTeams.splice(index, 1);
            localStorage.setItem('pokemonTeams', JSON.stringify(savedTeams));
            showNotification(`Team "${teamName}" deleted.`, 'info');
            renderSavedTeams();
        }
    }

    function openExportModal() {
        if (currentTeam.length === 0) return showNotification('Add Pokémon to your team to export.', 'error');
        let exportString = '';
        currentTeam.forEach(p => {
            exportString += `${formatForShowdown(p.name, 'pokemon')}\n`;
            if (p.assignedItem) exportString += `Item: ${formatForShowdown(p.assignedItem.name, 'item')}\n`;
            if (p.assignedAbility) exportString += `Ability: ${formatForShowdown(p.assignedAbility.name, 'ability')}\n`;
            if (p.assignedNature) exportString += `Nature: ${formatForShowdown(p.assignedNature.name, 'nature')}\n`;
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
        let report = [];
        const majorWeaknessThreshold = Math.max(2, Math.floor(currentTeam.length / 2));

        // --- Defensive Analysis ---
        const majorWeaknesses = Object.entries(defense).filter(([_, counts]) => counts.weaknesses >= majorWeaknessThreshold);
        if (majorWeaknesses.length > 0) {
            const weakTypes = majorWeaknesses.map(([typeName, _]) => `<strong>${capitalize(typeName)}</strong>`).join(', ');
            report.push(`<p>🛡️ <strong class="text-red-500">Defensive Concern:</strong> Your team shows a significant vulnerability to ${weakTypes} attackers. Consider adding a Pokémon that resists these types.</p>`);
        }

        const quadWeaknesses = [];
        individualDefenses.forEach(({ pokemon, multipliers }) => {
            for (const [type, multiplier] of Object.entries(multipliers)) {
                if (multiplier === 4) {
                    quadWeaknesses.push(`<li>Watch out for <strong>${formatDisplayName(pokemon.name)}</strong>, which has a 4x weakness to <strong>${capitalize(type)}</strong> attacks.</li>`);
                }
            }
        });

        if (quadWeaknesses.length > 0) {
            report.push(`<p class="text-yellow-500">⚠️ <strong>Extreme Weaknesses:</strong></p><ul class="list-disc list-inside pl-4">${quadWeaknesses.join('')}</ul>`);
        }

        const immunities = Object.entries(defense).filter(([_, counts]) => {
            return individualDefenses.some(({ multipliers }) => multipliers[_] === 0);
        }).map(([typeName, _]) => `<strong>${capitalize(typeName)}</strong>`);

        if (immunities.length > 0) {
            report.push(`<p>✅ <strong class="text-green-600">Defensive Strength:</strong> Your team has solid immunities to ${immunities.join(', ')} attacks, which is a great advantage.</p>`);
        }

        // --- Offensive Analysis ---
        const coverageGaps = allTypes.filter(type => !offensiveCoverage.has(type.name));
        if (coverageGaps.length > 0) {
            const gapTypes = coverageGaps.map(t => `<strong>${capitalize(t.name)}</strong>`).join(', ');
            const suggestionType = coverageGaps[0].name === 'normal' ? 'Fighting' : 'a super-effective type';
            report.push(`<p>⚔️ <strong class="text-yellow-500">Offensive Gap:</strong> Your team lacks super-effective coverage against ${gapTypes} Pokémon. Adding a strong ${suggestionType} move could help patch this hole.</p>`);
        } else {
            report.push(`<p>🏆 <strong class="text-green-600">Excellent Offense:</strong> Your team's moves can hit every Pokémon type for at least neutral or super-effective damage. Great job!</p>`);
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
        const query = dom.pokedexSearch.value.trim().toLowerCase().replace(/\s+/g, '-'); // Sanitize input
        if (!query) return;
        dom.pokedexCardContainer.innerHTML = `<p class="text-center">Searching...</p>`;
        if (dom.evolutionChainContainer) dom.evolutionChainContainer.innerHTML = '';
        try {
            const pokemonData = await fetchFromApi(`pokemon/${query}`);
            const speciesData = await fetchFromApi(pokemonData.species.url.split('/v2/')[1]);

            // Clear previous results
            dom.pokedexCardContainer.innerHTML = '';

            // Create and append the main card
            const card = await createPokemonCard(pokemonData, speciesData, false);
            dom.pokedexCardContainer.appendChild(card);

            // Fetch and display the evolution chain
            if (speciesData.evolution_chain?.url) {
                await displayEvolutionChain(speciesData.evolution_chain.url);
            }

        } catch (error) {
            const suggestions = getSearchSuggestions(query);
            let suggestionsHtml = '';
            if (suggestions.length > 0) {
                suggestionsHtml = `<p class="mt-4 text-sm text-gray-400">Did you mean:</p><div class="flex gap-2 justify-center mt-2">${suggestions.map(s => `<button class="pokedex-suggestion-btn p-2 bg-tertiary-bg rounded hover:bg-accent">${formatDisplayName(s.name)}</button>`).join('')}</div>`;
            }
            dom.pokedexCardContainer.innerHTML = `<div class="text-center placeholder p-8"><p class="text-red-500">Pokémon not found.</p>${suggestionsHtml}</div>`;

            document.querySelectorAll('.pokedex-suggestion-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    dom.pokedexSearch.value = btn.textContent;
                    handlePokedexSearch(new Event('submit'));
                });
            });
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
        const btn = form.parentElement.querySelector('button[type="submit"]');
        const countInput = form.querySelector('input[type="number"]');
        const count = parseInt(countInput.value) || 1;
        const resultOutputEl = document.getElementById(`${type}-result-output`);

        if (!resultOutputEl) {
            console.error(`Result output for type "${type}" not found.`);
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Searching...';
        resultOutputEl.innerHTML = '';
        try {
            const listEndpointMap = { ability: 'ability?limit=367', item: 'item?limit=2110', move: 'move?limit=920', nature: 'nature?limit=25' };
            const allResults = (await fetchFromApi(listEndpointMap[type])).results;
            let filteredResults = allResults;
            if (type === 'item') {
                const itemDetails = await Promise.all(allResults.map(i => fetchFromApi(i.url.split('/v2/')[1])));
                filteredResults = itemDetails.filter(i => i.attributes.some(a => a.name === 'holdable')).map(i => ({ name: i.name, url: i.url }));
            }
            const chosenUrls = new Set();
            while (chosenUrls.size < count && chosenUrls.size < filteredResults.length) {
                const randomItem = filteredResults[Math.floor(Math.random() * filteredResults.length)];
                // The item itself might be the object with the URL, or it might be the URL string.
                const url = typeof randomItem === 'string' ? randomItem : randomItem.url;
                if (url) {
                    chosenUrls.add(url);
                }
            }
            const detailPromises = [...chosenUrls].map(url => fetchFromApi(url.split('/v2/')[1]));
            const detailsArr = await Promise.all(detailPromises);
            detailsArr.forEach(data => resultOutputEl.appendChild(createGenericCard(data, type)));
        } catch (error) {
            resultOutputEl.innerHTML = `<p class="text-red-400">Could not fetch ${type}s.</p>`;
            console.error(error);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Generate';
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
    async function startWtpGame(isContinuation = false) {
        if (window.innerWidth < 768) closeSidebar();
        if (!dom.wtpGameContainer) return;

        if (!isContinuation) {
            wtpScore = 0;
        }
        dom.wtpScoreDisplay.textContent = wtpScore;
        dom.wtpHighScoreDisplay.textContent = wtpHighScore;

        dom.wtpGameContainer.innerHTML = '<p>Loading new Pokémon...</p>';
        try {
            const allPokemon = (await fetchFromApi('pokemon-species?limit=1025')).results;
            const chosenPokemonInfo = allPokemon[Math.floor(Math.random() * allPokemon.length)];
            const wrongAnswers = new Set();
            while (wrongAnswers.size < 3) {
                const wrong = allPokemon[Math.floor(Math.random() * allPokemon.length)];
                if (wrong.name !== chosenPokemonInfo.name) wrongAnswers.add(wrong.name);
            }
            const correctPokemon = await fetchFromApi(`pokemon/${chosenPokemonInfo.name}`);
            const options = [...wrongAnswers, correctPokemon.name].sort(() => 0.5 - Math.random());

            dom.wtpGameContainer.innerHTML = `
                <style>.wtp-sprite { filter: brightness(0); } .wtp-sprite.revealed { filter: none; }</style>
                <img id="wtp-sprite" src="${correctPokemon.sprites.other['official-artwork'].front_default}" class="h-64 w-64 object-contain mx-auto wtp-sprite transition-all duration-500">
                <div id="wtp-options" class="grid grid-cols-2 gap-4 mt-4 max-w-md mx-auto">
                    ${options.map(opt => `<button data-name="${opt}" class="p-2 bg-tertiary-bg rounded hover:bg-accent">${formatDisplayName(opt)}</button>`).join('')}
                </div>
                <div id="wtp-feedback" class="mt-4 font-bold text-xl text-center h-12"></div>
            `;

            document.querySelectorAll('#wtp-options button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.getElementById('wtp-sprite').classList.add('revealed');
                    document.querySelectorAll('#wtp-options button').forEach(b => {
                        b.disabled = true;
                        if (b.dataset.name === correctPokemon.name) b.classList.add('!bg-green-600');
                    });

                    const feedbackEl = document.getElementById('wtp-feedback');
                    if (e.target.dataset.name === correctPokemon.name) {
                        // Correct Answer
                        wtpScore++;
                        if (wtpScore > wtpHighScore) {
                            wtpHighScore = wtpScore;
                            localStorage.setItem('wtpHighScore', wtpHighScore);
                        }
                        dom.wtpScoreDisplay.textContent = wtpScore;
                        dom.wtpHighScoreDisplay.textContent = wtpHighScore;
                        feedbackEl.innerHTML = `<span class="text-green-400">Correct!</span><button id="wtp-continue" class="ml-4 p-2 text-sm bg-accent rounded">Next</button>`;
                        document.getElementById('wtp-continue').addEventListener('click', () => startWtpGame(true));
                    } else {
                        // Incorrect Answer
                        e.target.classList.add('!bg-red-600');
                        feedbackEl.innerHTML = `<span class="text-red-400">Nope, it's ${formatDisplayName(correctPokemon.name)}!</span><button id="wtp-play-again" class="ml-4 p-2 text-sm bg-accent rounded">Play Again</button>`;
                        document.getElementById('wtp-play-again').addEventListener('click', () => startWtpGame(false));
                    }
                });
            });
        } catch (e) {
            dom.wtpGameContainer.innerHTML = '<p class="text-red-400">Failed to start game. Please try again.</p>';
        }
    }
});
