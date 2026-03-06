/**
 * MARKERS.JS - Marker/Pin Management
 *
 * This file handles creating and managing map markers for advertisers.
 * It loads data from the CSV file and creates interactive pins on the map.
 */

// Array to store all markers (used for filtering/search)
let allMarkers = [];

// Array to store all advertiser data (used for search)
let allAdvertisers = [];

// Track currently open popup to ensure only one is open at a time
let currentOpenPopup = null;

/**
 * Initialize markers when map is ready
 *
 * Listen for the 'mapReady' event dispatched by map.js,
 * then load advertiser data and create markers.
 */
document.addEventListener('mapReady', function(e) {
    loadAdvertisersAndCreateMarkers();
});

/**
 * Load advertiser data from CSV and create markers
 *
 * This is the main function that:
 * 1. Loads the CSV file
 * 2. Validates the data
 * 3. Creates a marker for each valid advertiser
 */
function loadAdvertisersAndCreateMarkers() {
    // Get the map instance from map.js
    const map = getMap();

    if (!map) {
        console.error('Map not available');
        return;
    }

    // Load CSV file using the utility function
    loadCSV(CONFIG.data.csvPath)
        .then(function(advertisers) {
            // Store all advertisers for search functionality
            allAdvertisers = advertisers;

            // Filter out any invalid advertisers
            const validAdvertisers = advertisers.filter(function(advertiser) {
                return isValidAdvertiser(advertiser);
            });

            // Group advertisers by coordinate to handle co-located businesses
            var locationGroups = {};
            validAdvertisers.forEach(function(advertiser) {
                var key = parseFloat(advertiser.latitude) + ',' + parseFloat(advertiser.longitude);
                if (!locationGroups[key]) {
                    locationGroups[key] = [];
                }
                locationGroups[key].push(advertiser);
            });

            // Create one marker per unique location, store in a lookup by coord key
            var markerByLocation = {};
            Object.keys(locationGroups).forEach(function(key) {
                var group = locationGroups[key];
                markerByLocation[key] = createMarker(group, map);
            });

            // Populate allMarkers in original CSV order so dropdown indices match
            validAdvertisers.forEach(function(advertiser) {
                var key = parseFloat(advertiser.latitude) + ',' + parseFloat(advertiser.longitude);
                var marker = markerByLocation[key];
                allMarkers.push({
                    marker: marker,
                    advertiser: advertiser,
                    element: marker.getElement(),
                    visible: true
                });
            });

            // Dispatch event to notify that markers are ready
            const event = new CustomEvent('markersReady', {
                detail: {
                    advertisers: allAdvertisers,
                    markers: allMarkers
                }
            });
            document.dispatchEvent(event);
        })
        .catch(function(error) {
            console.error('Error loading advertisers:', error);
            showError('Failed to load advertiser data. Please check that the CSV file exists.');
        });
}

// Track which business tab to pre-select when a popup opens (set by dropdown)
var pendingTabBusinessName = null;

/**
 * Set the business name to pre-select in the next popup that opens.
 * Called by dropdown.js when a co-located business is selected from the directory.
 *
 * @param {string} name - Business name to pre-select
 */
function setPendingTabBusinessName(name) {
    pendingTabBusinessName = name;
}

/**
 * Activate a specific tab in a tabbed popup by index
 *
 * @param {HTMLElement} popupEl - The popup DOM element
 * @param {string|number} tabIndex - The index of the tab to activate
 */
function activatePopupTab(popupEl, tabIndex) {
    tabIndex = String(tabIndex);

    // Deactivate all tabs and panels
    var allBtns = popupEl.querySelectorAll('.popup-tab-btn');
    var allPanels = popupEl.querySelectorAll('.popup-tab-panel');

    allBtns.forEach(function(btn) { btn.classList.remove('active'); });
    allPanels.forEach(function(panel) { panel.classList.remove('active'); });

    // Activate the target tab and panel
    var targetBtn = popupEl.querySelector('.popup-tab-btn[data-tab-index="' + tabIndex + '"]');
    var targetPanel = popupEl.querySelector('.popup-tab-panel[data-tab-index="' + tabIndex + '"]');

    if (targetBtn) targetBtn.classList.add('active');
    if (targetPanel) targetPanel.classList.add('active');

    // Update container data attribute
    var container = popupEl.querySelector('.popup-tabs-container');
    if (container) container.setAttribute('data-active-tab', tabIndex);
}

