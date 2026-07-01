// server/paths.js
import path from 'node:path'

export const GENERATED_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  'generated',
)
