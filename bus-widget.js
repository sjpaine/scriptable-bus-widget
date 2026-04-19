// Bus Widget for Scriptable
// Displays real-time bus departures from NDOV Loket via OV API
// Version: 1.1.5 (2026-04-19)
// Configuration: config.json in Scriptable documents directory
// Version: 1.1.5 (2026-04-19)

const busConfig = loadConfiguration();
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

function loadConfiguration() {
    try {
        const fm = FileManager.iCloud();
        const configPath = fm.joinPath(fm.documentsDirectory(), "config.json");
        
        if (!fm.fileExists(configPath)) {
            throw new Error("config.json not found");
        }
        
        const configData = JSON.parse(fm.readString(configPath));
        
        return {
            stopId: configData.stopId,
            stopName: configData.stopName,
            linesToShow: configData.linesToShow || [],
            maxDepartures: configData.maxDepartures || 3,
            refreshIntervalMinutes: configData.refreshIntervalMinutes || 2,
            apiEndpoint: configData.apiEndpoint,
            styling: configData.styling,
            cache: configData.cache,
            runsInWidget: config.runsInWidgetContext
        };
    } catch (error) {
        const widget = new ListWidget();
        widget.backgroundColor = Color.white();
        const text = widget.addText("Config error: " + error.message);
        text.font = Font.systemFont(12);
        text.textColor = Color.red();
        Script.setWidget(widget);
        Script.complete();
        throw error;
    }
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
            saveCache(null);
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
        
        const expectedTime = parseApiTimestamp(pass.ExpectedArrivalTime);
        const targetTime = parseApiTimestamp(pass.TargetArrivalTime);
        const delayMs = expectedTime.getTime() - targetTime.getTime();
        const delayMinutes = Math.round(delayMs / 60000);
        
        result.push({
            line: pass.LinePublicNumber,
            destination: truncateString(pass.DestinationName50, 20),
            expectedArrivalISO: pass.ExpectedArrivalTime,
            targetArrivalISO: pass.TargetArrivalTime,
            expectedTime: expectedTime,
            delay: delayMinutes,
            operator: pass.OperatorCode
        });
    }
    
    result.sort((a, b) => a.expectedTime.getTime() - b.expectedTime.getTime());
    
    return result.slice(0, busConfig.maxDepartures);
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

function getCachePath() {
    const fm = FileManager.iCloud();
    return fm.joinPath(fm.documentsDirectory(), "bus-widget-cache.json");
}

function saveCache(departures) {
    if (!busConfig.cache.enabled) return;
    
    try {
        const fm = FileManager.iCloud();
        const cachePath = getCachePath();
        
        const cacheData = {
            timestamp: new Date().toISOString(),
            stopId: busConfig.stopId,
            departures: departures.map(dep => ({
                line: dep.line,
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
        
        if (cacheAgeMinutes > busConfig.cache.maxAgeMinutes) {
            return { expired: true, data: cacheData.departures, age: Math.round(cacheAgeMinutes) };
        }
        
        return { data: cacheData.departures, age: Math.round(cacheAgeMinutes) };
        
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
    
    // Header - stop name left, time right
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
    
    // Error states
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
    
    // Departures - compact list
    for (const dep of displayData) {
        const rowStack = widget.addStack();
        rowStack.layoutHorizontally();
        rowStack.setPadding(2, 0, 2, 0);
        
        // Line number box (small yellow badge)
        const lineBox = rowStack.addStack();
        lineBox.backgroundColor = new Color(busConfig.styling.primaryColor);
        lineBox.cornerRadius = 3;
        lineBox.size = new Size(24, 20);
        lineBox.centerAlignContent();
        
        const lineText = lineBox.addText(dep.line);
        lineText.font = Font.boldSystemFont(11);
        lineText.textColor = Color.black();
        
        rowStack.addSpacer(6);
        
        // Destination (takes remaining space)
        const destText = rowStack.addText(truncateString(dep.destination, 18));
        destText.font = Font.systemFont(11);
        destText.textColor = new Color(busConfig.styling.textColor);
        
        // Time right-aligned at end
        const timeStack = rowStack.addStack();
        timeStack.layoutHorizontally();
        
        const eta = calculateETA(dep.expectedTime);
        
        if (dep.delay > 1) {
            const delayText = timeStack.addText("+" + dep.delay);
            delayText.font = Font.systemFont(9);
            delayText.textColor = new Color(busConfig.styling.errorColor);
            timeStack.addSpacer(2);
        }
        
        const etaText = timeStack.addText(eta);
        etaText.font = Font.boldSystemFont(12);
        
        if (dep.delay > 1) {
            etaText.textColor = new Color(busConfig.styling.errorColor);
        } else {
            etaText.textColor = new Color(busConfig.styling.textColor);
        }
        
        widget.addSpacer(2);
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
    
    if (diffMinutes < 0) return "Dep.";
    if (diffMinutes < 1) return "Now";
    return diffMinutes + " min";
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