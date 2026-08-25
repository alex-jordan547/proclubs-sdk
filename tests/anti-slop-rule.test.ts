import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('anti-slop rules', () => {
  it('checks JSX symbol names without flagging attributes, members, or namespaces', () => {
    const fixtureDirectory = mkdtempSync(join(tmpdir(), 'anti-slop-jsx-'))
    const fixturePath = join(fixtureDirectory, 'jsx-symbols.tsx')
    writeFileSync(
      fixturePath,
      `
        const value = 1
        const Widget = () => null
        const valid = (
          <>
            <Widget shape={value} />
            <Widget.shape />
            <svg:shape />
            <ShapeWidget />
          </>
        )
      `,
    )

    try {
      const result = spawnSync(
        resolve('node_modules/.bin/oxlint'),
        [
          fixturePath,
          '--config',
          resolve('.oxlintrc.json'),
          '--format',
          'json',
        ],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: {
            ...process.env,
            NODE_OPTIONS:
              `${process.env['NODE_OPTIONS'] ?? ''} --import tsx`.trim(),
          },
        },
      )

      expect(result.error).toBeUndefined()
      expect(result.status).toBe(1)
      expect(result.stdout).toContain('ShapeWidget')
      expect(result.stdout.match(/no-shape-in-symbol-names/g)).toHaveLength(1)
    } finally {
      rmSync(fixtureDirectory, { recursive: true, force: true })
    }
  })
})
