import { spawnSync } from 'node:child_process'
import { access, cp, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const clinic = dirname(fileURLToPath(import.meta.url))
const project = resolve(clinic, '../..')
const vite = join(clinic, 'node_modules/vite/bin/vite.js')

try {
  await access(vite)
} catch {
  throw new Error('Clinic dependencies are missing. Run npm ci in resources/clinic, then rebuild.')
}

const result = spawnSync(process.execPath, [vite, 'build'], { cwd: clinic, stdio: 'inherit' })
if (result.error) throw result.error
if (result.status !== 0) throw new Error('The clinic Vite production build failed.')

const output = join(clinic, 'dist')
const publicDirectory = join(project, 'public')
await mkdir(join(publicDirectory, 'clinic'), { recursive: true })
await cp(join(output, 'index.html'), join(publicDirectory, 'clinic/index.html'))
await cp(join(output, 'assets'), join(publicDirectory, 'assets'), { recursive: true })
await cp(join(output, 'icons.svg'), join(publicDirectory, 'icons.svg'))
console.log('Clinic production files updated in Laravel public/.')
