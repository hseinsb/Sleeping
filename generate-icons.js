const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Define all required icon sizes
const iconSizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-icon-57x57.png', size: 57 },
  { name: 'apple-icon-60x60.png', size: 60 },
  { name: 'icon-72x72.png', size: 72 },
  { name: 'apple-icon-72x72.png', size: 72 },
  { name: 'apple-icon-76x76.png', size: 76 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'apple-icon-114x114.png', size: 114 },
  { name: 'apple-icon-120x120.png', size: 120 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'apple-icon-144x144.png', size: 144 },
  { name: 'apple-icon-152x152.png', size: 152 },
  { name: 'apple-icon-180x180.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-1024x1024.png', size: 1024 }
];

// Generate SVG icon template
function generateIconSVG(size) {
  const cornerRadius = Math.max(4, size * 0.125); // 12.5% corner radius
  const circleRadius = size * 0.15; // Main circle
  const innerRadius = size * 0.1; // Inner circle
  const centerX = size / 2;
  const centerY = size / 2;
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="${size}" height="${size}" rx="${cornerRadius}" fill="#007AFF"/>
<circle cx="${centerX}" cy="${centerY}" r="${circleRadius}" fill="white" fill-opacity="0.3"/>
<circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" fill="white"/>
<path d="M${centerX - innerRadius * 0.4} ${centerY - innerRadius * 0.2}L${centerX + innerRadius * 0.4} ${centerY - innerRadius * 0.2}L${centerX} ${centerY + innerRadius * 0.4}Z" fill="#007AFF"/>
</svg>`;
}

// Create placeholder SVG files for each size
iconSizes.forEach(({ name, size }) => {
  const svgContent = generateIconSVG(size);
  const svgPath = path.join(iconsDir, name.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svgContent);
  console.log(`Generated ${svgPath}`);
});

console.log('\\nIcon generation complete!');
console.log('\\nTo convert to PNG files, you can use:');
console.log('1. Online converter (recommended): https://cloudconvert.com/svg-to-png');
console.log('2. Figma: Import SVG → Export as PNG');
console.log('3. Adobe Illustrator: File → Export → Export As → PNG');
console.log('\\nMake sure to maintain the exact dimensions and use these files for the iOS app bundle.');
