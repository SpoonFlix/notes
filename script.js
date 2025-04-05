document.addEventListener('DOMContentLoaded', async () => { // Make top-level async
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
    // No longer need localConfigData state here

    // --- Fetch Pre-built Static Data ---
    async function fetchStaticData(dataPath) {
        try {
            // Fetch the pre-generated JSON data file
            const response = await fetch(dataPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log(`Static data loaded from ${dataPath}:`, data.length, "entries");
            return data;
        } catch (error) {
            console.error(`Error fetching static data (${dataPath}):`, error);
            pageContainer.innerHTML = `<h2>Error loading content from ${dataPath}. Please check the file exists and is valid JSON.</h2>`;
            return []; // Return empty array on error
        }
    }

    // --- Helper Functions ---
    function getImageUrl(path, size = posterSize) {
        // Remove placeholder logic
        // Construct image URL from path and size. Path should exist in the pre-built data.
        return path ? `${baseImageUrl}${size}${path}` : null; // Return null if no path
    }

    // Remove fetchFromTMDB, fetchAllDetails, fetchVideos, fetchImages as they are done in build.js

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
        const backdropUrl = getImageUrl(item.backdrop_path, backdropSize);
        modalBackdrop.style.backgroundImage = backdropUrl ? `url(${backdropUrl})` : 'none';
        modalBackdrop.style.backgroundColor = backdropUrl ? 'transparent' : '#111';

        // Use the pre-determined trailer URL (custom or built from key)
        const trailerUrl = item.custom_trailer_url;

        if (trailerUrl) {
            detailsTrailer.src = trailerUrl;
            detailsTrailer.style.display = 'block'; // Ensure iframe is visible
        } else {
             detailsTrailer.style.display = 'none'; // Hide iframe if no trailer
        }


        // --- Populate Info Content ---
        // Title / Logo
        detailsTitle.textContent = title; // Set text title first
        detailsTitle.style.display = 'block';
        detailsTitleImage.src = ''; // Clear image src
        detailsTitleImage.style.display = 'none';

        // Use the pre-determined title image URL (custom or built from logo_path)
        // It might be a full URL or a TMDB path
        let finalLogoUrl = null;
        if (item.title_image_url) {
            if (item.title_image_url.startsWith('http')) {
                finalLogoUrl = item.title_image_url; // Use direct URL if provided
            } else {
                // Assume it's a TMDB path, construct full URL
                finalLogoUrl = getImageUrl(item.title_image_url, titleImageSize);
            }
        }

        // Display the logo if a URL exists
        if (finalLogoUrl) {
            detailsTitleImage.src = finalLogoUrl;
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
             detailsPlayButton._listener = (e) => {
                 const fullLink = new URL(item.custom_link, window.location.href).href;
                 copyToClipboard(fullLink, e.target);
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
    async function populatePageContent() {
        if (!pageContainer) {
            console.error("Page container not found!");
            return;
        }
        pageContainer.innerHTML = '<h2>Loading Content...</h2>';

        const isMoviesPage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html');
        const isShowsPage = window.location.pathname.endsWith('shows.html');

        let data = [];
        let pageTitle = "";
        let dataPath = "";

        if (isMoviesPage) {
            dataPath = 'data/movies_data.json'; // Path relative to the HTML file in dist/
            pageTitle = "My Movies";
        } else if (isShowsPage) {
            dataPath = 'data/shows_data.json'; // Path relative to the HTML file in dist/
            pageTitle = "My TV Shows";
             if (featuredCarousel) featuredCarousel.style.display = 'none'; // No carousel on shows page
        } else {
            pageContainer.innerHTML = '<h2>Unsupported page.</h2>';
             if (featuredCarousel) featuredCarousel.style.display = 'none';
            return;
        }

        // Fetch the appropriate static data file
        data = await fetchStaticData(dataPath);

        pageContainer.innerHTML = ''; // Clear loading message

        if (data && data.length > 0) {
            createLocalItemsRow(pageTitle, data, pageContainer);
            if (isMoviesPage) {
                setupFeaturedCarousel(data); // Setup carousel only on movies page with movie data
            }
        } else {
            pageContainer.innerHTML = `<h2>No ${isMoviesPage ? 'movies' : 'shows'} found. Check ${dataPath}.</h2>`;
             if (isMoviesPage && featuredCarousel) featuredCarousel.style.display = 'none';
        }
    }


    // --- Modified Featured Carousel Setup ---
    // Takes the pre-built movies array as input
    function setupFeaturedCarousel(movies) {
         if (!featuredCarousel || !featuredItemsContainer || !movies || movies.length === 0) {
            if (featuredCarousel) featuredCarousel.style.display = 'none';
            console.log("Featured carousel setup skipped: No container or no movies.");
            return;
        }

        // Select up to 7 random movies for the carousel
        const featuredItemsData = [...movies].sort(() => 0.5 - Math.random()).slice(0, 7);

        if (featuredItemsData.length === 0) {
            featuredCarousel.style.display = 'none';
            return;
        }
         featuredCarousel.style.display = 'block'; // Ensure it's visible
        featuredItemsContainer.innerHTML = ''; // Clear previous items
        currentFeaturedIndex = 0; // Reset index

        featuredItemsData.forEach((item, index) => {
            const bannerItem = document.createElement('div');
            bannerItem.classList.add('featured-item');
            if (index === 0) bannerItem.classList.add('active');

            const title = item.title || item.name; // Should be movie title
            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

            // Determine title display (logo or text)
            let titleDisplay = `<h2>${title}</h2>`;
            let finalLogoUrl = null;
             if (item.title_image_url) { // Use the pre-merged title_image_url
                 if (item.title_image_url.startsWith('http')) {
                     finalLogoUrl = item.title_image_url;
                 } else {
                     finalLogoUrl = getImageUrl(item.title_image_url, titleImageSize);
                 }
            }
            if (finalLogoUrl) {
                 titleDisplay = `<img src="${finalLogoUrl}" alt="${title} Logo" class="featured-title-image">`;
            }

            const backdropUrl = getImageUrl(item.backdrop_path, backdropSize); // Construct backdrop URL

            bannerItem.innerHTML = `
                ${backdropUrl ? `<img src="${backdropUrl}" alt="${title} Banner" class="featured-backdrop" loading="lazy">` : '<div class="featured-backdrop-placeholder"></div>'}
                <div class="featured-info">
                    ${titleDisplay}
                    <p class="featured-rating">Rating: ${rating} / 10</p>
                    <p class="featured-overview">${item.overview || 'No description available.'}</p>
                    <button class="play-button-banner" data-item-id="${item.id}">ℹ️ More Info</button>
                 </div>
            `;
            // Add background only if backdrop exists
             if (backdropUrl) {
                 bannerItem.querySelector('.featured-backdrop').addEventListener('load', () => {
                     bannerItem.style.setProperty('--backdrop-url', `url(${backdropUrl})`);
                 });
             } else {
                  bannerItem.style.setProperty('--backdrop-url', 'none'); // Or a default gradient/color
                  bannerItem.style.backgroundColor = '#222'; // Fallback background
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
    // Replace old setup calls with the new main function
    populatePageContent(); // This now handles fetching and populating based on page


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