/**
 * Activate a popup tab by business name
 * Uses dataset.businessName for safe comparison (browser auto-unescapes HTML entities)
 *
 * @param {HTMLElement} popupEl - The popup DOM element
 * @param {string} businessName - The name of the business to select
 */
function activatePopupTabByName(popupEl, businessName) {
    var buttons = popupEl.querySelectorAll('.popup-tab-btn');
    buttons.forEach(function(btn) {
        if (btn.dataset.businessName === businessName) {
            var tabIndex = btn.getAttribute('data-tab-index');
            activatePopupTab(popupEl, tabIndex);
        }
    });
}

/**
 * Create a single marker on the map for one or more co-located advertisers
 *
 * Creates a Mapbox marker and adds it to the map.
 * If multiple advertisers share the same location, a combined popup is shown.
 * Each advertiser gets its own entry in allMarkers pointing to the shared marker.
 *
 * @param {Array} advertisers - Array of advertiser data objects at this location
 * @param {mapboxgl.Map} map - Mapbox map instance
 */
function createMarker(advertisers, map) {
    // Use the first advertiser for coordinates and marker type detection
    const first = advertisers[0];
    const longitude = parseFloat(first.longitude);
    const latitude = parseFloat(first.latitude);

    // Create popup HTML — combined if multiple businesses, single otherwise
    const popupHTML = advertisers.length > 1
        ? createCombinedPopupHTML(advertisers)
        : createPopupHTML(first);

    // Create a Mapbox popup
    const popup = new mapboxgl.Popup({
        offset: [0, -10],     // Offset [x, y] - slight upward offset for better centering
        anchor: 'bottom',     // Anchor popup at bottom (appears above marker)
        closeButton: true,    // Show X button
        closeOnClick: false,  // Don't close when clicking map
        maxWidth: '360px'     // Balanced width
    }).setHTML(popupHTML);

    // Check if this is the Chamber of Commerce (use building icon)
    const isChamber = first.name && first.name.toLowerCase().includes('chamber of commerce');

    let marker;
    if (isChamber) {
        // Create custom building icon for Chamber (classic building with columns)
        // Uses createElementNS for SVG instead of innerHTML for security
        const chamberEl = document.createElement('div');
        chamberEl.className = 'chamber-marker';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '40');
        svg.setAttribute('height', '40');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', '#1a5276');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 2L2 8v2h20V8L12 2zM4 12v8h3v-6h2v6h2v-6h2v6h2v-6h2v6h3v-8H4zM2 22h20v-2H2v2z');
        svg.appendChild(path);
        chamberEl.appendChild(svg);
        chamberEl.style.cursor = 'pointer';

        marker = new mapboxgl.Marker({
            element: chamberEl,
            anchor: 'bottom'
        })
            .setLngLat([longitude, latitude])
            .setPopup(popup)
            .addTo(map);

        // Add callout with chamber logo, connected by a line (if configured)
        if (CONFIG.chamberCallout && CONFIG.chamberCallout.position) {
            const calloutLng = CONFIG.chamberCallout.position[0];
            const calloutLat = CONFIG.chamberCallout.position[1];
            const showAtZoom = CONFIG.chamberCallout.showAtZoom || 12;

            // Connector line from callout to chamber marker
            map.addSource('chamber-callout-line', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [calloutLng, calloutLat],
                            [longitude, latitude]
                        ]
                    }
                }
            });
            map.addLayer({
                id: 'chamber-callout-line',
                type: 'line',
                source: 'chamber-callout-line',
                paint: {
                    'line-color': CONFIG.markers.defaultColor || '#1a5276',
                    'line-width': 2,
                    'line-dasharray': [4, 3]
                }
            });

            // Logo callout marker
            // Uses createElement + setAttribute instead of innerHTML for security
            const calloutEl = document.createElement('div');
            calloutEl.className = 'chamber-callout';
            const calloutImg = document.createElement('img');
            calloutImg.setAttribute('src', CONFIG.client.logoPath);
            calloutImg.setAttribute('alt', CONFIG.client.logoAlt || 'Chamber Logo');
            calloutImg.className = 'chamber-callout-logo';
            calloutEl.appendChild(calloutImg);
            new mapboxgl.Marker({
                element: calloutEl,
                anchor: 'center'
            })
                .setLngLat([calloutLng, calloutLat])
                .addTo(map);

            // Show callout at configured zoom and above; hides when zoomed out
            function updateCalloutVisibility() {
                const zoom = map.getZoom();
                if (zoom >= showAtZoom) {
                    calloutEl.style.display = 'block';
                    map.setLayoutProperty('chamber-callout-line', 'visibility', 'visible');
                } else {
                    calloutEl.style.display = 'none';
                    map.setLayoutProperty('chamber-callout-line', 'visibility', 'none');
                }
            }
            map.on('zoom', updateCalloutVisibility);
            updateCalloutVisibility();
        }
    } else {
        // Create standard marker with navy blue color
        marker = new mapboxgl.Marker({
            color: CONFIG.markers.defaultColor  // Navy blue color from config
        })
            .setLngLat([longitude, latitude]) // Position
            .setPopup(popup)                  // Attach popup
            .addTo(map);                      // Add to map
    }

    // When popup opens, attach error handlers and tab switching logic
    popup.on('open', function() {
        var popupEl = popup.getElement();
        if (!popupEl) return;

        // Attach error handlers to popup images (no inline JS)
        var cardImages = popupEl.querySelectorAll('.business-card-img');
        cardImages.forEach(function(img) {
            img.addEventListener('error', function() {
                this.parentElement.style.display = 'none';
            });
        });

        // Tab switching for co-located businesses
        var tabButtons = popupEl.querySelectorAll('.popup-tab-btn');
        if (tabButtons.length > 0) {
            tabButtons.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var tabIndex = this.getAttribute('data-tab-index');
                    activatePopupTab(popupEl, tabIndex);
                });
            });

            // Pre-select tab if a specific business was requested (from dropdown)
            if (pendingTabBusinessName) {
                activatePopupTabByName(popupEl, pendingTabBusinessName);
                pendingTabBusinessName = null;
            }
        }
    });

    // Close any other open popup when this marker is clicked
    marker.getElement().addEventListener('click', function() {
        closeAllPopups();
        currentOpenPopup = popup;

        // Wait for popup to open and render
        waitForPopupAndEnsureVisible(popup, map);
    });

    // Track when popup is closed
    popup.on('close', function() {
        if (currentOpenPopup === popup) {
            currentOpenPopup = null;
        }
    });

    // Return the marker so the caller can build allMarkers in CSV order
    return marker;
}

