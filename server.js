const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
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
