const descriptions = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow",
    80: "Rain showers", 81: "Rain showers", 82: "Violent rain showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
}

const describe = (code) => descriptions[code] ?? "Unknown conditions"

function unitLabels(units) {
    return units === "imperial" ? { t: "°F", w: "mph" } : { t: "°C", w: "km/h" }
}

export function printCurrent(place, wx, units) {
    const { t, w } = unitLabels(units)
    const c = wx.current
    console.log(`\nWeather in ${place.name}, ${place.country}`)
    console.log(`  ${describe(c.weather_code)}`)
    console.log(`  Temperature : ${c.temperature_2m}${t} (feels like ${c.apparent_temperature}${t})`)
    console.log(`  Humidity    : ${c.relative_humidity_2m}%`)
    console.log(`  Wind        : ${c.wind_speed_10m} ${w}\n`)
}

export function printForecast(place, wx, units) {
    const { t } = unitLabels(units)
    const d = wx.daily
    console.log(`\n${d.time.length}-day forecast for ${place.name}, ${place.country}`)
    d.time.forEach((day, i) => {
        console.log(
            `  ${day}  ${describe(d.weather_code[i]).padEnd(22)} ` +
            `${d.temperature_2m_min[i]}${t} to ${d.temperature_2m_max[i]}${t}  ` +
            `rain ${d.precipitation_sum[i]} mm`
        )
    })
    console.log()
}

export const helpText = `
ikirere - weather in your terminal

Usage:
  ikirere <city>                    Current weather
  ikirere forecast <city> [-d N]    Forecast for N days (1-7, default 3)
  ikirere fav add <city>            Save a favourite city
  ikirere fav list                  Show favourites
  ikirere fav remove <city>         Remove a favourite
  ikirere history [--clear]         Show or clear recent searches
  ikirere settings                  Show settings
  ikirere settings units <metric|imperial>

Options:
  -u, --units <metric|imperial>     Override units for this run
  -d, --days <1-7>                  Number of forecast days
  -h, --help                        Show this help
  -v, --version                     Show version

Environment variables:
  IKIRERE_UNITS        Default units (metric or imperial)
  IKIRERE_TIMEOUT_MS   Request timeout in milliseconds (default 8000)
  IKIRERE_HOME         Folder for the data file (default ~/.ikirere)

Exit codes: 0 ok, 1 unexpected error, 2 bad input, 3 city not found, 4 network error
`