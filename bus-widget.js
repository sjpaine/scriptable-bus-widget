// Bus Widget for Scriptable - Multi-Stop Edition
// Displays real-time bus departures from NDOV Loket via OV API
// Version: 2.0.0 (2026-04-19)
// 
// USAGE:
// - Add widget to home screen
// - Edit widget → Parameter field → enter: "veldhuizen" or "utrecht"
// - No parameter = defaults to veldhuizen
//
// TO ADD MORE STOPS: Edit the STOPS object below

// ============================================================================
// STOP CONFIGURATIONS - Add your stops here
// ============================================================================

const STOPS = {
    veldhuizen: {
        stopId: "51200124",
        stopName: "Veldhuizen",
        linesToShow: ["28","102","29"],
        maxDepartures: 5
    },
    utrecht: {
        stopId: "50000204",
        stopName: "Utrecht CS",
        linesToShow: ["28"],
        maxDepartures: 5
    }
};

// Global settings (apply to all stops)
const GLOBAL_CONFIG = {
    refreshIntervalMinutes: 2,
    apiEndpoint: "http://v0.ovapi.nl/tpc/",
    styling: {
        backgroundColor: "#FFFFFF",
        primaryColor: "#FFE600",
        textColor: "#000000",
        errorColor: "#FF0000"
    },
    cache: {
        enabled: true,
        maxAgeMinutes: 10
    }
};

