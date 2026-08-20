import { writeFileSync } from 'node:fs'
import { runCompatibilityCheck } from '../src/compatibility.js'
import type { Platform } from '../src/constants.js'

async function main() {
  const targetPlatform: Platform =
    (process.env.TARGET_PLATFORM as Platform) || 'common-gen5'
  const outputPath = process.env.COMPATIBILITY_REPORT_PATH

  console.log('--- Pro Clubs SDK Compatibility & Drift Check ---')
  console.log(`Platform: ${targetPlatform}`)
  console.log('Running sequential compatibility probes...\n')

  const result = await runCompatibilityCheck({
    platform: targetPlatform,
    onProgress: (endpoint, status) => {
      console.log(`  - ${endpoint.padEnd(20)} : ${status}`)
    },
  })

  console.log('\n--- Summary Report ---')
  console.log(`Status:         ${result.report.summary.status.toUpperCase()}`)
  console.log(
    `Recommendation: ${result.report.summary.recommendation.toUpperCase()}`,
  )
  if (result.stoppedEarly) {
    console.log(`Stopped early:  ${result.stopReason ?? 'Unknown reason'}`)
  }

  console.log('\n--- Platform Matrix ---')
  console.log(
    `common-gen5: ${result.report.platform === 'common-gen5' ? result.report.summary.status : 'unverified'}`,
  )
  console.log(
    `common-gen4: ${result.report.platform === 'common-gen4' ? result.report.summary.status : 'unverified (no live probe)'}`,
  )
  console.log(
    `nx:          ${result.report.platform === 'nx' ? result.report.summary.status : 'unverified (no live probe)'}`,
  )

  if (outputPath) {
    writeFileSync(outputPath, JSON.stringify(result.report, null, 2), 'utf8')
    console.log(`\nSaved sanitized JSON report to ${outputPath}`)
  }

  if (result.report.summary.status === 'drifted' || result.stoppedEarly) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err)
  process.exit(1)
})
