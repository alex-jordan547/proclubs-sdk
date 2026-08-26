import { writeFileSync } from 'node:fs'
import {
  runCompatibilityCheck,
  type CompatibilityRunnerOptions,
} from '../src/compatibility.js'
import { PLATFORMS } from '../src/constants.js'

async function main() {
  const requestedPlatform = process.env.TARGET_PLATFORM ?? 'common-gen5'
  const targetPlatform = PLATFORMS.find(
    (platform) => platform === requestedPlatform,
  )
  if (!targetPlatform) {
    console.error(
      `Unknown platform: ${requestedPlatform}. Valid platforms: ${PLATFORMS.join(', ')}`,
    )
    process.exit(1)
  }
  const outputPath = process.env.COMPATIBILITY_REPORT_PATH
  const searchQuery = process.env.COMPATIBILITY_SEARCH_QUERY?.trim()

  console.log('--- Pro Clubs SDK Compatibility & Drift Check ---')
  console.log(`Platform: ${targetPlatform}`)
  console.log('Running sequential compatibility probes...\n')

  let compatibilityOptions: CompatibilityRunnerOptions = {
    platform: targetPlatform,
    onProgress: (endpoint, status) => {
      console.log(`  - ${endpoint.padEnd(20)} : ${status}`)
    },
  }
  if (searchQuery) {
    compatibilityOptions = { ...compatibilityOptions, searchQuery }
  }

  const result = await runCompatibilityCheck(compatibilityOptions)

  console.log('\n--- Summary Report ---')
  console.log(`Status:         ${result.report.summary.status.toUpperCase()}`)
  console.log(
    `Recommendation: ${result.report.summary.recommendation.toUpperCase()}`,
  )
  if (result.stoppedEarly) {
    console.log(`Stopped early:  ${result.stopReason ?? 'Unknown reason'}`)
  }

  console.log('\n--- Platform Matrix ---')
  for (const platform of PLATFORMS) {
    const label = platform.padEnd(12)
    if (result.report.platform === platform) {
      console.log(`${label}: ${result.report.summary.status}`)
    } else {
      console.log(`${label}: unverified (no live probe)`)
    }
  }

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
