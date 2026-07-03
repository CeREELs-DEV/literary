// server/gif.js
import { spawn } from 'node:child_process'

// Convert a generated mp4 loop into a real animated GIF (palette-optimized,
// infinite loop). Requires ffmpeg on PATH; callers treat failure as
// non-fatal and fall back to serving the mp4.
export function mp4ToGif(
  mp4Path,
  gifPath,
  { fps = 12, width = 720, spawnImpl = spawn } = {},
) {
  return new Promise((resolve, reject) => {
    const filter =
      `fps=${fps},scale=${width}:-1:flags=lanczos,` +
      `split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`
    const proc = spawnImpl(
      'ffmpeg',
      ['-y', '-i', mp4Path, '-vf', filter, '-loop', '0', gifPath],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
    let stderr = ''
    proc.stderr?.on('data', (chunk) => {
      stderr += chunk
    })
    proc.on('error', reject) // ffmpeg not installed
    proc.on('close', (code) => {
      if (code === 0) resolve(gifPath)
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-300)}`))
    })
  })
}
