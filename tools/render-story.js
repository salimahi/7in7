// Renders a 1080x1920 "story" version of a graphic: a still PNG (the end state) and a 10 second MP4.
// The template animates with CSS animations (class "r" + --d delay). We pause them and step the clock
// frame by frame, so the video is deterministic and does not depend on how fast the runner is.
// Requires ffmpeg on PATH (preinstalled on GitHub's ubuntu-latest runners).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const W = 1080;
const H = 1920;
const FPS = 30;
const SECONDS = 10;

// html: fully filled template. outBase: path without extension, e.g. img/casting/2026-11-24-bonnie-story
// Writes <outBase>.png and <outBase>.mp4 and returns both paths.
async function renderStory(chromium, html, outBase) {
  const png = `${outBase}.png`;
  const mp4 = `${outBase}.mp4`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'story-'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // Take control of the animation clock.
    const animEnd = await page.evaluate(() => {
      const anims = document.getAnimations();
      anims.forEach((a) => a.pause());
      return Math.max(0, ...anims.map((a) => a.effect.getComputedTiming().endTime));
    });
    const seek = (ms) => page.evaluate((t) => document.getAnimations().forEach((a) => { a.currentTime = t; }), ms);
    const shot = (file) => page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });

    // End state = the still PNG.
    await seek(SECONDS * 1000);
    fs.mkdirSync(path.dirname(png), { recursive: true });
    await shot(png);

    // Frames. Once every animation has finished the picture no longer changes, so reuse the still.
    const total = FPS * SECONDS;
    const frame = (i) => path.join(tmp, `f${String(i).padStart(4, '0')}.png`);
    for (let i = 0; i < total; i++) {
      const t = (i / FPS) * 1000;
      if (t >= animEnd) fs.copyFileSync(png, frame(i));
      else { await seek(t); await shot(frame(i)); }
    }
  } finally {
    await browser.close();
  }
  try {
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
      '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
      '-movflags', '+faststart', '-an', mp4,
    ], { stdio: 'inherit' });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return { png, mp4 };
}

module.exports = { renderStory };