const LINE_COLORS = {
    "28": "#FFE600",
    "29": "#FF8C00",
    "102": "#00CF00"
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

const stopKey = args.widgetParameter || "veldhuizen";
const busConfig = loadConfiguration(stopKey);
const fetchTime = new Date();
const departures = await fetchDepartures();
const widget = createWidget(departures);

if (config.runsInWidget) {
    Script.setWidget(widget);
} else {
    widget.presentSmall();
}
Script.complete();

// ============================================================================
// CONFIGURATION
// ============================================================================

function loadConfiguration(stopKey) {
    const stopConfig = STOPS[stopKey];
    
    if (!stopConfig) {
        const widget = new ListWidget();
        widget.backgroundColor = Color.white();
        const text = widget.addText(`Unknown stop: "${stopKey}"\n\nAvailable stops:\n${Object.keys(STOPS).join(', ')}`);
        text.font = Font.systemFont(11);
        text.textColor = Color.red();
        Script.setWidget(widget);
        Script.complete();
        throw new Error("Unknown stop key: " + stopKey);
    }
    
    return {
        stopKey: stopKey,
        stopId: stopConfig.stopId,
        stopName: stopConfig.stopName,
        linesToShow: stopConfig.linesToShow || [],
        maxDepartures: stopConfig.maxDepartures || 5,
        refreshIntervalMinutes: GLOBAL_CONFIG.refreshIntervalMinutes,
        apiEndpoint: GLOBAL_CONFIG.apiEndpoint,
        styling: GLOBAL_CONFIG.styling,
        cache: GLOBAL_CONFIG.cache,
        runsInWidget: config.runsInWidget
    };
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchDepartures() {
    try {
        const url = busConfig.apiEndpoint + busConfig.stopId;
        const request = new Request(url);
        request.timeoutInterval = 10;
        
        const response = await request.loadJSON();
        
        if (!response || !response[busConfig.stopId]) {
            log("No data in API response");
            return getCachedDepartures();
        }
        
        const stopData = response[busConfig.stopId];
        const passes = stopData.Passes || {};
        const departures = processPasses(passes);
        
        saveCache(departures);
        return departures;
        
    } catch (error) {
        log("API error: " + error.message);
        return getCachedDepartures();
    }
}

function processPasses(passes) {
    const result = [];
    const linesToShow = busConfig.linesToShow;
    
    for (const key in passes) {
        const pass = passes[key];
        
        if (pass.TripStopStatus && pass.TripStopStatus === "CANCELLED") {
            continue;
        }
        
        if (linesToShow.length > 0 && !linesToShow.includes(pass.LinePublicNumber)) {
            continue;
        }
        
        const expectedTime = pass.ExpectedArrivalTime 
            ? parseApiTimestamp(pass.ExpectedArrivalTime)
            : parseApiTimestamp(pass.TargetArrivalTime);
        const targetTime = parseApiTimestamp(pass.TargetArrivalTime);
        const delayMs = expectedTime.getTime() - targetTime.getTime();
        const delayMinutes = Math.round(delayMs / 60000);
        
        const lineColor = extractLineColor(pass);
        
        result.push({
            line: pass.LinePublicNumber,
            lineColor: lineColor,
            destination: truncateString(pass.DestinationName50, 20),
            expectedArrivalISO: pass.ExpectedArrivalTime || pass.TargetArrivalTime,
            targetArrivalISO: pass.TargetArrivalTime,
            expectedTime: expectedTime,
            delay: delayMinutes,
            operator: pass.OperatorCode
        });
    }
    
    result.sort((a, b) => a.expectedTime.getTime() - b.expectedTime.getTime());
    
    return result.slice(0, busConfig.maxDepartures);
}

function extractLineColor(pass) {
    const lineNum = pass.LinePublicNumber;
    if (lineNum && LINE_COLORS[lineNum]) {
        return LINE_COLORS[lineNum];
    }
    return busConfig.styling.primaryColor;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

function getCachePath() {
    const fm = FileManager.iCloud();
    return fm.joinPath(fm.documentsDirectory(), `bus-widget-cache-${busConfig.stopKey}.json`);
}

function saveCache(departures) {
    if (!busConfig.cache.enabled) return;
    
    try {
        const fm = FileManager.iCloud();
        const cachePath = getCachePath();
        
        const cacheData = {
            timestamp: new Date().toISOString(),
            stopId: busConfig.stopId,
            stopKey: busConfig.stopKey,
            departures: departures.map(dep => ({
                line: dep.line,
                lineColor: dep.lineColor,
                destination: dep.destination,
                expectedArrivalISO: dep.expectedArrivalISO,
                targetArrivalISO: dep.targetArrivalISO,
                delay: dep.delay,
                operator: dep.operator
            }))
        };
        
        fm.writeString(cachePath, JSON.stringify(cacheData));
    } catch (error) {
        log("Cache save error: " + error.message);
    }
}

function getCachedDepartures() {
    if (!busConfig.cache.enabled) return [];
    
    try {
        const fm = FileManager.iCloud();
        const cachePath = getCachePath();
        
        if (!fm.fileExists(cachePath)) return [];
        
        const cacheData = JSON.parse(fm.readString(cachePath));
        const cacheAgeMinutes = (Date.now() - new Date(cacheData.timestamp).getTime()) / 60000;
        
        const reconstructedDepartures = cacheData.departures.map(dep => ({
            ...dep,
            lineColor: dep.lineColor || busConfig.styling.primaryColor,
            expectedTime: parseApiTimestamp(dep.expectedArrivalISO),
            targetTime: parseApiTimestamp(dep.targetArrivalISO)
        }));
        
        if (cacheAgeMinutes > busConfig.cache.maxAgeMinutes) {
            return { expired: true, data: reconstructedDepartures, age: Math.round(cacheAgeMinutes) };
        }
        
        return { data: reconstructedDepartures, age: Math.round(cacheAgeMinutes) };
        
    } catch (error) {
        log("Cache read error: " + error.message);
        return [];
    }
}

// ============================================================================
// WIDGET CREATION
// ============================================================================

function createWidget(departures) {
    const widget = new ListWidget();
    
    widget.backgroundColor = new Color(busConfig.styling.backgroundColor);
    widget.setPadding(8, 10, 8, 10);
    
    const isOffline = departures.expired || (departures.data && departures.age);
    const cacheAge = departures.age;
    const displayData = departures.data || departures;
    
    const headerStack = widget.addStack();
    headerStack.layoutHorizontally();
    
    const nameText = headerStack.addText(busConfig.stopName);
    nameText.font = Font.boldSystemFont(12);
    nameText.textColor = new Color(busConfig.styling.textColor);
    
    headerStack.addSpacer();
    
    const timeText = isOffline && cacheAge ? "Cache " + cacheAge + "m" : formatTime(fetchTime);
    const timeLabel = headerStack.addText(timeText);
    timeLabel.font = Font.systemFont(9);
    timeLabel.textColor = new Color(busConfig.styling.textColor, 0.5);
    
    widget.addSpacer(4);
    
    if (displayData.length === 0) {
        const filterLines = busConfig.linesToShow;
        if (filterLines.length > 0) {
            const emptyText = widget.addText("No buses matching filter\nLines: " + filterLines.join(", "));
            emptyText.font = Font.systemFont(11);
            emptyText.textColor = new Color(busConfig.styling.textColor, 0.6);
            emptyText.centerAlignText();
        } else {
            const emptyText = widget.addText("No departures in next 60 min");
            emptyText.font = Font.systemFont(11);
            emptyText.textColor = new Color(busConfig.styling.textColor, 0.5);
            emptyText.centerAlignText();
        }
        
        widget.refreshAfterDate = new Date(Date.now() + busConfig.refreshIntervalMinutes * 60 * 1000);
        return widget;
    }
    
    if (isOffline) {
        const offlineWarning = widget.addText("Offline - Showing cached data");
        offlineWarning.font = Font.systemFont(9);
        offlineWarning.textColor = new Color(busConfig.styling.errorColor);
        widget.addSpacer(4);
    }
    
    for (const dep of displayData) {
        const rowStack = widget.addStack();
        rowStack.layoutHorizontally();
        
        const lineBox = rowStack.addStack();
        const boxColor = dep.lineColor || busConfig.styling.primaryColor;
        lineBox.backgroundColor = new Color(boxColor);
        lineBox.cornerRadius = 3;
        lineBox.size = new Size(24, 20);
        lineBox.centerAlignContent();
        
        const lineText = lineBox.addText(dep.line);
        lineText.font = Font.boldSystemFont(11);
        lineText.textColor = Color.black();
        
        rowStack.addSpacer(6);
        
        const destText = rowStack.addText(dep.destination);
        destText.font = Font.systemFont(11);
        destText.textColor = new Color(busConfig.styling.textColor);
        
        rowStack.addSpacer();
        
        const eta = calculateETA(dep.expectedTime);
        
        const etaText = rowStack.addText(eta);
        etaText.font = Font.boldSystemFont(12);
        etaText.textColor = new Color(busConfig.styling.textColor);
        
        widget.addSpacer(4);
    }
    
    widget.refreshAfterDate = new Date(Date.now() + busConfig.refreshIntervalMinutes * 60 * 1000);
    
    return widget;
}

// ============================================================================
// UTILITIES
// ============================================================================

function calculateETA(arrival) {
    const now = new Date();
    const diffMs = arrival.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    
    const hours = arrival.getHours().toString().padStart(2, "0");
    const minutes = arrival.getMinutes().toString().padStart(2, "0");
    const timeStr = hours + ":" + minutes;
    
    if (diffMinutes < 0) return "Dep. (" + timeStr + ")";
    if (diffMinutes < 1) return "Now (" + timeStr + ")";
    return diffMinutes + " min (" + timeStr + ")";
}

function truncateString(str, maxLength) {
    if (!str) return "";
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + "...";
}

function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return hours + ":" + minutes;
}

function log(message) {
    console.log("[BusWidget] " + message);
}

function parseApiTimestamp(timestamp) {
    if (!timestamp) return new Date(0);
    if (timestamp.includes("+") || timestamp.includes("Z")) {
        return new Date(timestamp);
    }
    const parts = timestamp.split("T");
    if (parts.length === 2) {
        const timePart = parts[1];
        if (timePart.split(":").length === 2) {
            return new Date(timestamp + ":00+02:00");
        }
        return new Date(timestamp + "+02:00");
    }
    return new Date(timestamp);
}
