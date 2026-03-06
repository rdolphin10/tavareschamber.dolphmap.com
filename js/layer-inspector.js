/**
 * LAYER-INSPECTOR.JS - Map Layer Debugging Tool
 *
 * This file helps you inspect all available map layers and their current styling.
 * Use this to identify which layers to customize with your Dolph colors.
 */

/**
 * Inspect all map layers and log their properties
 * This will show you what layers exist and what colors they currently have
 *
 * @param {mapboxgl.Map} map - The Mapbox map instance
 * @returns {Array} Array of layer information
 */
function inspectMapLayers(map) {
    if (!map || !map.getStyle()) {
        console.error('Map not initialized or style not loaded');
        return [];
    }

    const style = map.getStyle();
    const layers = style.layers;

    console.log('========================================');
    console.log('MAP LAYER INSPECTION REPORT');
    console.log('========================================');
    console.log('Total layers found:', layers.length);
    console.log('');

    // Group layers by type
    const layersByType = {};
    const layerDetails = [];

    layers.forEach(function(layer) {
        const type = layer.type;

        if (!layersByType[type]) {
            layersByType[type] = [];
        }
        layersByType[type].push(layer);

        // Extract color information from paint properties
        const colors = extractColors(layer);

        const detail = {
            id: layer.id,
            type: layer.type,
            sourceLayer: layer['source-layer'] || 'N/A',
            colors: colors,
            visible: layer.layout && layer.layout.visibility !== 'none'
        };

        layerDetails.push(detail);
    });

    // Print summary by type
    console.log('LAYERS BY TYPE:');
    console.log('===============');
    Object.keys(layersByType).forEach(function(type) {
        console.log(type + ': ' + layersByType[type].length + ' layers');
    });
    console.log('');

    // Print road layers
    console.log('ROAD LAYERS:');
    console.log('============');
    layers.forEach(function(layer) {
        if (layer.id.includes('road') || layer.id.includes('street') ||
            layer.id.includes('motorway') || layer.id.includes('highway') ||
            layer.id.includes('trunk') || layer.id.includes('primary') ||
            layer.id.includes('secondary') || layer.id.includes('tertiary')) {

            const colors = extractColors(layer);
            console.log('Layer: ' + layer.id);
            console.log('  Type: ' + layer.type);
            console.log('  Source Layer: ' + (layer['source-layer'] || 'N/A'));
            if (colors.length > 0) {
                console.log('  Colors:');
                colors.forEach(function(c) {
                    console.log('    ' + c.property + ': ' + c.value);
                });
            }
            console.log('');
        }
    });

    // Print water layers
    console.log('WATER LAYERS:');
    console.log('=============');
    layers.forEach(function(layer) {
        if (layer.id.includes('water')) {
            const colors = extractColors(layer);
            console.log('Layer: ' + layer.id);
            console.log('  Type: ' + layer.type);
            if (colors.length > 0) {
                console.log('  Colors:');
                colors.forEach(function(c) {
                    console.log('    ' + c.property + ': ' + c.value);
                });
            }
            console.log('');
        }
    });

    // Print landuse layers (parks, golf, etc.)
    console.log('LANDUSE LAYERS (Parks, Golf, Airports):');
    console.log('========================================');
    layers.forEach(function(layer) {
        if (layer.id.includes('landuse') || layer.id.includes('park') ||
            layer.id.includes('golf') || layer.id.includes('airport') ||
            layer.id.includes('aeroway')) {

            const colors = extractColors(layer);
            console.log('Layer: ' + layer.id);
            console.log('  Type: ' + layer.type);
            if (colors.length > 0) {
                console.log('  Colors:');
                colors.forEach(function(c) {
                    console.log('    ' + c.property + ': ' + c.value);
                });
            }
            console.log('');
        }
    });

    // Print place/label layers
    console.log('LABEL LAYERS (Cities, Roads, Waterways):');
    console.log('=========================================');
    layers.forEach(function(layer) {
        if (layer.id.includes('label') || layer.id.includes('place')) {
            const colors = extractColors(layer);
            console.log('Layer: ' + layer.id);
            console.log('  Type: ' + layer.type);
            if (colors.length > 0) {
                console.log('  Colors:');
                colors.forEach(function(c) {
                    console.log('    ' + c.property + ': ' + c.value);
                });
            }
            console.log('');
        }
    });

    console.log('========================================');
    console.log('To get this data as a JSON object, run:');
    console.log('getAllLayersData(map)');
    console.log('========================================');

    return layerDetails;
}

