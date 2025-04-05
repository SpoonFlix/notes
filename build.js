import fs from 'fs/promises';
import path from 'path';

// --- Configuration ---
// IMPORTANT: Keep your API key secure. Consider using environment variables.
// For now, we'll hardcode it here, but REMOVE IT before committing to Git.
const TMDB_API_KEY = 'e17a31a29b3ff290732945fd771fce8a'; // Replace with your key or use process.env.TMDB_API_KEY
const LOCAL_CONFIG_PATH = 'movies_local.json';
const OUTPUT_DIR = 'dist'; // Output directory for the static site
const DATA_DIR = path.join(OUTPUT_DIR, 'data');
const MOVIES_OUTPUT_PATH = path.join(DATA_DIR, 'movies_data.json');
const SHOWS_OUTPUT_PATH = path.join(DATA_DIR, 'shows_data.json');
const API_BASE_URL = 'https://api.themoviedb.org/3';

// --- Helper Functions ---

// Basic fetch wrapper for TMDB with error handling and retries
async function fetchFromTMDB(endpoint, params = {}, isRetry = false) {
    const urlParams = new URLSearchParams({ api_key: TMDB_API_KEY, ...params });
    const url = `${API_BASE_URL}/${endpoint}?${urlParams}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ status_message: 'Unknown error' }));
            if (response.status === 429 && !isRetry) { // Rate limiting
                const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
                console.warn(`Rate limited. Retrying ${endpoint} after ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000 + 500)); // Add buffer
                return fetchFromTMDB(endpoint, params, true); // Retry once
            }
             if (response.status === 404) { // Not found is expected when trying movie/tv
                 return null;
             }
            console.error(`HTTP error! status: ${response.status} for ${url}. Message: ${errorData.status_message}`);
            throw new Error(`HTTP error ${response.status}: ${errorData.status_message || 'Failed to fetch'}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error.message);
        // Don't re-throw here for 404s handled above, but maybe for others if needed
        if (error.message.includes('HTTP error 404')) return null;
        throw error; // Re-throw other errors
    }
}

// Fetch supporting details (videos, images) - simplified for build
async function fetchExtraDetails(id, type) {
    let details = { trailerKey: null, logoPath: null };
    try {
        // Fetch videos
        const videosEndpoint = `${type}/${id}/videos`;
        const videosData = await fetchFromTMDB(videosEndpoint);
        const trailer = videosData?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videosData?.results?.find(v => v.site === 'YouTube' && v.type === 'Teaser');
        if (trailer) {
            details.trailerKey = trailer.key;
        }

        // Fetch images (logos)
        const imagesEndpoint = `${type}/${id}/images`;
        const imagesData = await fetchFromTMDB(imagesEndpoint, { include_image_language: 'en,null' });
        const logo = imagesData?.logos?.find(l => l.iso_639_1 === 'en') || imagesData?.logos?.[0];
         if (logo) {
             details.logoPath = logo.file_path; // Store only the path
         }

    } catch (error) {
        console.warn(`Could not fetch extra details for ${type} ID ${id}: ${error.message}`);
    }
    return details;
}


// --- Main Build Logic ---
async function buildStaticData() {
    console.log('Starting build process...');

    // 1. Read local config
    let localConfigItems;
    try {
        const rawConfig = await fs.readFile(LOCAL_CONFIG_PATH, 'utf-8');
        localConfigItems = JSON.parse(rawConfig);
        console.log(`Read ${localConfigItems.length} items from ${LOCAL_CONFIG_PATH}`);
    } catch (error) {
        console.error(`Error reading or parsing ${LOCAL_CONFIG_PATH}:`, error);
        return;
    }

    // 2. Prepare output directories
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log(`Ensured output directories exist: ${OUTPUT_DIR}, ${DATA_DIR}`);
    } catch (error) {
        console.error('Error creating output directories:', error);
        return;
    }

    // 3. Fetch details and build final data arrays
    const allMovies = [];
    const allShows = [];
    const fetchPromises = [];

    console.log('Fetching details from TMDB...');
    for (const localItem of localConfigItems) {
        if (!localItem.tmdb_id) {
            console.warn('Skipping item with missing tmdb_id:', localItem);
            continue;
        }

        fetchPromises.push(
            (async () => {
                let details = null;
                let itemType = null;

                // Try fetching as movie, then TV
                try {
                    details = await fetchFromTMDB(`movie/${localItem.tmdb_id}`);
                    if (details && details.id) {
                        itemType = 'movie';
                    } else {
                        details = await fetchFromTMDB(`tv/${localItem.tmdb_id}`);
                        if (details && details.id) {
                            itemType = 'tv';
                        }
                    }
                } catch (fetchError) {
                     console.error(`Failed fetching main details for ID ${localItem.tmdb_id}: ${fetchError.message}`);
                     // Continue to next item if main fetch fails critically
                     return;
                }


                if (details && itemType) {
                     // Fetch videos and logos
                     const extras = await fetchExtraDetails(details.id, itemType);

                    // Merge TMDB details, extras, and local overrides
                    const mergedItem = {
                        // Key TMDB fields (add more as needed by script.js)
                        id: details.id,
                        title: details.title, // Movie title
                        name: details.name, // Show name
                        overview: details.overview,
                        poster_path: details.poster_path,
                        backdrop_path: details.backdrop_path,
                        vote_average: details.vote_average,
                        release_date: details.release_date, // Movie release
                        first_air_date: details.first_air_date, // Show first air date
                        genres: details.genres, // Array of {id, name}
                        type: itemType,
                        // Extras
                        trailer_key: extras.trailerKey, // YouTube key
                        logo_path: extras.logoPath, // TMDB logo path
                        // Local Overrides (prioritize these)
                        custom_link: localItem.custom_link,
                        // Use local title_image_url if present, otherwise use fetched logo_path
                        title_image_url: localItem.title_image_url !== undefined ? localItem.title_image_url : extras.logoPath,
                        // Use local trailer_url if present, otherwise construct from fetched trailer_key
                        custom_trailer_url: localItem.custom_trailer_url !== undefined
                            ? localItem.custom_trailer_url
                            : (extras.trailerKey ? `https://www.youtube.com/embed/${extras.trailerKey}` : null),
                    };

                    // Add to the correct array
                    if (itemType === 'movie') {
                        allMovies.push(mergedItem);
                    } else {
                        allShows.push(mergedItem);
                    }
                } else {
                    console.warn(`Could not fetch valid details for TMDB ID: ${localItem.tmdb_id}`);
                }
                 // Add delay between starting fetches to avoid rate limits
                 await new Promise(resolve => setTimeout(resolve, 75)); // Increased delay slightly
            })()
        );
    }

    // Wait for all fetches to complete
    await Promise.all(fetchPromises);
    console.log(`Finished fetching. Found ${allMovies.length} movies and ${allShows.length} shows.`);

    // 4. Write data to JSON files
    try {
        await fs.writeFile(MOVIES_OUTPUT_PATH, JSON.stringify(allMovies, null, 2));
        console.log(`Successfully wrote ${allMovies.length} movies to ${MOVIES_OUTPUT_PATH}`);
        await fs.writeFile(SHOWS_OUTPUT_PATH, JSON.stringify(allShows, null, 2));
        console.log(`Successfully wrote ${allShows.length} shows to ${SHOWS_OUTPUT_PATH}`);
    } catch (error) {
        console.error('Error writing data JSON files:', error);
        return;
    }

    // 5. Copy static assets (HTML, CSS, JS - JS will be modified later)
    try {
        await fs.copyFile('index.html', path.join(OUTPUT_DIR, 'index.html'));
        await fs.copyFile('shows.html', path.join(OUTPUT_DIR, 'shows.html'));
        await fs.copyFile('style.css', path.join(OUTPUT_DIR, 'style.css'));
        // Copy the modified script.js (assuming it's already modified in the root)
        await fs.copyFile('script.js', path.join(OUTPUT_DIR, 'script.js'));
        console.log('Copied HTML, CSS, and JS files to', OUTPUT_DIR);
    } catch (error) {
        console.error('Error copying static assets:', error);
        return;
    }

    console.log('Build process completed successfully.');
    console.log(`Static site generated in '${OUTPUT_DIR}' directory.`);
    console.log(`Movies data: ${path.join(DATA_DIR, 'movies_data.json')}`);
    console.log(`Shows data: ${path.join(DATA_DIR, 'shows_data.json')}`);
}

// Run the build process
buildStaticData().catch(error => {
    console.error("Build script failed:", error);
    process.exit(1);
});
