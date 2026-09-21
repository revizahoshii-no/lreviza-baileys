#!/usr/bin/env node

import { toError } from '@revizahoshii/hoshino/util'

import { runMcpServer } from './server'

void runMcpServer().catch((error) => {
    const err = toError(error)
    process.stderr.write(`fatal: ${err.stack ?? err.message}\n`)
    process.exit(1)
})
