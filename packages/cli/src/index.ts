#!/usr/bin/env node
import { buildCommand } from './commands/build.js'
import { createCommand } from './commands/create.js'
import { devCommand } from './commands/dev.js'

async function main(): Promise<void> {
  const [commandOrName, ...args] = process.argv.slice(2)

  if (!commandOrName || commandOrName === '--help' || commandOrName === '-h') {
    printHelp()
    return
  }

  if (commandOrName === 'create') {
    await createCommand(args)
    return
  }

  if (commandOrName === 'dev') {
    await devCommand(args)
    return
  }

  if (commandOrName === 'build') {
    await buildCommand(args)
    return
  }

  await createCommand([commandOrName, ...args])
}

function printHelp(): void {
  console.log(`PageMint CLI

Usage:
  create-pagemint <name>
  create-pagemint create <name>
  create-pagemint dev
  create-pagemint build
`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
