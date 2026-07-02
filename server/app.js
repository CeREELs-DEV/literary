// server/app.js
import express from 'express'
import fs from 'node:fs'
import { runExperiencePipeline } from './pipeline.js'
import { reimaginePassage } from './reimagine.js'
import { GENERATED_DIR } from './paths.js'

export function createApp({ pipeline = runExperiencePipeline, reimagine = reimaginePassage } = {}) {
  const app = express()
  app.use(express.json({ limit: '20mb' })) // base64 book photos
  fs.mkdirSync(GENERATED_DIR, { recursive: true })
  app.use('/api/media', express.static(GENERATED_DIR))

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

  app.post('/api/reimagine', async (req, res) => {
    const { text, sceneTitle, wish } = req.body ?? {}
    if (!text || !wish) {
      res.status(400).json({ error: 'text and wish are required' })
      return
    }
    try {
      res.json(await reimagine({ text, sceneTitle, wish }))
    } catch (err) {
      res.status(500).json({ error: err?.message ?? 'reimagine failed' })
    }
  })

  return app
}
