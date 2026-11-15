// Exit codes: 0 ok, 1 unexpected, 2 bad input, 3 not found, 4 network or timeout
export class CliError extends Error {
    constructor(message, exitCode = 1) {
        super(message)
        this.exitCode = exitCode
    }
}