// server/index.js
import { createApp } from './app.js'

const port = process.env.PORT ?? 8787
createApp().listen(port, () => {
  console.log(`experience server listening on http://localhost:${port}`)
})
