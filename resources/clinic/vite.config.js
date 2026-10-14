import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// Build-time only: record the actual shipped files and their source content.
// Metadata records frontend source and output checksums.
function buildInfo() {
  const root = import.meta.dirname
  function hashes(directory, base = directory) {
    const result = {}
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) Object.assign(result, hashes(path, base))
      else result[relative(base, path).replaceAll('\\', '/')] = createHash('sha256').update(readFileSync(path)).digest('hex')
    }
    return result
  }
  return {
    name: 'frontend-build-info',
    apply: 'build',
    writeBundle() {
      const sources = { ...hashes(join(root, 'src'), root), ...hashes(join(root, 'public'), root) }
      for (const name of ['index.html', 'package.json', 'package-lock.json', 'vite.config.js']) {
        sources[name] = createHash('sha256').update(readFileSync(join(root, name))).digest('hex')
      }
      const dist = join(root, 'dist')
      const files = hashes(dist)
      delete files['build-info.json']
      writeFileSync(join(dist, 'build-info.json'), JSON.stringify({ format: 1, sources, files }, null, 2))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), buildInfo()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
  server: {
    strictPort: true,
    proxy: {
      '/app-logo.png': { target: 'http://skin-goddess', changeOrigin: true },
      '/skin-goddess.ico': { target: 'http://skin-goddess', changeOrigin: true },
      '/api': {
        target: 'http://skin-goddess',
        changeOrigin: true,
      },
    },
  },
})