/**
 * Create custom marker element
 *
 * Creates an HTML element for the marker.
 * Can be customized with different colors or icons.
 *
 * @param {Object} advertiser - Advertiser data
 * @returns {HTMLElement} - Marker DOM element
 */
function createMarkerElement(advertiser) {
    // Create a container for the pin
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.cursor = 'pointer';
    el.style.pointerEvents = 'auto';

    // Set marker style
    if (CONFIG.markers.customIcon) {
        // Use custom icon image if configured
        el.style.backgroundImage = 'url(' + CONFIG.markers.customIcon + ')';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.backgroundSize = 'cover';
    } else {
        // Create traditional pin shape with circular head and pointed bottom
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.position = 'relative';

        // Use a simple teardrop pin shape
        el.style.backgroundColor = CONFIG.markers.defaultColor;
        el.style.border = '3px solid white';
        el.style.borderRadius = '50% 50% 50% 0';
        el.style.transform = 'rotate(-45deg)';
        el.style.boxShadow = '0 3px 6px rgba(0,0,0,0.4)';

        // Create inner white circle for better visibility
        const innerCircle = document.createElement('div');
        innerCircle.style.width = '10px';
        innerCircle.style.height = '10px';
        innerCircle.style.backgroundColor = 'white';
        innerCircle.style.borderRadius = '50%';
        innerCircle.style.position = 'absolute';
        innerCircle.style.top = '50%';
        innerCircle.style.left = '50%';
        innerCircle.style.transform = 'translate(-50%, -50%) rotate(45deg)';

        el.appendChild(innerCircle);
    }

    // Add title attribute for hover tooltip
    el.title = advertiser.name || 'Location';

    return el;
}

