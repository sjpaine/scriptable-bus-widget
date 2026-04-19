# Bus Widget for Scriptable

A native iOS widget that displays real-time bus departures from Dutch public transit stops using the OV API.

## Features

- Real-time bus departure times from NDOV Loket
- Filter by specific bus lines (or show all)
- Offline caching for reliable display
- Compact layout showing 5 departures
- Delay times displayed in red

## Requirements

- [Scriptable](https://scriptable.app/) app for iOS
- iOS 14+ for widget support

## Quick Start (on Mac)

1. Install Scriptable from the App Store
2. Clone this repository on your Mac:
   ```bash
   git clone https://github.com/sjpaine/scriptable-bus-widget.git
   cd scriptable-bus-widget
   ```
3. Find your bus stop ID at [OVZoeker.nl](https://ovzoeker.nl/):
   - Search for your stop (e.g., "Utrecht Centraal")
   - Note the 7-8 digit code (TPC number)
4. Run the setup script:
   ```bash
   ./quickstart.sh
   ```
5. Enter your bus stop ID and name when prompted
6. Deploy:
   ```bash
   ./deploy.sh
   ```
7. Add the widget to your home screen on iPhone:
   - Long-press home screen → "+" icon
   - Search "Scriptable"
   - Choose widget size
   - Select "bus-widget"

## Finding Your Stop ID

1. Go to [OVZoeker.nl](https://ovzoeker.nl/)
2. Search for your stop (e.g., "Veldhuizen" or "Utrecht Centraal")
3. Click on the correct stop in the results
4. Look for the "TPC" or "Timing Point Code" - it's a 7-8 digit number (like `50000001` or `51200124`)
5. Copy this number for use in the quickstart script

## Manual Configuration

Edit `config.json` in the Scriptable iCloud folder:

```json
{
  "stopId": "50000001",
  "stopName": "Utrecht Centraal",
  "linesToShow": [],
  "maxDepartures": 5,
  "refreshIntervalMinutes": 2
}
```

| Setting | Description |
|---------|-------------|
| `stopId` | 7-8 digit Timing Point Code from OVZoeker.nl |
| `stopName` | Display name for the stop |
| `linesToShow` | Bus lines to show (empty = all) |
| `maxDepartures` | Number to display (1-5) |

## Files

| File | Description |
|------|-------------|
| `bus-widget.js` | Main widget script |
| `config.json` | Your configuration (not in git) |
| `deploy.sh` | Deploy to iCloud Scriptable |
| `quickstart.sh` | Interactive setup |

## Data Source

Data provided by [OV API](http://v0.ovapi.nl/) from NDOV Loket.

## License

MIT License