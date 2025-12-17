#!/usr/bin/env node
// Minify all JavaScript and JSX files using esbuild (handles JSX natively)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname, 'scripts');
const filesToMinify = [
  { file: 'index.js', isJSX: false },
  { file: 'maintenance-calculator.js', isJSX: false },
  { file: 'property-tax-lookup.js', isJSX: false },
  { file: 'boom-barrier-status.js', isJSX: false },
  { file: 'business-opportunities.jsx', isJSX: true },
  { file: 'membership-form.jsx', isJSX: true },
  { file: 'tenant-form.jsx', isJSX: true }
];

console.log('Starting minification...\n');

filesToMinify.forEach(({ file: filename, isJSX }) => {
  const inputPath = path.join(scriptsDir, filename);
  const outputFilename = filename.replace(/\.(js|jsx)$/, '.min.js');
  const outputPath = path.join(scriptsDir, outputFilename);

  if (!fs.existsSync(inputPath)) {
    console.log(`⚠ Skipping ${filename} (not found)`);
    return;
  }

  try {
    console.log(`Minifying ${filename}...`);
    
    // Use esbuild which handles both JS and JSX, and minifies
    // Mark React as external since it's loaded from CDN
    // Use transform JSX (React.createElement) instead of automatic runtime
    const externalFlags = isJSX ? '--external:react --external:react-dom --jsx=transform' : '';
    const command = `npx --yes esbuild "${inputPath}" --bundle --minify --outfile="${outputPath}" --format=iife --target=es2020 ${externalFlags}`;
    
    execSync(command, { stdio: 'inherit' });
    
    const originalSize = fs.statSync(inputPath).size;
    const minifiedSize = fs.statSync(outputPath).size;
    const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
    
    console.log(`✓ Created ${outputFilename} (${(minifiedSize / 1024).toFixed(2)} KB, ${reduction}% smaller)\n`);
  } catch (error) {
    console.error(`✗ Error minifying ${filename}:`, error.message);
  }
});

console.log('Minification complete!');

