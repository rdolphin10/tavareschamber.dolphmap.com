/**
 * UTILS.JS - Helper Functions
 *
 * This file contains reusable utility functions used throughout the application.
 * Each function is documented with its purpose, parameters, and return value.
 */

/**
 * Load and parse CSV file
 *
 * Uses the PapaParse library to load a CSV file and convert it to an array of objects.
 * Each row in the CSV becomes an object with column names as keys.
 *
 * @param {string} csvPath - Path to the CSV file
 * @returns {Promise<Array>} - Promise that resolves to array of advertiser objects
 *
 * Example CSV:
 * name,latitude,longitude,phone
 * "Joe's Coffee",39.7817,-89.6501,"555-1234"
 *
 * Returns:
 * [{name: "Joe's Coffee", latitude: "39.7817", longitude: "-89.6501", phone: "555-1234"}]
 */
function loadCSV(csvPath) {
    return new Promise(function(resolve, reject) {
        // Use PapaParse to load and parse the CSV file
        Papa.parse(csvPath, {
            download: true,        // Download file from path
            header: true,          // First row contains column names
            dynamicTyping: true,   // Convert numbers automatically
            skipEmptyLines: true,  // Skip empty rows
            complete: function(results) {
                // Check if parsing was successful
                if (results.errors.length > 0) {
                    console.error('CSV parsing errors:', results.errors);
                }

                // Log how many records were loaded
                // Return the parsed data
                resolve(results.data);
            },
            error: function(error) {
                console.error('Error loading CSV:', error);
                reject(error);
            }
        });
    });
}

/**
 * Create HTML content for marker popup
 *
 * Generates formatted HTML to display advertiser information in a popup.
 * Only includes fields that have values (skips empty fields).
 *
 * @param {Object} advertiser - Advertiser data object from CSV
 * @returns {string} - HTML string for popup content
 */
function createPopupHTML(advertiser) {
    // Start building the HTML string
    let html = '';

    // Business Name (required) - FIRST
    if (advertiser.name) {
        html += '<div class="popup-title">' + escapeHTML(advertiser.name) + '</div>';
    }

    // Category (e.g., "Restaurant", "Retail")
    if (advertiser.category) {
        html += '<div class="popup-category">' + escapeHTML(advertiser.category) + '</div>';
    }

    // Address
    if (advertiser.address) {
        html += '<div class="popup-address">';
        html += escapeHTML(advertiser.address);

        // Add city, state, zip if available
        if (advertiser.city || advertiser.state || advertiser.zip) {
            html += '<br>';
            if (advertiser.city) html += escapeHTML(advertiser.city);
            if (advertiser.state) html += ', ' + escapeHTML(advertiser.state);
            if (advertiser.zip) html += ' ' + escapeHTML(advertiser.zip);
        }

        html += '</div>';
    }

    // Phone Number (clickable to call)
    if (advertiser.phone) {
        html += '<div class="popup-phone">';
        html += 'Phone: <a href="tel:' + escapeHTML(advertiser.phone) + '">' + escapeHTML(advertiser.phone) + '</a>';
        html += '</div>';
    }

    // Description
    if (advertiser.description) {
        html += '<div class="popup-description">' + escapeHTML(advertiser.description) + '</div>';
    }

    // Buttons container
    html += '<div class="popup-buttons">';

    // Website Link
    if (advertiser.website) {
        html += '<a href="' + escapeHTML(advertiser.website) + '" target="_blank" rel="noopener noreferrer" class="popup-link">';
        html += 'Visit Website';
        html += '</a>';
    }

    // Get Directions Button (Google Maps)
    if (advertiser.latitude && advertiser.longitude) {
        const lat = escapeHTML(advertiser.latitude);
        const lng = escapeHTML(advertiser.longitude);
        const destinationName = encodeURIComponent(advertiser.name || 'Destination');
        const directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&destination_place_id=' + destinationName;

        html += '<a href="' + directionsUrl + '" target="_blank" rel="noopener noreferrer" class="popup-link popup-directions">';
        html += 'Get Directions';
        html += '</a>';
    }

    html += '</div>';

    // Popup Image (if available) - LAST
    // Clickable to website if available
    // Note: Error handling for broken images is done via addEventListener below (no inline onerror)
    if (advertiser.popup_image) {
        html += '<div class="popup-business-card">';
        if (advertiser.website) {
            html += '<a href="' + escapeHTML(advertiser.website) + '" target="_blank" rel="noopener noreferrer">';
        }
        html += '<img src="' + escapeHTML(advertiser.popup_image) + '" ';
        html += 'alt="' + escapeHTML(advertiser.name) + '" ';
        html += 'class="business-card-img" ';
        html += 'style="cursor: pointer;" ';
        html += 'loading="lazy">';
        if (advertiser.website) {
            html += '</a>';
        }
        html += '</div>';
    }

    return html;
}

