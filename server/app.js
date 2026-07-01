// server/app.js
import express from 'express'
import { runExperiencePipeline } from './pipeline.js'

export function createApp({ pipeline = runExperiencePipeline } = {}) {
  const app = express()
  app.use(express.json({ limit: '20mb' })) // base64 book photos

  app.get('/api/health', (req, res) => {
    res.json({ ok: true })
  })

  app.post('/api/experience', async (req, res) => {
    const { imageBase64, mediaType } = req.body ?? {}
    if (!imageBase64 || !mediaType) {
      res.status(400).json({ error: 'imageBase64 and mediaType are required' })
      return
    }

    // NDJSON stream: one JSON event per line
    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Cache-Control', 'no-cache')

    const emit = (event) => {
      res.write(JSON.stringify(event) + '\n')
    }

    try {
      await pipeline({ imageBase64, mediaType, emit })
    } catch (err) {
      emit({ type: 'error', message: err?.message ?? 'pipeline failed' })
    } finally {
      res.end()
    }
  })

  return app
}
