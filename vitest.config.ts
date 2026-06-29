import { defineConfig } from 'vitest/config'

// better-sqlite3 is compiled against Electron's ABI and cannot be required under
// plain Node/vitest, so DB tests use Node's built-in node:sqlite (DatabaseSync),
// which needs the --experimental-sqlite flag. We run tests in forked child
// processes so we can pass that flag to each worker via execArgv.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--experimental-sqlite']
      }
    }
  }
})
