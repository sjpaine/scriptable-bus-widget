# Bus Widget for Scriptable

A native iOS widget that displays real-time bus departures from Dutch public transit stops using the OV API.

## Features

- Real-time bus departure times from NDOV Loket
- Configurable stop ID and display name
- Filter by specific bus lines (or show all)
- Offline caching for reliable display
- U-OV branding (yellow/black)
- Configurable refresh interval

## Requirements

- [Scriptable](https://scriptable.app/) app for iOS
- iOS 14+ for widget support

## Installation

1. Install Scriptable from the App Store
2. Copy `bus-widget.js` and `config.example.json` to your Scriptable iCloud folder:
   - Open Files app → iCloud Drive → Scriptable
   - Rename `config.example.json` to `config.json`
3. Edit `config.json` with your stop details (see Configuration below)

## Configuration

Copy `config.example.json` to `config.json` and customize:

```json
{
  "stopId": "50000001",
  "stopName": "Utrecht Centraal",
  "linesToShow": [],
  "maxDepartures": 3,
  "refreshIntervalMinutes": 2,
  "apiEndpoint": "http://v0.ovapi.nl/tpc/",
  "styling": {
    "backgroundColor": "#FFFFFF",
    "primaryColor": "#FFE600",
    "textColor": "#000000",
    "errorColor": "#FF0000"
  },
  "cache": {
    "enabled": true,
    "maxAgeMinutes": 10
  }
}
```

| Setting | Description |
|---------|-------------|
| `stopId` | 7-8 digit Timing Point Code (TPC) from [OVZoeker.nl](https://ovzoeker.nl/) |
| `stopName` | Display name for the stop |
| `linesToShow` | Array of bus lines to filter (empty = all lines) |
| `maxDepartures` | Number of departures to display (1-5) |
| `refreshIntervalMinutes` | Widget refresh interval |

## Finding Your Stop ID

1. Go to [OVZoeker.nl](https://ovzoeker.nl/)
2. Search for your stop
3. Copy the 7-8 digit code (TPC)

## Usage

### Run in App
Open Scriptable and tap the script to preview the widget.

### Add Widget to Home Screen
1. Long-press home screen → "+" icon
2. Search for "Scriptable"
3. Choose Small or Medium widget size
4. Tap widget → Select "bus-widget"
5. Configure "When Interacting" to refresh frequency

## Data Source

Data provided by [OV API](http://v0.ovapi.nl/) from NDOV Loket.

## License

MIT License - See LICENSE file.