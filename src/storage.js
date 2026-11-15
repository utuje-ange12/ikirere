import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { CliError } from "./errors.js"

const dir = process.env.IKIRERE_HOME || path.join(os.homedir(), ".ikirere")
export const dataFile = path.join(dir, "data.json")

function defaults() {
    return { settings: { units: "metric" }, favourites: [], history: [] }
}

export async function load() {
    try {
        const raw = await fs.readFile(dataFile, "utf8")
        return { ...defaults(), ...JSON.parse(raw) }
    } catch (err) {
        if (err.code === "ENOENT") return defaults() // first run, no file yet
        if (err instanceof SyntaxError) {
            throw new CliError(`Your data file is not valid JSON: ${dataFile}\nDelete it to reset.`, 1)
        }
        throw err
    }
}

export async function save(data) {
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2), "utf8")
}