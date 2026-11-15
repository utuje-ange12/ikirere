import axios from "axios"
import { CliError } from "./errors.js"

const timeout = Number(process.env.IKIRERE_TIMEOUT_MS) || 8000

async function get(url, params) {
    try {
        const res = await axios.get(url, { params, timeout })
        return res.data
    } catch (err) {
        if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
            throw new CliError(`The request timed out after ${timeout} ms. Please try again.`, 4)
        }
        if (err.response) {
            throw new CliError(`The weather service returned an error (HTTP ${err.response.status}).`, 4)
        }
        if (err.request) {
            throw new CliError("Network error. Check your internet connection and try again.", 4)
        }
        throw err
    }
}

// Request 1: city name -> coordinates
export async function geocode(city) {
    const data = await get("https://geocoding-api.open-meteo.com/v1/search", {
        name: city,
        count: 1,
        language: "en",
        format: "json",
    })
    if (!data.results || data.results.length === 0) {
        throw new CliError(`City "${city}" was not found. Check the spelling and try again.`, 3)
    }
    const r = data.results[0]
    return { name: r.name, country: r.country, latitude: r.latitude, longitude: r.longitude }
}

// Request 2: coordinates -> forecast
export async function getForecast(place, units, days) {
    const imperial = units === "imperial"
    return get("https://api.open-meteo.com/v1/forecast", {
        latitude: place.latitude,
        longitude: place.longitude,
        current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
        timezone: "auto",
        forecast_days: days,
        temperature_unit: imperial ? "fahrenheit" : "celsius",
        wind_speed_unit: imperial ? "mph" : "kmh",
    })
}