/**
 * Create tabbed popup HTML for multiple co-located businesses
 *
 * When multiple businesses share the same coordinates, this generates
 * a tabbed interface with buttons at the top to switch between businesses.
 * Only one business is visible at a time.
 *
 * @param {Array} advertisers - Array of advertiser data objects
 * @returns {string} - Tabbed HTML string for popup content
 */
function createCombinedPopupHTML(advertisers) {
    var html = '<div class="popup-tabs-container" data-active-tab="0">';

    // Tab buttons row
    html += '<div class="popup-tab-buttons">';
    advertisers.forEach(function(advertiser, i) {
        var name = escapeHTML(advertiser.name);
        var truncated = name.length > 20 ? name.substring(0, 18) + '...' : name;
        var activeClass = i === 0 ? ' active' : '';
        html += '<button class="popup-tab-btn' + activeClass + '"';
        html += ' data-tab-index="' + i + '"';
        html += ' data-business-name="' + name + '"';
        html += ' title="' + name + '">' + truncated + '</button>';
    });
    html += '</div>';

    // Tab panels
    advertisers.forEach(function(advertiser, i) {
        var activeClass = i === 0 ? ' active' : '';
        html += '<div class="popup-tab-panel' + activeClass + '"';
        html += ' data-tab-index="' + i + '">';
        html += createPopupHTML(advertiser);
        html += '</div>';
    });

    html += '</div>';
    return html;
}

/**
 * Escape HTML special characters
 *
 * Prevents XSS attacks by converting special characters to HTML entities.
 * Always use this when displaying user-generated or external content.
 *
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text safe for HTML
 *
 * Example:
 * escapeHTML('<script>alert("xss")</script>')
 * Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
function escapeHTML(text) {
    // Convert to string if not already
    if (typeof text !== 'string') {
        text = String(text);
    }

    // Create a temporary div element
    const div = document.createElement('div');
    // Set text content (automatically escapes special characters)
    div.textContent = text;
    // Return the escaped HTML
    return div.innerHTML;
}

/**
 * Sanitize user input
 *
 * Cleans user input by trimming whitespace and removing unwanted characters.
 * Use this for search input and any user-entered text.
 *
 * @param {string} input - User input to sanitize
 * @returns {string} - Cleaned input
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return '';
    }

    // Remove leading/trailing whitespace
    input = input.trim();

    // Remove any potential script tags or HTML
    input = input.replace(/<[^>]*>/g, '');

    return input;
}

/**
 * Debounce function
 *
 * Delays function execution until after a specified wait time has passed
 * since the last call. Useful for search input to avoid excessive filtering.
 *
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 *
 * Example:
 * const debouncedSearch = debounce(performSearch, 300);
 * searchInput.addEventListener('input', debouncedSearch);
 */
function debounce(func, wait) {
    // Variable to store timeout ID
    let timeout;

    // Return a new function that wraps the original
    return function executedFunction() {
        // Save the context and arguments
        const context = this;
        const args = arguments;

        // Clear any existing timeout
        clearTimeout(timeout);

        // Set a new timeout
        timeout = setTimeout(function() {
            // Execute the original function after wait time
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Show error message to user
 *
 * Displays an error message on the page.
 * Creates a simple alert-style notification.
 *
 * @param {string} message - Error message to display
 */
function showError(message) {
    // Log to console for debugging
    console.error('Error:', message);

    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #ff4444;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
        font-weight: 600;
    `;

    // Add to page
    document.body.appendChild(errorDiv);

    // Remove after 5 seconds
    setTimeout(function() {
        errorDiv.remove();
    }, 5000);
}

/**
 * Validate advertiser data
 *
 * Checks if an advertiser object has the required fields.
 * Required fields: name, latitude, longitude
 *
 * @param {Object} advertiser - Advertiser object to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidAdvertiser(advertiser) {
    // Check for required fields
    if (!advertiser.name) {
        console.warn('Advertiser missing name:', advertiser);
        return false;
    }

    if (!advertiser.latitude || !advertiser.longitude) {
        console.warn('Advertiser missing coordinates:', advertiser);
        return false;
    }

    // Check if coordinates are valid numbers
    const lat = parseFloat(advertiser.latitude);
    const lng = parseFloat(advertiser.longitude);

    if (isNaN(lat) || isNaN(lng)) {
        console.warn('Advertiser has invalid coordinates:', advertiser);
        return false;
    }

    // Check if coordinates are in valid range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn('Advertiser coordinates out of range:', advertiser);
        return false;
    }

    return true;
}

/**
 * DO NOT MODIFY BELOW THIS LINE
 */
