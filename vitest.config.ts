import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Scan only this checkout's tests, not a git worktree nested under .claude/.
    dir: 'tests',
  },
})
