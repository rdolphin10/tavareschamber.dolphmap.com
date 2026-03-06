/**
 * DROPDOWN.JS - Business List Navigation
 *
 * This file replaces search.js functionality with a business list dropdown.
 * Users can click business names to focus the map and show popups.
 * Supports category filtering when CSV data includes categories.
 */

// Store references to elements and current state
let businessListElement = null;
let currentSelectedIndex = -1;
let businessPanel = null;
let toggleButton = null;

/**
 * Initialize dropdown toggle functionality
 */
function initializeDropdownToggle() {
    businessPanel = document.getElementById('business-panel');
    toggleButton = document.getElementById('business-dropdown-toggle');

    if (!businessPanel || !toggleButton) {
        console.error('Business panel or toggle button not found');
        return;
    }

    // Toggle dropdown when button is clicked
    toggleButton.addEventListener('click', function(e) {
        e.stopPropagation();
        businessPanel.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (businessPanel.classList.contains('open') &&
            !businessPanel.contains(e.target) &&
            !toggleButton.contains(e.target)) {
            businessPanel.classList.remove('open');
        }
    });

}

// Initialize toggle on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDropdownToggle);
} else {
    initializeDropdownToggle();
}

/**
 * Initialize dropdown when markers are ready
 *
 * Listens for the 'markersReady' event from markers.js,
 * then populates the business list.
 */
document.addEventListener('markersReady', function(e) {
    const advertisers = e.detail.advertisers;
    initializeDropdown(advertisers);
});

/**
 * Initialize the business dropdown list
 *
 * Populates the list with all business names from the CSV data.
 * If categories exist, shows grouped view with category headings
 * and a category filter dropdown. Otherwise shows flat alphabetical list.
 *
 * @param {Array} advertisers - Array of advertiser objects from CSV
 */
function initializeDropdown(advertisers) {
    businessListElement = document.getElementById('business-list');

    if (!businessListElement) {
        console.error('Business list element not found');
        return;
    }

    // Clear any existing items
    businessListElement.innerHTML = '';

    // Check if any advertisers have category data
    const hasCategories = advertisers.some(function(a) {
        return a.category && a.category.trim() !== '';
    });

    if (hasCategories) {
        buildGroupedList(advertisers);
        initializeCategoryFilter(advertisers);
    } else {
        buildFlatList(advertisers);
    }
}

/**
 * Check if an advertiser is a Chamber of Commerce
 */
function isChamber(advertiser) {
    return advertiser.name && advertiser.name.toLowerCase().includes('chamber of commerce');
}

/**
 * Build a flat alphabetical list (no categories)
 *
 * @param {Array} advertisers - Array of advertiser objects
 */
function buildFlatList(advertisers) {
    var sortedBusinesses = advertisers.map(function(advertiser, index) {
        return { advertiser: advertiser, originalIndex: index };
    });

    // Chamber first, then alphabetical
    sortedBusinesses.sort(function(a, b) {
        var aChamber = isChamber(a.advertiser);
        var bChamber = isChamber(b.advertiser);
        if (aChamber && !bChamber) return -1;
        if (!aChamber && bChamber) return 1;
        return a.advertiser.name.localeCompare(b.advertiser.name);
    });

    sortedBusinesses.forEach(function(item) {
        var li = createBusinessListItem(item.advertiser, item.originalIndex);
        businessListElement.appendChild(li);
    });
}

/**
 * Build a grouped list with category headings
 *
 * @param {Array} advertisers - Array of advertiser objects
 */
function buildGroupedList(advertisers) {
    // Group advertisers by category, pulling out chamber entries
    var groups = {};
    var otherGroup = [];
    var chamberItems = [];

    advertisers.forEach(function(advertiser, index) {
        if (isChamber(advertiser)) {
            chamberItems.push({ advertiser: advertiser, originalIndex: index });
            return;
        }
        var cat = (advertiser.category && advertiser.category.trim()) || '';
        if (cat === '') {
            otherGroup.push({ advertiser: advertiser, originalIndex: index });
        } else {
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push({ advertiser: advertiser, originalIndex: index });
        }
    });

    // Render chamber entries first (pinned to top, no category heading)
    chamberItems.forEach(function(item) {
        var li = createBusinessListItem(item.advertiser, item.originalIndex);
        li.dataset.category = '_chamber';
        businessListElement.appendChild(li);
    });

    // Sort category names alphabetically
    var sortedCategories = Object.keys(groups).sort(function(a, b) {
        return a.localeCompare(b);
    });

    // Render each category group
    sortedCategories.forEach(function(cat) {
        var heading = document.createElement('li');
        heading.className = 'category-heading';
        heading.textContent = cat;
        heading.dataset.category = cat;
        businessListElement.appendChild(heading);

        // Sort businesses within category alphabetically
        groups[cat].sort(function(a, b) {
            return a.advertiser.name.localeCompare(b.advertiser.name);
        });

        groups[cat].forEach(function(item) {
            var li = createBusinessListItem(item.advertiser, item.originalIndex);
            li.dataset.category = cat;
            businessListElement.appendChild(li);
        });
    });

    // Render "Other" group at the end if any
    if (otherGroup.length > 0) {
        var heading = document.createElement('li');
        heading.className = 'category-heading';
        heading.textContent = 'Other';
        heading.dataset.category = '';
        businessListElement.appendChild(heading);

        otherGroup.sort(function(a, b) {
            return a.advertiser.name.localeCompare(b.advertiser.name);
        });

        otherGroup.forEach(function(item) {
            var li = createBusinessListItem(item.advertiser, item.originalIndex);
            li.dataset.category = '';
            businessListElement.appendChild(li);
        });
    }
}

