// Apply Electron fuses for production security hardening
// Run after packaging: node scripts/fuses.js <path-to-electron-binary>

import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses'
import { join } from 'path'

const electronPath = process.argv[2]

if (!electronPath) {
  console.error('Usage: node scripts/fuses.js <path-to-electron-binary>')
  console.error('Example: node scripts/fuses.js release/mac-arm64/ActivePaper.app/Contents/Frameworks/Electron\\ Framework.framework/Electron\\ Framework')
  process.exit(1)
}

async function applyFuses() {
  try {
    await flipFuses(electronPath, {
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    })
    console.log('Electron fuses applied successfully')
  } catch (err) {
    console.error('Failed to apply fuses:', err)
    process.exit(1)
  }
}

applyFuses()
