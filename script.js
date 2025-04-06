// --- Data will be fetched ---

document.addEventListener('DOMContentLoaded', async () => { // Make top-level async
    // --- Global Data ---
    let allMoviesData = []; // To store fetched movie data
    let allShowsData = []; // To store fetched show data (if needed later)

    // --- DOM Elements ---
    const bodyElement = document.body; // Keep body element reference
    const pageContainer = document.getElementById('page-content'); // General container for movies or shows
    const movieDetails = document.querySelector('.movie-details');
    // Modal Content Elements
    const modalBackdrop = movieDetails.querySelector('.modal-backdrop');
    const modalInfoContent = movieDetails.querySelector('.modal-info-content');
    const detailsTitle = document.getElementById('details-title');
    const detailsTitleImage = document.getElementById('details-title-image');
    const detailsDescription = document.getElementById('details-description');
    const detailsTrailer = document.getElementById('details-trailer');
    const detailsPlayButton = document.getElementById('details-play-button');
    const detailsRating = document.getElementById('details-rating');
    const detailsYear = document.getElementById('details-year');
    const detailsGenres = document.getElementById('details-genres');
    const closeDetailsButton = document.querySelector('.close-details');
    // Featured Banner Elements
    // Featured Banner Elements (Keep for potential future use on index.html, but logic will change)
    const featuredCarousel = document.querySelector('.featured-carousel');
    const featuredItemsContainer = document.querySelector('.featured-items');

    // --- Configuration (Simplified for Static Build) ---
    // No API Key needed in the browser script anymore
    const baseImageUrl = 'https://image.tmdb.org/t/p/'; // Still needed for constructing image URLs
    const posterSize = 'w342';
    const backdropSize = 'w1280';
    const titleImageSize = 'w500'; // Keep for consistency

    // --- State ---
    let currentFeaturedIndex = 0;

    // --- Helper Functions ---
    function getImageUrl(pathOrUrl, size = posterSize) {
        // Handles both TMDB paths and potentially full URLs from overrides
        if (!pathOrUrl) {
            return null; // No path or URL provided
        }
        // Check if it looks like a full URL already
        if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
            return pathOrUrl; // Return the full URL directly
        }
        // Otherwise, assume it's a TMDB path and construct the URL
        return `${baseImageUrl}${size}${pathOrUrl}`;
    }

    // Function to fetch data from JSON file
    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Could not fetch data from ${url}:`, error);
            return null; // Return null on error
        }
    }


    function copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => { button.textContent = originalText; }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy link.');
        });
    }


    // --- Modal Functions ---
    // Now takes the item directly from the pre-built static data
    function showMovieDetails(item) {
        if (!item || !item.type) {
             console.error("showMovieDetails called with invalid item:", item);
             return;
        }
        const type = item.type;
        const title = item.title || item.name;
        const releaseDate = item.release_date || item.first_air_date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';

        // --- Populate Backdrop/Trailer ---
        detailsTrailer.src = ''; // Clear previous trailer

        // Use backdrop_path from JSON (or a full URL if provided, though not standard in this JSON)
        let finalBackdropUrl = null;
        if (item.backdrop_path) {
             if (item.backdrop_path.startsWith('http')) { // Check if it's already a full URL
                 finalBackdropUrl = item.backdrop_path;
             } else {
                 finalBackdropUrl = getImageUrl(item.backdrop_path, backdropSize); // Construct TMDB URL
             }
        }
        modalBackdrop.style.backgroundImage = finalBackdropUrl ? `url(${finalBackdropUrl})` : 'none';
        modalBackdrop.style.backgroundColor = finalBackdropUrl ? 'transparent' : '#111'; // Fallback color

        // Construct trailer URL from JSON data (prioritize custom_trailer_url)
        let finalTrailerUrl = null;
        if (item.custom_trailer_url) {
            finalTrailerUrl = item.custom_trailer_url; // Use custom URL directly
        } else if (item.trailer_key) {
            // Construct YouTube embed URL (assuming YouTube)
            finalTrailerUrl = `https://www.youtube.com/embed/${item.trailer_key}`;
        }

        if (finalTrailerUrl) {
            detailsTrailer.src = finalTrailerUrl;
            detailsTrailer.style.display = 'block'; // Ensure iframe is visible
        } else {
             detailsTrailer.style.display = 'none'; // Hide iframe if no trailer
        }


        // --- Populate Info Content ---
        // Title / Logo
        detailsTitle.textContent = title; // Set text title first
        detailsTitle.style.display = 'block'; // Default to showing text title
        detailsTitleImage.src = ''; // Clear image src
        detailsTitleImage.style.display = 'none'; // Default to hiding image title

        // Determine logo/title image URL (prioritize title_image_url, fallback to logo_path)
        let finalTitleImageUrl = null;
        if (item.title_image_url) { // Check for direct full URL first
             finalTitleImageUrl = item.title_image_url;
        } else if (item.logo_path) { // Fallback to constructing from TMDB path
             finalTitleImageUrl = getImageUrl(item.logo_path, titleImageSize);
        }


        // Display the logo/title image if a URL exists
        if (finalTitleImageUrl) {
            detailsTitleImage.src = finalTitleImageUrl;
            detailsTitleImage.alt = `${title} Logo`;
            detailsTitleImage.style.display = 'block';
            detailsTitle.style.display = 'none'; // Hide text title if logo is shown
        } else {
             detailsTitle.style.display = 'block'; // Ensure text title is visible if no logo
             detailsTitleImage.style.display = 'none';
        }

        // Play Button
        if (detailsPlayButton._listener) {
            detailsPlayButton.removeEventListener('click', detailsPlayButton._listener);
            detailsPlayButton._listener = null;
        }
        if (item.custom_link) {
             detailsPlayButton.style.display = 'inline-block';
             // Set button text (optional, could be an icon)
             detailsPlayButton.textContent = 'Play'; // Or similar
             detailsPlayButton._listener = (e) => {
                 // Copy the custom_link directly as provided in the JSON
                 const linkToCopy = item.custom_link;
                 copyToClipboard(linkToCopy, e.target);
             };
             detailsPlayButton.addEventListener('click', detailsPlayButton._listener);
        } else {
             detailsPlayButton.style.display = 'none';
        }


        // Metadata
        detailsRating.textContent = item.vote_average ? `${item.vote_average.toFixed(1)} Rating` : 'Rating N/A';
        detailsYear.textContent = year;
        // Use genres array directly from the fetched details
        detailsGenres.textContent = item.genres?.map(g => g.name).filter(Boolean).join(', ') || 'Genres N/A';

        // Description
        detailsDescription.textContent = item.overview;

        // --- Show Modal & Dim Background ---
        movieDetails.style.display = 'block';
        bodyElement.classList.add('modal-open'); // Add class to body
        if (modalInfoContent) modalInfoContent.scrollTop = 0;
    }

    function hideMovieDetails() {
        movieDetails.style.display = 'none';
        detailsTrailer.src = '';
        detailsTitleImage.src = '';
        bodyElement.classList.remove('modal-open'); // Remove class from body
         if (detailsPlayButton._listener) {
            detailsPlayButton.removeEventListener('click', detailsPlayButton._listener);
            detailsPlayButton._listener = null;
        }
    }

    // --- UI Population Functions ---

    function createItemPosterElement(item) {
        const posterContainer = document.createElement('div');
        posterContainer.classList.add('movie-poster');

        const img = document.createElement('img');
        const posterUrl = getImageUrl(item.poster_path, posterSize);
        if (posterUrl) {
            img.src = posterUrl;
            img.alt = `${item.title || item.name} Poster`;
            img.loading = 'lazy';
            posterContainer.appendChild(img);
        } else {
            // Optional: Handle missing poster - maybe add text or different style
            posterContainer.classList.add('no-poster'); // Add class for styling
            posterContainer.textContent = item.title || item.name || 'N/A'; // Show title if no image
        }

        posterContainer.addEventListener('click', () => {
             showMovieDetails(item);
        });

        return posterContainer;
    }

    // --- New function to create a row for locally defined items ---
    function createLocalItemsRow(title, items, container) {
        if (!items || items.length === 0) return; // Don't create row if no items

        const section = document.createElement('div');
        section.classList.add('genre-section'); // Reuse existing class for styling

        const titleEl = document.createElement('h2');
        titleEl.classList.add('genre-title');
        titleEl.textContent = title;
        section.appendChild(titleEl);

        const rowContainer = document.createElement('div');
        rowContainer.classList.add('movie-row-container'); // Reuse class

        const movieRow = document.createElement('div');
        movieRow.classList.add('movie-row'); // Reuse class
        rowContainer.appendChild(movieRow);

        const leftArrow = document.createElement('button');
        leftArrow.classList.add('arrow', 'left-arrow');
        leftArrow.innerHTML = '<';
        rowContainer.appendChild(leftArrow);

        const rightArrow = document.createElement('button');
        rightArrow.classList.add('arrow', 'right-arrow');
        rightArrow.innerHTML = '>';
        rowContainer.appendChild(rightArrow);

        section.appendChild(rowContainer);

        items.forEach(item => {
            const posterElement = createItemPosterElement(item); // Use the existing poster function
            movieRow.appendChild(posterElement);
        });

        setupScrolling(movieRow, leftArrow, rightArrow); // Reuse scrolling logic

        container.appendChild(section); // Append to the main page container
    }


    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function setupScrolling(row, leftArrow, rightArrow) {
        if (!row || !leftArrow || !rightArrow) return;

        const scrollAmount = () => row.clientWidth * 0.7;

        const updateArrowsVisibility = () => {
             if (!row || !leftArrow || !rightArrow) return;
            const currentScroll = Math.round(row.scrollLeft);
            const maxScroll = Math.round(row.scrollWidth - row.clientWidth);
            const tolerance = 10;

            const canScrollLeft = currentScroll > tolerance;
            const canScrollRight = currentScroll < maxScroll - tolerance;

            leftArrow.style.opacity = canScrollLeft ? '1' : '0';
            leftArrow.style.pointerEvents = canScrollLeft ? 'auto' : 'none';
            rightArrow.style.opacity = canScrollRight ? '1' : '0';
            rightArrow.style.pointerEvents = canScrollRight ? 'auto' : 'none';
        };

        const debouncedUpdateArrows = debounce(updateArrowsVisibility, 100);

        leftArrow.addEventListener('click', () => {
            row.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
        });

        rightArrow.addEventListener('click', () => {
            row.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
        });

        row.addEventListener('scroll', debouncedUpdateArrows);

        if ('ResizeObserver' in window) {
            new ResizeObserver(debouncedUpdateArrows).observe(row);
            if(row.parentElement) new ResizeObserver(debouncedUpdateArrows).observe(row.parentElement);
        } else {
            window.addEventListener('resize', debouncedUpdateArrows);
        }

        requestAnimationFrame(() => {
            setTimeout(updateArrowsVisibility, 250);
        });
        window.addEventListener('load', () => setTimeout(updateArrowsVisibility, 300));
    } // <-- Add missing closing brace for setupScrolling here

    // --- Main Population Logic ---
    // Groups items by genre and creates rows
    function populatePageContent(movies, shows) {
        if (!pageContainer) {
            console.error("Page container not found!");
            return;
        }
        pageContainer.innerHTML = ''; // Clear any previous content

        const isMoviesPage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html');
        const isShowsPage = window.location.pathname.endsWith('shows.html');

        let sourceData = [];
        let pageType = '';

        if (isMoviesPage) {
            sourceData = movies;
            pageType = 'movies';
            console.log("Processing fetched moviesData:", sourceData ? sourceData.length : 0, "entries");
            if (!sourceData) {
                 pageContainer.innerHTML = `<h2>Error loading movie data.</h2>`;
                 if (featuredCarousel) featuredCarousel.style.display = 'none';
                 return;
            }
             // Setup carousel only on movies page with fetched movies
             setupFeaturedCarousel(sourceData);
        } else if (isShowsPage) {
            sourceData = shows;
            pageType = 'shows';
             console.log("Processing fetched showsData:", sourceData ? sourceData.length : 0, "entries");
             if (!sourceData) {
                 pageContainer.innerHTML = `<h2>Error loading show data.</h2>`;
                 return;
             }
             if (featuredCarousel) featuredCarousel.style.display = 'none'; // No carousel on shows page
        } else {
            pageContainer.innerHTML = '<h2>Unsupported page.</h2>';
             if (featuredCarousel) featuredCarousel.style.display = 'none';
            return;
        }

        if (!sourceData || sourceData.length === 0) {
             pageContainer.innerHTML = `<h2>No ${pageType} found.</h2>`;
             if (isMoviesPage && featuredCarousel) featuredCarousel.style.display = 'none';
             return;
        }

        // 1. Handle "New Releases"
        const newItems = sourceData.filter(item => item.new === true);
        const regularItems = sourceData.filter(item => item.new !== true); // Items not marked as new

        if (newItems.length > 0) {
            createLocalItemsRow("New Releases", newItems, pageContainer);
        }

        // 2. Group remaining items by Genre
        const itemsByGenre = {};
        regularItems.forEach(item => {
            if (item.genres && Array.isArray(item.genres)) {
                item.genres.forEach(genre => {
                    if (genre && genre.name) {
                        if (!itemsByGenre[genre.name]) {
                            itemsByGenre[genre.name] = [];
                        }
                        // Add item to the genre list (removed duplicate ID check for simplicity)
                        itemsByGenre[genre.name].push(item);
                    }
                });
            }
        });

        // 3. Create rows for each genre, sorted alphabetically by genre name
        const sortedGenres = Object.keys(itemsByGenre).sort();
        sortedGenres.forEach(genreName => {
            createLocalItemsRow(genreName, itemsByGenre[genreName], pageContainer);
        });

        // Handle case where there are only 'new' items and no regular items
        if (newItems.length > 0 && regularItems.length === 0) {
             console.log("Only 'New Releases' items found.");
        } else if (newItems.length === 0 && regularItems.length === 0 && sourceData.length > 0) {
            // This case shouldn't happen if sourceData has items, but as a fallback
             pageContainer.innerHTML = `<h2>No ${pageType} found to display in categories.</h2>`;
        }
    }


    // --- Modified Featured Carousel Setup ---
    // Takes the fetched movies array as input
    function setupFeaturedCarousel(movies) {
         if (!featuredCarousel || !featuredItemsContainer || !movies || movies.length === 0) {
            if (featuredCarousel) featuredCarousel.style.display = 'none';
            console.log("Featured carousel setup skipped: No container or no fetched movies.");
            return;
        }

        // Filter movies to get only those marked as featured
        const featuredMovies = movies.filter(movie => movie.featured === true);

        if (featuredMovies.length === 0) {
            // Optionally, fallback to random movies if none are explicitly featured
            // featuredMovies = [...movies].sort(() => 0.5 - Math.random()).slice(0, 7);
            // Or just hide the carousel if no featured movies are set
            console.log("No movies marked as featured. Hiding carousel.");
            featuredCarousel.style.display = 'none';
            return;
        }

         featuredCarousel.style.display = 'block'; // Ensure it's visible
        featuredItemsContainer.innerHTML = ''; // Clear previous items
        currentFeaturedIndex = 0; // Reset index

        featuredMovies.forEach((item, index) => {
            const bannerItem = document.createElement('div');
            bannerItem.classList.add('featured-item');
            if (index === 0) bannerItem.classList.add('active');

            const title = item.title || item.name; // Should be movie title
            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

            // Determine title display (logo or text) - prioritize title_image_url, fallback to logo_path
            let titleDisplay = `<h2>${title}</h2>`;
            let finalCarouselTitleImageUrl = null;
            if (item.title_image_url) {
                finalCarouselTitleImageUrl = item.title_image_url;
            } else if (item.logo_path) {
                finalCarouselTitleImageUrl = getImageUrl(item.logo_path, titleImageSize);
            }
            if (finalCarouselTitleImageUrl) {
                 titleDisplay = `<img src="${finalCarouselTitleImageUrl}" alt="${title} Logo" class="featured-title-image">`;
            }

            // Use backdrop_path for the main carousel image (banner)
            let finalCarouselBackdropUrl = null;
            if (item.backdrop_path) {
                 if (item.backdrop_path.startsWith('http')) {
                     finalCarouselBackdropUrl = item.backdrop_path;
                 } else {
                     finalCarouselBackdropUrl = getImageUrl(item.backdrop_path, backdropSize); // Use appropriate backdrop size
                 }
            }
            // Use backdrop as the main visual element
            const backdropElement = finalCarouselBackdropUrl
                ? `<img src="${finalCarouselBackdropUrl}" alt="${title} Banner" class="featured-backdrop" loading="lazy">` // Use backdrop class
                : '<div class="featured-backdrop-placeholder"></div>'; // Use backdrop placeholder class


            bannerItem.innerHTML = `
                ${backdropElement} {/* Display backdrop prominently */}
                <div class="featured-info">
                    ${titleDisplay}
                    <p class="featured-rating">Rating: ${rating} / 10</p>
                    <p class="featured-overview">${item.overview || 'No description available.'}</p>
                    <button class="play-button-banner" data-item-id="${item.id}">Play</button>
                 </div>
            `;
            // Set the backdrop as a background style for the banner item (optional, depends on CSS)
             if (finalCarouselBackdropUrl) {
                 // This sets a CSS variable, your CSS needs to use var(--backdrop-url)
                 bannerItem.style.setProperty('--backdrop-url', `url(${finalCarouselBackdropUrl})`);
                 bannerItem.classList.add('has-backdrop-bg'); // Add class for styling
             } else {
                  bannerItem.style.setProperty('--backdrop-url', 'none');
                  bannerItem.style.backgroundColor = '#181818'; // Fallback background
             }

            featuredItemsContainer.appendChild(bannerItem);

            // Attach listener to the button to show details modal
            bannerItem.querySelector('.play-button-banner').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent clicks bubbling up if needed
                const itemId = e.target.dataset.itemId;
                // Find the full item details from the original movies array
                const clickedItem = movies.find(i => i.id == itemId);
                if (clickedItem) {
                    showMovieDetails(clickedItem); // Show the modal
                } else {
                    console.error("Could not find movie details for banner item ID:", itemId);
                }
            });
        });

        // --- Carousel Animation ---
        const items = featuredItemsContainer.querySelectorAll('.featured-item');
        if (items.length > 1) {
            // Clear existing interval if any (important for potential re-runs)
            if (window.featuredCarouselInterval) {
                clearInterval(window.featuredCarouselInterval);
            }
            // Store interval ID globally to manage it
            window.featuredCarouselInterval = setInterval(() => {
                if (document.hidden) return; // Don't cycle if tab is not visible
                if (items.length > 0 && items[currentFeaturedIndex]) {
                     items[currentFeaturedIndex].classList.remove('active');
                     currentFeaturedIndex = (currentFeaturedIndex + 1) % items.length;
                     items[currentFeaturedIndex].classList.add('active');
                } else {
                     // Safety check in case items somehow become empty
                     clearInterval(window.featuredCarouselInterval);
                }

            }, 7000); // Change slide every 7 seconds
        }
    }


    // --- Initial Setup ---
    // Fetch data and then populate the page
    async function initializePage() {
        // Fetch both movies and shows data
        // Use Promise.all to fetch concurrently
        const [movies, shows] = await Promise.all([
            fetchData('data/movies_data.json'),
            fetchData('data/shows_data.json') // Fetch shows data
        ]);

        // Store fetched data globally (optional, but can be useful)
        allMoviesData = movies;
        allShowsData = shows;

        // Now populate the page with the fetched data
        populatePageContent(allMoviesData, allShowsData);
    }

    initializePage(); // Call the async initialization function


    // --- Event Listeners (Keep existing modal and search listeners) ---
    closeDetailsButton.addEventListener('click', hideMovieDetails);
    // Changed modal click listener to only close if clicking the main modal overlay
    movieDetails.addEventListener('click', (event) => {
        if (event.target === movieDetails) { // Check if the click is directly on the modal background
            hideMovieDetails();
        }
    });


    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                alert(`Search functionality not fully implemented. Query: ${query}`);
            }
        });
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }

});