/**
 * Extract color properties from a layer
 *
 * @param {Object} layer - Map layer object
 * @returns {Array} Array of color properties
 */
function extractColors(layer) {
    const colors = [];

    if (!layer.paint) {
        return colors;
    }

    // Check for fill colors
    if (layer.paint['fill-color']) {
        colors.push({
            property: 'fill-color',
            value: JSON.stringify(layer.paint['fill-color'])
        });
    }

    // Check for line colors
    if (layer.paint['line-color']) {
        colors.push({
            property: 'line-color',
            value: JSON.stringify(layer.paint['line-color'])
        });
    }

    // Check for text colors
    if (layer.paint['text-color']) {
        colors.push({
            property: 'text-color',
            value: JSON.stringify(layer.paint['text-color'])
        });
    }

    // Check for icon colors
    if (layer.paint['icon-color']) {
        colors.push({
            property: 'icon-color',
            value: JSON.stringify(layer.paint['icon-color'])
        });
    }

    // Check for text halo colors
    if (layer.paint['text-halo-color']) {
        colors.push({
            property: 'text-halo-color',
            value: JSON.stringify(layer.paint['text-halo-color'])
        });
    }

    return colors;
}

/**
 * Get all layers data as a structured JSON object
 * Useful for copying and analyzing
 *
 * @param {mapboxgl.Map} map - The Mapbox map instance
 * @returns {Object} Structured layer data
 */
function getAllLayersData(map) {
    if (!map || !map.getStyle()) {
        console.error('Map not initialized');
        return null;
    }

    const layers = map.getStyle().layers;
    const data = {
        totalLayers: layers.length,
        roads: [],
        water: [],
        landuse: [],
        labels: [],
        other: []
    };

    layers.forEach(function(layer) {
        const layerInfo = {
            id: layer.id,
            type: layer.type,
            sourceLayer: layer['source-layer'],
            colors: extractColors(layer)
        };

        if (layer.id.includes('road') || layer.id.includes('street') ||
            layer.id.includes('motorway') || layer.id.includes('highway')) {
            data.roads.push(layerInfo);
        } else if (layer.id.includes('water')) {
            data.water.push(layerInfo);
        } else if (layer.id.includes('landuse') || layer.id.includes('park') ||
                   layer.id.includes('golf') || layer.id.includes('airport')) {
            data.landuse.push(layerInfo);
        } else if (layer.id.includes('label') || layer.id.includes('place')) {
            data.labels.push(layerInfo);
        } else {
            data.other.push(layerInfo);
        }
    });

    return data;
}

/**
 * Generate a customization template based on current layers
 * This creates a ready-to-use template for the dolph-style.js file
 *
 * @param {mapboxgl.Map} map - The Mapbox map instance
 */
function generateCustomizationTemplate(map) {
    if (!map || !map.getStyle()) {
        console.error('Map not initialized');
        return;
    }

    const layers = map.getStyle().layers;

    console.log('========================================');
    console.log('CUSTOMIZATION TEMPLATE FOR dolph-style.js');
    console.log('========================================');
    console.log('Copy and paste this code into your applyDolphStyle function:');
    console.log('');

    // Generate code for road layers
    console.log('// ========================================');
    console.log('// ROAD LAYERS');
    console.log('// ========================================');
    layers.forEach(function(layer) {
        if (layer.id.includes('road') || layer.id.includes('motorway') ||
            layer.id.includes('trunk') || layer.id.includes('primary')) {

            if (layer.paint && (layer.paint['line-color'] || layer.paint['fill-color'])) {
                const colorProp = layer.paint['line-color'] ? 'line-color' : 'fill-color';
                console.log('if (map.getLayer(\'' + layer.id + '\')) {');
                console.log('    map.setPaintProperty(\'' + layer.id + '\', \'' + colorProp + '\', DOLPH_COLORS.yourColorName);');
                console.log('}');
            }
        }
    });

    console.log('');
    console.log('========================================');
}

/**
 * Export functions to window
 */
if (typeof window !== 'undefined') {
    window.inspectMapLayers = inspectMapLayers;
    window.getAllLayersData = getAllLayersData;
    window.generateCustomizationTemplate = generateCustomizationTemplate;
}

console.log('Layer Inspector module loaded');
console.log('Run inspectMapLayers(map) in the console after the map loads');
