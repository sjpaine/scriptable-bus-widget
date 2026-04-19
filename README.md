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

## Quick Start

1. Install Scriptable from the App Store
2. Clone this repository:
   ```bash
   git clone https://github.com/sjpaine/scriptable-bus-widget.git
   cd scriptable-bus-widget
   ```
3. Run the setup script:
   ```bash
   ./quickstart.sh
   ```
4. Enter your bus stop ID and name when prompted
5. Deploy:
   ```bash
   ./deploy.sh
   ```
6. Add the widget to your home screen:
   - Long-press home screen → "+" icon
   - Search "Scriptable"
   - Choose widget size
   - Select "bus-widget"

## Finding Your Stop ID

1. Go to [OVZoeker.nl](https://ovzoeker.nl/)
2. Search for your stop
3. Copy the 7-8 digit code (TPC)

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