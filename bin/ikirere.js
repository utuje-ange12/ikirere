#!/usr/bin/env node
import { parseArgs } from "node:util"
import { readFile } from "node:fs/promises"
import { CliError } from "../src/errors.js"
import { geocode, getForecast } from "../src/api.js"
import { load, save, dataFile } from "../src/storage.js"
import { printCurrent, printForecast, helpText } from "../src/format.js"

const MAX_HISTORY = 20

function resolveUnits(flag, data) {
    // Priority: --units flag, then IKIRERE_UNITS, then saved setting
    const units = String(flag ?? process.env.IKIRERE_UNITS ?? data.settings.units).toLowerCase()
    if (!["metric", "imperial"].includes(units)) {
        throw new CliError(`Invalid units "${units}". Use metric or imperial.`, 2)
    }
    return units
}

function resolveDays(value) {
    const days = Number(value ?? 3)
    if (!Number.isInteger(days) || days < 1 || days > 7) {
        throw new CliError("Days must be a whole number from 1 to 7.", 2)
    }
    return days
}

function cityFrom(words) {
    const city = words.join(" ").trim()
    if (city === "") throw new CliError('Please provide a city name, for example: ikirere kigali', 2)
    if (city.length > 100) throw new CliError("That city name is too long.", 2)
    return city
}

async function showWeather(cityWords, units, days, data, mode) {
    const place = await geocode(cityFrom(cityWords))
    const wx = await getForecast(place, units, days)
    if (mode === "forecast") printForecast(place, wx, units)
    else printCurrent(place, wx, units)

    data.history.unshift({ city: `${place.name}, ${place.country}`, at: new Date().toISOString() })
    data.history = data.history.slice(0, MAX_HISTORY)
    await save(data)
}

async function handleFav(args, data) {
    const [action, ...rest] = args
    if (action === "list") {
        if (data.favourites.length === 0) console.log("No favourites yet. Add one: ikirere fav add kigali")
        else data.favourites.forEach((f, i) => console.log(`${i + 1}. ${f}`))
        return
    }
    if (action === "add") {
        const place = await geocode(cityFrom(rest)) // confirms the city exists
        const label = `${place.name}, ${place.country}`
        if (data.favourites.some((f) => f.toLowerCase() === label.toLowerCase())) {
            console.log(`${label} is already in your favourites.`)
            return
        }
        data.favourites = [...data.favourites, label]
        await save(data)
        console.log(`Added ${label} to favourites.`)
        return
    }
    if (action === "remove") {
        const name = cityFrom(rest).toLowerCase()
        const match = data.favourites.find((f) => f.toLowerCase().startsWith(name))
        if (!match) throw new CliError(`"${rest.join(" ")}" is not in your favourites.`, 3)
        data.favourites = data.favourites.filter((f) => f !== match)
        await save(data)
        console.log(`Removed ${match} from favourites.`)
        return
    }
    throw new CliError("Use: ikirere fav add <city> | fav list | fav remove <city>", 2)
}

async function handleHistory(clear, data) {
    if (clear) {
        data.history = []
        await save(data)
        console.log("History cleared.")
        return
    }
    if (data.history.length === 0) {
        console.log("No history yet.")
        return
    }
    data.history.forEach((h, i) => console.log(`${i + 1}. ${h.city}  (${h.at.slice(0, 16).replace("T", " ")})`))
}

async function handleSettings(args, data) {
    const [key, value] = args
    if (!key) {
        console.log(`Units: ${data.settings.units}\nData file: ${dataFile}`)
        return
    }
    if (key === "units") {
        const units = resolveUnits(value, data) // validates the value
        data.settings = { ...data.settings, units }
        await save(data)
        console.log(`Default units set to ${units}.`)
        return
    }
    throw new CliError(`Unknown setting "${key}". Available: units`, 2)
}

async function main() {
    let parsed
    try {
        parsed = parseArgs({
            allowPositionals: true,
            options: {
                units: { type: "string", short: "u" },
                days: { type: "string", short: "d" },
                clear: { type: "boolean" },
                help: { type: "boolean", short: "h" },
                version: { type: "boolean", short: "v" },
            },
        })
    } catch (err) {
        throw new CliError(`${err.message}\nRun "ikirere --help" for usage.`, 2)
    }

    const { values, positionals } = parsed

    if (values.version) {
        const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))
        console.log(pkg.version)
        return
    }
    if (values.help || positionals.length === 0) {
        console.log(helpText)
        return
    }

    const data = await load()
    const [command, ...rest] = positionals

    if (command === "fav") return handleFav(rest, data)
    if (command === "history") return handleHistory(values.clear, data)
    if (command === "settings") return handleSettings(rest, data)

    const units = resolveUnits(values.units, data)
    if (command === "forecast") {
        return showWeather(rest, units, resolveDays(values.days), data, "forecast")
    }
    return showWeather(positionals, units, 1, data, "current")
}

main().catch((err) => {
    if (err instanceof CliError) {
        console.error(`Error: ${err.message}`)
        process.exitCode = err.exitCode
    } else {
        console.error(`Unexpected error: ${err.message}`)
        process.exitCode = 1
    }
})