/**
 * Filter markers based on search term
 *
 * Shows or hides markers based on whether they match the search.
 * Can be called to filter markers by text match.
 *
 * @param {string} searchTerm - The search text
 */
function filterMarkers(searchTerm) {
    // If search is empty, show all markers
    if (!searchTerm || searchTerm.length === 0) {
        showAllMarkers();
        return;
    }

    // Convert search term to lowercase for case-insensitive search
    const searchLower = searchTerm.toLowerCase();

    // Get search fields from config
    const searchFields = CONFIG.search.fields || ['name'];

    // Loop through all markers
    allMarkers.forEach(function(markerData) {
        let isMatch = false;

        // Check if advertiser matches search term in any configured field
        searchFields.forEach(function(field) {
            const value = markerData.advertiser[field];
            if (value && String(value).toLowerCase().includes(searchLower)) {
                isMatch = true;
            }
        });

        // Show or hide marker based on match
        if (isMatch) {
            showMarker(markerData);
        } else {
            hideMarker(markerData);
        }
    });

}

/**
 * Show all markers
 *
 * Makes all markers visible on the map.
 * Used when search is cleared.
 */
function showAllMarkers() {
    allMarkers.forEach(function(markerData) {
        showMarker(markerData);
    });
}

/**
 * Show a single marker
 *
 * Makes a marker visible on the map.
 *
 * @param {Object} markerData - Marker data object from allMarkers array
 */
function showMarker(markerData) {
    if (!markerData.visible) {
        markerData.element.style.display = 'block';
        markerData.visible = true;
    }
}

/**
 * Hide a single marker
 *
 * Hides a marker from the map (but doesn't remove it).
 *
 * @param {Object} markerData - Marker data object from allMarkers array
 */
function hideMarker(markerData) {
    if (markerData.visible) {
        markerData.element.style.display = 'none';
        markerData.visible = false;
    }
}

/**
 * Get all advertisers
 *
 * Returns the array of all advertiser data.
 * Used by dropdown.js for the business directory.
 *
 * @returns {Array} - Array of advertiser objects
 */
function getAllAdvertisers() {
    return allAdvertisers;
}

/**
 * Get all markers
 *
 * Returns the array of all marker data.
 *
 * @returns {Array} - Array of marker data objects
 */
function getAllMarkers() {
    return allMarkers;
}

/**
 * Close all open popups
 *
 * Ensures only one popup is displayed at a time.
 */
function closeAllPopups() {
    allMarkers.forEach(function(markerData) {
        const popup = markerData.marker.getPopup();
        if (popup && popup.isOpen()) {
            popup.remove();
        }
    });
    currentOpenPopup = null;
}

/**
 * Focus on a specific marker
 *
 * Positions the map so the marker is in the lower portion of the screen,
 * leaving room above for the popup to display below the banners.
 * Uses Mapbox's padding option to reserve space for banners and popup.
 *
 * @param {number} index - Index of marker in allMarkers array
 */
