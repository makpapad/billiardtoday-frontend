const fs = require('fs')
const { createServer } = require('http')
const path = require('path')
const { parse } = require('url')
const next = require('next')

const loadEnvFile = (filename) => {
  const fullPath = path.join(__dirname, filename)
  if (!fs.existsSync(fullPath)) return

  for (const line of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue

    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

for (const filename of ['.env.production.local', '.env.local', '.env.production', '.env']) {
  loadEnvFile(filename)
}

// Ensure fetch/Request/Response exist on Node runtime
try {
  // Polyfill Web Streams needed by undici
  const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web')
  globalThis.ReadableStream = ReadableStream
  globalThis.WritableStream = WritableStream
  globalThis.TransformStream = TransformStream

  const { fetch, Request, Response, Headers, FormData, File, Blob } = require('undici')
  globalThis.fetch = fetch
  globalThis.Request = Request
  globalThis.Response = Response
  globalThis.Headers = Headers
  globalThis.FormData = FormData
  globalThis.File = File
  globalThis.Blob = Blob
} catch (err) {
  console.warn('Could not polyfill fetch globals:', err)
}

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3022', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})
