interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * OpenWeather MCP — wraps the OpenWeatherMap API (openweathermap.org)
 *
 * Tools:
 * - current_weather: current temperature, conditions, humidity, wind for a city or coordinates
 * - forecast: 3-hourly weather forecast (temperature, conditions, wind) for a city or coordinates
 * - air_quality: air quality index (AQI 1-5) and pollutant components for coordinates
 * - geocode: resolve a place name to latitude/longitude (and back)
 *
 * Dual-key model: _apiKey is OPTIONAL. The gateway injects a shared platform
 * key as _apiKey when the caller omits it; heavy users pass their own _apiKey
 * (the `appid` query param) for higher rate limits.
 */


const BASE_URL = 'https://api.openweathermap.org';

// Shared optional-key schema fragment — _apiKey is NOT required anywhere.
const API_KEY_PROP = {
  type: 'string',
  description:
    'Optional — your own OpenWeatherMap API key for higher limits; omit to use the shared Pipeworx key.',
} as const;

const tools: McpToolExport['tools'] = [
  {
    name: 'current_weather',
    description:
      'Get the current weather for a city or coordinates: temperature, "feels like", conditions, humidity, wind speed, and cloud cover. Example: current_weather({ city: "London", units: "metric" })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        city: {
          type: 'string',
          description: 'City name, optionally with country code, e.g. "London" or "London,GB". Provide this OR lat/lon.',
        },
        lat: { type: 'number', description: 'Latitude. Use with lon instead of city.' },
        lon: { type: 'number', description: 'Longitude. Use with lat instead of city.' },
        units: {
          type: 'string',
          enum: ['metric', 'imperial', 'standard'],
          description: 'Temperature units: "metric" (C, default), "imperial" (F), or "standard" (K).',
        },
        _apiKey: API_KEY_PROP,
      },
      required: [],
    },
  },
  {
    name: 'forecast',
    description:
      'Get a multi-step weather forecast (3-hour intervals) for a city or coordinates: temperature, conditions, wind speed, and precipitation probability over time. Example: forecast({ city: "Tokyo", count: 8 })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        city: {
          type: 'string',
          description: 'City name, optionally with country code, e.g. "Tokyo" or "Tokyo,JP". Provide this OR lat/lon.',
        },
        lat: { type: 'number', description: 'Latitude. Use with lon instead of city.' },
        lon: { type: 'number', description: 'Longitude. Use with lat instead of city.' },
        units: {
          type: 'string',
          enum: ['metric', 'imperial', 'standard'],
          description: 'Temperature units: "metric" (C, default), "imperial" (F), or "standard" (K).',
        },
        count: {
          type: 'number',
          description: 'Number of 3-hour forecast steps to return (default 8 = next 24h, max 40 = 5 days).',
        },
        _apiKey: API_KEY_PROP,
      },
      required: [],
    },
  },
  {
    name: 'air_quality',
    description:
      'Get the current air quality for a set of coordinates: an air quality index (AQI, 1=Good to 5=Very Poor) plus pollutant component concentrations (CO, NO2, O3, PM2.5, PM10, etc.). Example: air_quality({ lat: 51.5, lon: -0.12 })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        lat: { type: 'number', description: 'Latitude.' },
        lon: { type: 'number', description: 'Longitude.' },
        _apiKey: API_KEY_PROP,
      },
      required: ['lat', 'lon'],
    },
  },
  {
    name: 'geocode',
    description:
      'Resolve a place name (city, optionally with state/country) to geographic coordinates (latitude/longitude). Useful before calling air_quality, which needs lat/lon. Example: geocode({ query: "Paris", limit: 5 })',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Place name to look up, e.g. "Paris", "Springfield,IL,US".',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of matching locations to return (default 5).',
        },
        _apiKey: API_KEY_PROP,
      },
      required: ['query'],
    },
  },
];

// -- HTTP helper -------------------------------------------------------------

async function owmGet(path: string, params: URLSearchParams): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}?${params}`);
  if (!res.ok) {
    const text = await res.text();
    return { error: res.status, message: text };
  }
  return res.json();
}

// -- callTool dispatcher -----------------------------------------------------

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string | undefined;
  delete args._apiKey;

  if (!apiKey) {
    return { error: 'api_key_required', message: 'No OpenWeatherMap key available.' };
  }

  switch (name) {
    case 'current_weather':
      return currentWeather(args, apiKey);
    case 'forecast':
      return forecast(args, apiKey);
    case 'air_quality':
      return airQuality(args, apiKey);
    case 'geocode':
      return geocode(args, apiKey);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// -- Tools -------------------------------------------------------------------

async function currentWeather(args: Record<string, unknown>, apiKey: string) {
  const units = (args.units as string | undefined) ?? 'metric';
  const params = new URLSearchParams({ appid: apiKey, units });
  if (args.city) {
    params.set('q', args.city as string);
  } else {
    params.set('lat', String(args.lat));
    params.set('lon', String(args.lon));
  }

  const data = (await owmGet('/data/2.5/weather', params)) as Record<string, any>;
  if (data && (data as any).error !== undefined) return data;

  return {
    name: data.name,
    country: data.sys?.country,
    weather: data.weather?.[0]?.description,
    temp: data.main?.temp,
    feels_like: data.main?.feels_like,
    humidity: data.main?.humidity,
    wind_speed: data.wind?.speed,
    clouds: data.clouds?.all,
  };
}

async function forecast(args: Record<string, unknown>, apiKey: string) {
  const units = (args.units as string | undefined) ?? 'metric';
  const count = Math.min(40, (args.count as number | undefined) ?? 8);
  const params = new URLSearchParams({ appid: apiKey, units, cnt: String(count) });
  if (args.city) {
    params.set('q', args.city as string);
  } else {
    params.set('lat', String(args.lat));
    params.set('lon', String(args.lon));
  }

  const data = (await owmGet('/data/2.5/forecast', params)) as Record<string, any>;
  if (data && (data as any).error !== undefined) return data;

  return {
    city: data.city?.name,
    country: data.city?.country,
    forecast: (data.list ?? []).map((f: any) => ({
      time: f.dt_txt,
      temp: f.main?.temp,
      weather: f.weather?.[0]?.description,
      wind_speed: f.wind?.speed,
      pop: f.pop,
    })),
  };
}

async function airQuality(args: Record<string, unknown>, apiKey: string) {
  const params = new URLSearchParams({
    appid: apiKey,
    lat: String(args.lat),
    lon: String(args.lon),
  });

  const data = (await owmGet('/data/2.5/air_pollution', params)) as Record<string, any>;
  if (data && (data as any).error !== undefined) return data;

  return {
    aqi: data.list?.[0]?.main?.aqi,
    components: data.list?.[0]?.components,
  };
}

async function geocode(args: Record<string, unknown>, apiKey: string) {
  const limit = (args.limit as number | undefined) ?? 5;
  const params = new URLSearchParams({
    appid: apiKey,
    q: args.query as string,
    limit: String(limit),
  });

  const data = (await owmGet('/geo/1.0/direct', params)) as any;
  if (data && !Array.isArray(data) && data.error !== undefined) return data;

  return (data as any[]).map((r) => ({
    name: r.name,
    country: r.country,
    state: r.state,
    lat: r.lat,
    lon: r.lon,
  }));
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
