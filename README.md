# mcp-openweather

OpenWeather MCP — wraps the OpenWeatherMap API (openweathermap.org)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1679+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/openweather/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1679+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/current_weather \
  -H 'Content-Type: application/json' \
  -d '{"city":"London","units":"metric"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/current_weather`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "openweather": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-openweather"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-openweather
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Openweather data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
