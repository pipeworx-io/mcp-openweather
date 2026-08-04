# mcp-openweather

OpenWeather MCP — wraps the OpenWeatherMap API (openweathermap.org)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `current_weather` | Get the current weather for a city or coordinates: temperature, "feels like", conditions, humidity, wind speed, and cloud cover. Example: current_weather({ city: "London", units: "metric" }) |
| `forecast` | Get a multi-step weather forecast (3-hour intervals) for a city or coordinates: temperature, conditions, wind speed, and precipitation probability over time. Example: forecast({ city: "Tokyo", count: 8 }) |
| `air_quality` | Get the current air quality for a set of coordinates: an air quality index (AQI, 1=Good to 5=Very Poor) plus pollutant component concentrations (CO, NO2, O3, PM2.5, PM10, etc.). Example: air_quality({ lat: 51.5, lon: -0.12 }) |
| `geocode` | Resolve a place name (city, optionally with state/country) to geographic coordinates (latitude/longitude). Useful before calling air_quality, which needs lat/lon. Example: geocode({ query: "Paris", limit: 5 }) |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "openweather": {
      "url": "https://gateway.pipeworx.io/openweather/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Openweather data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
