// server/app.js
import express from 'express'
import fs from 'node:fs'
import { runExperiencePipeline } from './pipeline.js'
import { reimaginePassage } from './reimagine.js'
import { illustratePrompt } from './illustrate.js'
import { GENERATED_DIR } from './paths.js'

export function createApp({
  pipeline = runExperiencePipeline,
  reimagine = reimaginePassage,
  illustrate = illustratePrompt,
} = {}) {
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

  // Literary Image Lab: render a student's interpretation prompt as one
  // possible illustration (a hypothesis, not an answer).
  app.post('/api/illustrate', async (req, res) => {
    const { prompt } = req.body ?? {}
    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' })
      return
    }
    try {
      const src = await illustrate({ prompt })
      res.json({ src })
    } catch (err) {
      res.status(500).json({ error: err?.message ?? 'illustration failed' })
    }
  })

  app.post('/api/reimagine', async (req, res) => {
    const { text, sceneTitle, wish, bookText, staging } = req.body ?? {}
    if (!text || !wish) {
      res.status(400).json({ error: 'text and wish are required' })
      return
    }

    // NDJSON stream: still image first, then the animated loop when ready
    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Cache-Control', 'no-cache')

    const emit = (event) => {
      res.write(JSON.stringify(event) + '\n')
    }

    try {
      await reimagine({ text, sceneTitle, wish, bookText, staging, emit })
    } catch (err) {
      emit({ type: 'error', message: err?.message ?? 'reimagine failed' })
    } finally {
      res.end()
    }
  })

  return app
}