/**
 * Create a single business list item element
 *
 * @param {Object} advertiser - Advertiser data object
 * @param {number} originalIndex - Index in the original advertisers array
 * @returns {HTMLElement} - The list item element
 */
function createBusinessListItem(advertiser, originalIndex) {
    var li = document.createElement('li');
    li.className = 'business-list-item';
    li.textContent = advertiser.name;
    li.dataset.index = originalIndex;

    li.addEventListener('click', function() {
        selectBusiness(originalIndex);
    });

    return li;
}

/**
 * Initialize category filter dropdown
 *
 * Populates the select element with unique categories and
 * wires up the change handler.
 *
 * @param {Array} advertisers - Array of advertiser objects
 */
function initializeCategoryFilter(advertisers) {
    var filterSelect = document.getElementById('category-filter');
    if (!filterSelect) return;

    // Extract unique non-empty categories
    var categories = [];
    var seen = {};
    advertisers.forEach(function(a) {
        var cat = (a.category && a.category.trim()) || '';
        if (cat !== '' && !seen[cat]) {
            seen[cat] = true;
            categories.push(cat);
        }
    });

    // If no categories, leave hidden
    if (categories.length === 0) return;

    // Sort and populate options
    categories.sort(function(a, b) { return a.localeCompare(b); });
    categories.forEach(function(cat) {
        var option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filterSelect.appendChild(option);
    });

    // Show the filter
    filterSelect.style.display = '';

    // Wire up change handler
    filterSelect.addEventListener('change', function() {
        applyFilter(this.value);
    });
}

/**
 * Apply category filter to both map markers and business list
 *
 * @param {string} category - Category to filter by, or empty string for all
 */
function applyFilter(category) {
    var markers = getAllMarkers();

    // Filter map markers
    markers.forEach(function(markerData) {
        var advCategory = (markerData.advertiser.category && markerData.advertiser.category.trim()) || '';
        if (category === '' || advCategory === category) {
            showMarker(markerData);
        } else {
            hideMarker(markerData);
        }
    });

    // Filter business list items and category headings
    var items = businessListElement.querySelectorAll('.business-list-item, .category-heading');
    items.forEach(function(item) {
        if (category === '') {
            // Show all
            item.style.display = '';
        } else if (item.classList.contains('category-heading')) {
            // Show heading only if it matches the selected category
            item.style.display = (item.dataset.category === category) ? '' : 'none';
        } else {
            // Show business item only if its category matches
            item.style.display = (item.dataset.category === category) ? '' : 'none';
        }
    });
}

/**
 * Handle business selection
 *
 * When a business is clicked in the list:
 * 1. Remove highlight from previous selection
 * 2. Highlight the clicked business
 * 3. Focus the map on that business location
 * 4. Open the popup for that business
 * 5. Close the dropdown
 *
 * @param {number} index - Index of the selected business in the allMarkers array
 */
function selectBusiness(index) {
    // Remove 'active' class from all items
    const items = document.querySelectorAll('.business-list-item');
    items.forEach(function(item) {
        item.classList.remove('active');
    });

    // Add 'active' class to selected item (match by data-index, not DOM position)
    items.forEach(function(item) {
        if (item.dataset.index === String(index)) {
            item.classList.add('active');
        }
    });

    // Update current selection
    currentSelectedIndex = index;

    // Set the pending tab name for co-located businesses
    // so the correct tab is pre-selected when the popup opens
    var markers = getAllMarkers();
    if (markers[index] && typeof setPendingTabBusinessName === 'function') {
        setPendingTabBusinessName(markers[index].advertiser.name);
    }

    // Focus map on the selected business
    // This function is defined in markers.js
    if (typeof focusOnMarker === 'function') {
        focusOnMarker(index);
    } else {
        console.error('focusOnMarker function not available');
    }

    // Close the dropdown after selection
    if (businessPanel) {
        businessPanel.classList.remove('open');
    }

}

/**
 * Get currently selected business index
 *
 * @returns {number} - Index of currently selected business, or -1 if none
 */
function getSelectedIndex() {
    return currentSelectedIndex;
}

/**
 * Clear selection
 *
 * Removes highlighting from all business items.
 */
function clearSelection() {
    const items = document.querySelectorAll('.business-list-item');
    items.forEach(function(item) {
        item.classList.remove('active');
    });
    currentSelectedIndex = -1;
}

/**
 * DO NOT MODIFY BELOW THIS LINE
 */