function focusOnMarker(index) {
    if (index >= 0 && index < allMarkers.length) {
        const markerData = allMarkers[index];
        const lngLat = markerData.marker.getLngLat();
        const map = getMap();

        // Close any open popups first
        closeAllPopups();

        // Calculate padding to account for banners + popup space
        const padding = getBannerPadding();

        // Fly to marker with padding - Mapbox handles the offset automatically
        map.flyTo({
            center: [lngLat.lng, lngLat.lat],
            zoom: 16,
            duration: 1000,
            padding: padding
        });

        // Open popup after fly animation completes
        setTimeout(function() {
            markerData.marker.togglePopup();
            currentOpenPopup = markerData.marker.getPopup();

            // Wait for popup to render and ensure visible
            waitForPopupAndEnsureVisible(currentOpenPopup, map);
        }, 1100);
    }
}

/**
 * Wait for popup to render then ensure it's visible
 *
 * This function handles the timing of waiting for the popup DOM element
 * to be created and rendered before checking visibility.
 *
 * @param {mapboxgl.Popup} popup - The popup instance
 * @param {mapboxgl.Map} map - The map instance
 */
function waitForPopupAndEnsureVisible(popup, map) {
    if (!popup) return;

    var attempts = 0;
    var maxAttempts = 20; // Max ~1 second of waiting

    function tryProcess() {
        attempts++;
        var popupEl = popup.getElement();

        // If popup element exists and has dimensions
        if (popupEl && popupEl.getBoundingClientRect().height > 0) {
            // Move popup to body to escape map's stacking context
            if (popupEl.parentElement && popupEl.parentElement !== document.body) {
                document.body.appendChild(popupEl);
            }

            // Ensure it's fully visible
            ensurePopupVisible(popup, map);
        } else if (attempts < maxAttempts) {
            // Try again after a short delay
            setTimeout(tryProcess, 50);
        }
    }

    // Start checking after initial render
    setTimeout(tryProcess, 10);
}

/**
 * Ensure popup is fully visible within the browser viewport
 *
 * Checks all edges (top, bottom, left, right) and pans the map
 * to bring the entire popup into view. Also accounts for UI elements
 * like banners at the top of the screen.
 *
 * @param {mapboxgl.Popup} popup - The popup instance
 * @param {mapboxgl.Map} map - The map instance
 */
function ensurePopupVisible(popup, map) {
    if (!popup) return;

    var popupEl = popup.getElement();
    if (!popupEl) return;

    // Get the actual popup content container for accurate dimensions
    var popupContent = popupEl.querySelector('.mapboxgl-popup-content');
    if (!popupContent) popupContent = popupEl;

    // Function to calculate and apply pan
    function checkAndPan() {
        var popupRect = popupEl.getBoundingClientRect();

        // Skip if popup has no dimensions yet (not rendered)
        if (popupRect.width === 0 || popupRect.height === 0) {
            return false;
        }

        var safeBottom = 20;  // 20px buffer from bottom
        var safeLeft = 10;    // 10px buffer from left
        var safeRight = 10;   // 10px buffer from right

        var viewportWidth = window.innerWidth;
        var viewportHeight = window.innerHeight;

        // Calculate safe zone, but allow popup to overlap banners if needed
        var bannerSafeTop = getTopSafeZone();
        var availableHeight = viewportHeight - safeBottom;
        var popupHeight = popupRect.height;

        // If the popup is taller than the space below the banners,
        // shrink the safe zone so the popup can overlap the banners
        var safeTop;
        if (popupHeight > availableHeight - bannerSafeTop) {
            // Not enough room below banners — allow overlap, keep 10px from top edge
            safeTop = 10;
        } else {
            safeTop = bannerSafeTop;
        }

        var panX = 0;
        var panY = 0;

        // Check both top and bottom edges independently
        var topOverflow = safeTop - popupRect.top;
        var bottomOverflow = popupRect.bottom - (viewportHeight - safeBottom);

        if (topOverflow > 0 && bottomOverflow > 0) {
            // Popup is taller than available space — prioritize showing the top
            panY = -(topOverflow + 20);
        } else if (bottomOverflow > 0) {
            // Bottom is cut off — pan up
            panY = bottomOverflow + 20;
        } else if (topOverflow > 0) {
            // Top is cut off — pan down
            panY = -(topOverflow + 20);
        }

        // Check left edge
        if (popupRect.left < safeLeft) {
            panX = -(safeLeft - popupRect.left + 10); // Pan right (negative X)
        }
        // Check right edge
        else if (popupRect.right > viewportWidth - safeRight) {
            panX = popupRect.right - (viewportWidth - safeRight) + 10; // Pan left (positive X)
        }

        // Apply pan if needed
        if (panX !== 0 || panY !== 0) {
            map.panBy([panX, panY], { duration: 300 });
            return true;
        }
        return false;
    }

    // Initial check
    checkAndPan();

    // Re-check after a longer delay to catch late renders
    setTimeout(function() {
        checkAndPan();
    }, 150);

    // Watch for images loading in the popup (popup images)
    var images = popupEl.querySelectorAll('img');
    images.forEach(function(img) {
        if (!img.complete) {
            img.addEventListener('load', function() {
                // Small delay to let layout settle after image loads
                setTimeout(function() {
                    checkAndPan();
                }, 50);
            });
        }
    });
}

