# Popup Images

This folder contains graphics that appear in map popups when a business pin is clicked.

## How to Use

1. **Add your images** to this folder
   - Name them descriptively (e.g., `joes-coffee.jpg`, `main-street-bakery.png`)
   - Use lowercase with hyphens for consistency

2. **Update the CSV** with the image path:
   ```csv
   popup_image
   "assets/popup-images/joes-coffee.jpg"
   ```

3. **Refresh the map** - Images will appear in popups automatically

## Image Guidelines

### Recommended Specs
- **Width:** 300-800 pixels (popup max width is 400px)
- **Format:** JPG, PNG, GIF, or WebP
- **File Size:** Under 500KB for fast loading
- **Aspect Ratio:** Any (popup scales automatically)

### Best Practices
- Use high-quality images for professional appearance
- Optimize images before uploading (compress to reduce file size)
- Test on both desktop and mobile devices
- Ensure text in images is readable at small sizes

### Image Optimization Tools
- **Online:** TinyPNG, Squoosh, ImageOptim
- **Desktop:** Photoshop, GIMP (export with 80% quality)

## Troubleshooting

**Image not showing?**
- Check the file path in CSV matches exactly (case-sensitive)
- Verify the image file is in this folder
- Open browser console (F12) to see any loading errors
- Try opening the image URL directly in browser

**Image looks pixelated?**
- Use a higher resolution source image
- Ensure image width is at least 600 pixels

**Image takes too long to load?**
- Compress the image file
- Reduce image dimensions if larger than 1000px wide
- Consider converting PNG to JPG for photos

## Example

```csv
name,popup_image,latitude,longitude
"Joe's Coffee","assets/popup-images/joes-coffee.jpg",39.7817,-89.6501
"Main St Bakery","assets/popup-images/main-street-bakery.png",39.7820,-89.6505
```

When users click on these markers, the popup will display the image at the top, with business details below.
