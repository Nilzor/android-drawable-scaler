#!/usr/bin/env node
var ps = require('child_process');
var fs = require('fs');
var path = require('path');

configureDpiMap();
configureLauncherIconDpis();

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
// todo identify vs magic
var cmdOut = ps.execSync('magick identify -format "%[fx:w]"  ' + inFile).toString().trim()
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
		// targetPxWidth = Math.round(sourcePxWidth * factor); // TEMP COMMENT OUT LAUNCHER ICONB
		
		console.log("TARGET: " + targetScaling.name);
		console.log ("liz: " , launcherIconSizes);
		console.log ("liz of TARGET: " , launcherIconSizes[targetScaling.name]);
		targetPxWidth = launcherIconSizes[targetScaling.name];

		console.log("Writing " + targetFile + ", width: " + targetPxWidth + "px");
		var tempVariable = false
		if (tempVariable && targetScaling.dpi >= sourceScaling.dpi) {  
			fs.writeFileSync(targetFile, fs.readFileSync(inFile));
		} else { 
			// Use imagemagick to rescale
			// todo	either magick or convert
			var resizeCmdLine = "magick " + inFile + " -resize " + targetPxWidth + " " + targetFile;
			console.log("command line: " + resizeCmdLine);
			ps.execSync(resizeCmdLine);
		}
		// Use optipng to minimize file size (lossless)
		//ps.execSync("optipng " + targetFile);
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
	return dpiMap[dpiMap.length - 1];
}

function configureDpiMap() {
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
}


function configureLauncherIconDpis() {
	global.launcherIconSizes = {
		ldpi: 32,
		mdpi: 48,
		hdpi: 72,
		xhdpi: 96,
		xxhdpi: 144,
		xxxhdpi: 192
	}
}