/**
 * Get the safe zone from the top of the viewport
 * Accounts for banners and other UI elements
 *
 * @returns {number} - Pixels from top that should be kept clear
 */
function getTopSafeZone() {
    var safeTop = 10; // Minimum buffer

    // Check for banner containers
    var banner1 = document.querySelector('.banner1-container');
    var banner2 = document.querySelector('.banner2-container');

    if (banner1 && banner1.offsetParent !== null) {
        var rect = banner1.getBoundingClientRect();
        if (rect.bottom > safeTop) {
            safeTop = rect.bottom + 10;
        }
    }

    if (banner2 && banner2.offsetParent !== null) {
        var rect = banner2.getBoundingClientRect();
        if (rect.bottom > safeTop) {
            safeTop = rect.bottom + 10;
        }
    }

    // Also check for chamber logo container on mobile
    var chamberLogo = document.querySelector('.chamber-logo-container');
    if (chamberLogo && chamberLogo.offsetParent !== null) {
        var rect = chamberLogo.getBoundingClientRect();
        if (rect.bottom > safeTop) {
            safeTop = rect.bottom + 10;
        }
    }

    return safeTop;
}

/**
 * Calculate padding to reserve space for banners and popup
 * Returns a Mapbox-compatible padding object for flyTo()
 * Uses responsive values based on screen size
 *
 * @returns {Object} Padding object with top, bottom, left, right values
 */
function getBannerPadding() {
    // Find banner bottom
    let bannerBottom = 0;
    const banner1 = document.querySelector('.banner-floating.banner-1');
    const banner2 = document.querySelector('.banner-floating.banner-2');

    if (banner1) {
        bannerBottom = banner1.getBoundingClientRect().bottom;
    }
    if (banner2 && banner2.offsetParent !== null) {
        const rect = banner2.getBoundingClientRect();
        if (rect.bottom > bannerBottom) {
            bannerBottom = rect.bottom;
        }
    }

    // Responsive popup space and buffer based on screen size
    let popupSpace, buffer;
    const viewportWidth = window.innerWidth;

    if (viewportWidth <= 400) {
        // Small phones - smaller popups
        popupSpace = 300;
        buffer = 60;
    } else if (viewportWidth <= 480) {
        // Standard phones
        popupSpace = 350;
        buffer = 80;
    } else if (viewportWidth <= 768) {
        // Tablets
        popupSpace = 450;
        buffer = 100;
    } else {
        // Desktop
        popupSpace = 600;
        buffer = 120;
    }

    // Calculate desired top padding
    let topPadding = bannerBottom + popupSpace + buffer;

    // Cap at percentage of viewport height based on device
    const maxPaddingPercent = viewportWidth <= 480 ? 0.6 : 0.7;
    const maxPadding = window.innerHeight * maxPaddingPercent;
    topPadding = Math.min(topPadding, maxPadding);

    return {
        top: topPadding,
        bottom: viewportWidth <= 480 ? 30 : 50,
        left: 0,
        right: 0
    };
}

/**
 * DO NOT MODIFY BELOW THIS LINE
 */
