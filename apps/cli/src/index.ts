#!/usr/bin/env node
import { Command } from "commander"

import { ApiClient } from "./api-client"
import {
	type CommandContext,
	dismissWarning,
	login,
	logout,
	readiness,
	restoreWarning,
	whoami,
} from "./commands"
import { loadConfig } from "./config"
import { CredentialStore } from "./credentials"
import { CliError } from "./errors"
import { ask } from "./prompt"

/** Commands print JSON on stdout; failures print { error } on stderr and exit 1. */
function run(action: (ctx: CommandContext) => Promise<unknown>) {
	return async () => {
		const config = loadConfig()
		const credentials = new CredentialStore(config.credentialsPath)
		const ctx: CommandContext = {
			config,
			credentials,
			api: new ApiClient(config, credentials),
			ask,
		}
		try {
			process.stdout.write(`${JSON.stringify(await action(ctx), null, 2)}\n`)
		} catch (error) {
			const status = error instanceof CliError ? error.status : undefined
			const message = error instanceof Error ? error.message : String(error)
			process.stderr.write(`${JSON.stringify({ error: { message, status } }, null, 2)}\n`)
			process.exitCode = 1
		}
	}
}

const program = new Command()
	.name("bhmc")
	.description(
		"BHMC admin CLI. Connects to BHMC_API_URL (default http://localhost:3333) as the logged-in operator.",
	)

program
	.command("login")
	.description("Log in with your admin account and store the token for this API URL")
	.option("--email <email>", "account email (prompted if omitted)")
	.action((options: { email?: string }) => run((ctx) => login(ctx, options))())

program
	.command("logout")
	.description("Revoke and forget the stored token for this API URL")
	.action(run(logout))

program
	.command("whoami")
	.description("Show the logged-in user and their admin roles")
	.action(run(whoami))

const readinessCommand = program
	.command("readiness")
	.description("Ready to Open Registration: findings for one event, or a summary of a season")
	.option("--event <id>", "one event, with its findings")
	.option("--season <year>", "every event of a season, summarized")
	.action((options: { event?: string; season?: string }) => run((ctx) => readiness(ctx, options))())

readinessCommand
	.command("dismiss <eventId> <code> [subject]")
	.description("Accept a readiness warning for an event (dry run unless --apply)")
	.option("--apply", "make the change")
	.action(
		(eventId: string, code: string, subject: string | undefined, options: { apply?: boolean }) =>
			run((ctx) => dismissWarning(ctx, { eventId, code, subject, apply: options.apply }))(),
	)

readinessCommand
	.command("restore <eventId> <code> [subject]")
	.description("Bring back a dismissed readiness warning (dry run unless --apply)")
	.option("--apply", "make the change")
	.action(
		(eventId: string, code: string, subject: string | undefined, options: { apply?: boolean }) =>
			run((ctx) => restoreWarning(ctx, { eventId, code, subject, apply: options.apply }))(),
	)

void program.parseAsync()
