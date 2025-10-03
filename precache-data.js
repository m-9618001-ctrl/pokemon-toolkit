// This is a Node.js script to pre-fetch and cache data from PokéAPI.
// Run this script from your terminal using `node precache-data.js`
// whenever you want to update the cached data.

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch').default; // Correctly import fetch for node-fetch v3+

const API_BASE = 'https://pokeapi.co/api/v2/';
const OUTPUT_FILE = path.join(__dirname, 'assets', 'precache.json');

async function fetchFromApi(endpoint) {
    const url = `${API_BASE}${endpoint}`;
    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
        }
        return res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function processInBatches(items, asyncOperation, batchSize = 50) {
    let results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(items.length / batchSize)}...`);
        const batchPromises = batch.map(asyncOperation);
        const batchResults = await Promise.all(batchPromises);
        results = results.concat(batchResults.filter(r => r !== null));
        await new Promise(resolve => setTimeout(resolve, 100)); // Be kind to the API
    }
    return results;
}

async function getAllHoldableItems() {
    console.log('\n--- Fetching Holdable Items ---');
    const holdableAttribute = await fetchFromApi('item-attribute/holdable');
    if (!holdableAttribute) return [];
    const holdableItemUrls = holdableAttribute.items;
    const itemDetails = await processInBatches(holdableItemUrls, item => fetchFromApi(item.url.split('/v2/')[1]), 100);
    return itemDetails.filter(i => i.sprites.default);
}

async function getAllPokemonNames() {
    console.log('\n--- Fetching All Pokémon Names ---');
    // Fetching species for the generator filter fix. The client still fetches all forms for search.
    const speciesList = await fetchFromApi('pokemon-species?limit=10000');
    return speciesList ? speciesList.results : [];
}

async function getAllMoves() {
    console.log('\n--- Fetching All Moves ---');
    const moveList = (await fetchFromApi('move?limit=1000'))?.results;
    if (!moveList) return [];
    return await processInBatches(moveList, move => fetchFromApi(move.url.split('/v2/')[1]), 100);
}

async function getAllNatures() {
    console.log('\n--- Fetching Natures ---');
    const natureList = await fetchFromApi('nature?limit=25');
    return natureList ? natureList.results : [];
}

async function getAllAbilities() {
    console.log('\n--- Fetching Abilities ---');
    const abilityList = await fetchFromApi('ability?limit=4000');
    return abilityList ? abilityList.results : [];
}

async function getAllColors() {
    console.log('\n--- Fetching Colors ---');
    const colorList = await fetchFromApi('pokemon-color');
    return colorList ? colorList.results : [];
}

async function main() {
    console.log('Starting data pre-caching process...');
    const precachedData = {
        allHoldableItems: await getAllHoldableItems(),
        allPokemonNames: await getAllPokemonNames(),
        allMoves: await getAllMoves(),
        allNatures: await getAllNatures(),
        allAbilities: await getAllAbilities(),
        allColors: await getAllColors(),
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(precachedData, null, 2));
    console.log(`\n✅ Success! Data saved to ${OUTPUT_FILE}`);
}

main();
