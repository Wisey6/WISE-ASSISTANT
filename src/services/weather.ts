/**
 * Weather service — uses the free Open-Meteo API (no key needed).
 *
 * We fetch a 7-day forecast for a single lat/lon and summarise it
 * into a human-readable blob the owl can fold into its weekly
 * briefing notification.
 *
 * Open-Meteo docs: https://open-meteo.com/en/docs
 */

const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export interface DailyForecast {
  /** ISO date (YYYY-MM-DD) for the day. */
  date: string;
  /** Highest temperature in °C. */
  high: number;
  /** Lowest temperature in °C. */
  low: number;
  /** WMO weather code — translates to a text description below. */
  code: number;
  /** Probability of precipitation (%). */
  precipitation: number;
  /** Human-readable condition (e.g. "sunny", "light rain"). */
  condition: string;
}

export interface WeekForecast {
  locationLabel: string;
  days: DailyForecast[];
}

/** Default location — swap to an app setting later if we add one. */
const DEFAULT_LOCATION = {
  lat: 51.5074, // London, UK
  lon: -0.1278,
  label: 'London',
};

/**
 * Translate a WMO weather code to a short English phrase.
 * See https://open-meteo.com/en/docs for the full table.
 */
function describeCode(code: number): string {
  if (code === 0) return 'clear';
  if ([1, 2].includes(code)) return 'mostly sunny';
  if (code === 3) return 'overcast';
  if ([45, 48].includes(code)) return 'foggy';
  if ([51, 53, 55].includes(code)) return 'drizzle';
  if ([61, 63].includes(code)) return 'light rain';
  if (code === 65) return 'heavy rain';
  if ([66, 67].includes(code)) return 'freezing rain';
  if ([71, 73, 75, 77].includes(code)) return 'snow';
  if ([80, 81, 82].includes(code)) return 'showers';
  if ([95, 96, 99].includes(code)) return 'thunderstorms';
  return 'mixed conditions';
}

/**
 * Fetch a 7-day forecast. Always resolves — on network errors it
 * returns null so the caller can skip the weather section gracefully.
 */
export async function fetchWeekForecast(
  location: { lat: number; lon: number; label: string } = DEFAULT_LOCATION,
): Promise<WeekForecast | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(location.lat),
      longitude: String(location.lon),
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'auto',
      forecast_days: '7',
    });

    const response = await fetch(`${OPEN_METEO_ENDPOINT}?${params.toString()}`);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: number[];
      };
    };

    const daily = data.daily;
    if (!daily || !daily.time) return null;

    const days: DailyForecast[] = daily.time.map((date, i) => {
      const code = daily.weather_code?.[i] ?? 0;
      return {
        date,
        high: Math.round(daily.temperature_2m_max?.[i] ?? 0),
        low: Math.round(daily.temperature_2m_min?.[i] ?? 0),
        code,
        precipitation: daily.precipitation_probability_max?.[i] ?? 0,
        condition: describeCode(code),
      };
    });

    return { locationLabel: location.label, days };
  } catch (err) {
    console.warn('[weather] fetch failed:', err);
    return null;
  }
}

/**
 * Format a forecast for a single day into a compact one-liner the
 * briefing notification can fit into an iOS notification body.
 */
export function describeDay(day: DailyForecast, label: string): string {
  const rainBit =
    day.precipitation >= 50 ? ` (${day.precipitation}% rain)` : '';
  return `${label}: ${day.condition}, ${day.low}–${day.high}°C${rainBit}`;
}

/**
 * Build a concise multi-line summary of the whole week's weather.
 */
export function summariseWeek(forecast: WeekForecast): string {
  const today = forecast.days[0];
  const worstRainDay = forecast.days.reduce((acc, d) =>
    d.precipitation > (acc?.precipitation ?? 0) ? d : acc,
  );
  const avgHigh = Math.round(
    forecast.days.reduce((s, d) => s + d.high, 0) / forecast.days.length,
  );

  const lines = [
    `Today: ${today.condition}, ${today.low}–${today.high}°C`,
    `Week average high: ${avgHigh}°C`,
  ];
  if (worstRainDay.precipitation >= 50) {
    const when = new Date(worstRainDay.date).toLocaleDateString(undefined, {
      weekday: 'long',
    });
    lines.push(
      `Rain likely ${when} (${worstRainDay.precipitation}%) — grab a jacket.`,
    );
  }
  return lines.join('\n');
}
