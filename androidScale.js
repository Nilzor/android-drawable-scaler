#!/usr/bin/env node
var ps = require('child_process');
var fs = require('fs');
var path = require('path');

global.dpiMap = [
	{
		name: 'ldpi',
		dpi: '120',
		factor: 0.75
	},
	{
		name: 'mdpi',
		dpi: '160',
		factor: 1.0
	},
	{
		name: 'hdpi',
		dpi: '240',		
		factor: 1.5
	},
	{
		name: 'xhdpi',
		dpi: '320',		
		factor: 2.0
	},
	{
		name: 'xxhdpi',
		dpi: '480',		
		factor: 3.0
	},
	{
		name: 'xxxhdpi',
		dpi: '640',		
		factor: 4.0
	},
];

// Parse command line input and validate
var inFile = process.argv[2];
var widthInchesStr = process.argv[3];
if (!inFile || !widthInchesStr) {
	console.log("Syntax: androidScale.js <input-image> <presentation-width-in-inches>");
	return;
};

var widthInches = parseFloat(widthInchesStr);
if (!widthInches || widthInches <= 0.0) {
	console.log("Invalid width '" + widthInchesStr + "'");
	return;	
}

// Find image width and determine DPI
var cmdOut = ps.execSync('identify -format "%[fx:w]"  ' + inFile).toString().trim()
var pixelWidth = parseInt(cmdOut);
if (!pixelWidth || isNaN(pixelWidth)) {
	console.error("Could not determine width of image.");
	console.log("Command line output:\n" + cmdOut);
	return;
}

var dpi = Math.round(pixelWidth / widthInches);
console.log("Input DPI: " + dpi);
var scaling = findNearestScaling(dpi);
console.log("Closest scaling: " + scaling.name + " (" + scaling.dpi + ")");
createAllSmaller(inFile, pixelWidth, scaling);

function createAllSmaller(inFile, sourcePxWidth, sourceScaling) {
	for (var i = dpiMap.length - 1; i >= 0; i--) {
		if (dpiMap[i].dpi > sourceScaling.dpi) continue; // Never upscale
		var targetScaling = dpiMap[i];
		var dir = "drawable-" + targetScaling.name;
		if (!fs.existsSync(dir)) fs.mkdirSync(dir);
		var fileName = path.basename(inFile);
		var targetFile = path.join(dir, fileName);
		// Determine new pixel width
		var targetPxWidth = sourcePxWidth;
		var factor = targetScaling.dpi / sourceScaling.dpi;
		targetPxWidth = Math.round(sourcePxWidth * factor);

		console.log("Writing " + targetFile + ", width: " + targetPxWidth + "px");
		if (targetScaling.dpi >= sourceScaling.dpi) { 
			fs.createReadStream(inFile).pipe(fs.createWriteStream(targetFile)); // True for first in 50% of cases
		} else { 
			// Use imagemagick to rescale
			var cmdLine = "convert -resize " + targetPxWidth + " " + inFile + " " + targetFile;
			ps.execSync(cmdLine);
		}
	}
} 

function findNearestScaling(dpi) {
	var dpiMap = global.dpiMap;
	for (var i = 1; i < dpiMap.length; i++) {
		var prev = dpiMap[i - 1];
		var scaling = dpiMap[i];
		
		if (Math.abs(dpi - prev.dpi) < Math.abs(scaling.dpi - prev.dpi)) {
			return scaling;
		}
	}
}

// Todo: write unit test for findNearestScaling