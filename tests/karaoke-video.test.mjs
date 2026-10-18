import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

function harness() {
  const slots = [], effects = [], players = []
  let cursor = 0
  const hooks = {
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value } },
    useState(value) { cursor++; return [value, () => {}] },
    useEffect(effect, deps) {
      const index = cursor++, previous = slots[index]
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: effect() } })
      }
    },
  }
  const YT = {
    PlayerState: { CUED: 5, PLAYING: 1, ENDED: 0 },
    Player: class {
      constructor(element, options) { this.events = options.events; this.plays = 0; this.cues = []; this.destroyed = false; players.push(this) }
      cueVideoById(value) { this.cues.push(value) }
      playVideo() { this.plays++ }
      pauseVideo() {}
      setVolume(volume) { this.volume = volume }
      unMute() { this.unmuted = true }
      destroy() { this.destroyed = true }
    },
  }
  const React = { createElement: () => null }
  const source = fs.readFileSync(new URL('../src/components/KaraokeVideo.tsx', import.meta.url), 'utf8')
  let js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText
  js = js.replace(/^import .* from .*;$/gm, '').replace('export function KaraokeVideo', 'function KaraokeVideo')
  const component = new Function('hooks', 'loadYoutubeIframeApi', 'React', 'window', 'document', `const { useEffect, useRef, useState } = hooks; ${js}; return KaraokeVideo`)(hooks, async () => YT, React, { location: { origin: 'http://localhost' }, setTimeout: () => 1, clearTimeout() {}, setInterval: () => 2, clearInterval() {} }, { createElement: () => ({}) })
  const clip = { key: 1, song: { videoId: 'abcdefghijk', start: 65, end: 100 } }
  return {
    players, clip,
    async render(playbackEnabled, selectedClip = clip, volume = 50) {
      cursor = 0
      component({ clip: selectedClip, volume, playbackEnabled })
      slots[0].current = { replaceChildren() {} }
      effects.splice(0).forEach(effect => effect())
      await Promise.resolve()
    },
    ready(player = players.at(-1)) { player.events.onReady({ target: player }); player.events.onStateChange({ target: player, data: 5 }) },
    dispose() { slots.forEach(slot => slot?.cleanup?.()) },
  }
}

test('countdown cues the exact interval without playback; reveal reuses and starts the same player', async () => {
  const h = harness()
  await h.render(false)
  h.ready()
  assert.deepEqual(h.players[0].cues, [{ videoId: 'abcdefghijk', startSeconds: 65, endSeconds: 100 }])
  assert.equal(h.players[0].plays, 0)
  await h.render(true)
  assert.equal(h.players.length, 1)
  assert.equal(h.players[0].plays, 1)
  h.ready()
  assert.equal(h.players[0].plays, 1)
  h.dispose()
})

test('a player becoming ready after countdown still starts', async () => {
  const h = harness()
  await h.render(false)
  await h.render(true)
  assert.equal(h.players[0].plays, 0)
  h.ready()
  assert.equal(h.players[0].plays, 1)
  h.dispose()
})

test('cancelled preparation cannot start from a late ready event', async () => {
  const h = harness()
  await h.render(false)
  h.dispose()
  h.ready()
  assert.equal(h.players[0].plays, 0)
  assert.equal(h.players[0].destroyed, true)
})

test('song preview retains immediate playback when ready', async () => {
  const h = harness()
  await h.render(undefined)
  h.ready()
  assert.equal(h.players[0].plays, 1)
  h.dispose()
})

test('multiple songs and stop/restart reuse one player, without playing during preparation', async () => {
  const h = harness()
  await h.render(false)
  h.ready()
  await h.render(true)
  const player = h.players[0]
  for (let key = 2; key <= 5; key++) {
    const next = { key, song: { videoId: `video${key}`, start: key * 10, end: key * 10 + 30 } }
    await h.render(false, next)
    player.events.onStateChange({ target: player, data: 5 })
    assert.equal(player.plays, key - 1)
    assert.equal(h.players.length, 1)
    assert.equal(player.destroyed, false)
    assert.deepEqual(player.cues.at(-1), { videoId: `video${key}`, startSeconds: key * 10, endSeconds: key * 10 + 30 })
    await h.render(true, next)
    assert.equal(player.plays, key)
  }
  await h.render(false, null)
  player.events.onStateChange({ target: player, data: 5 })
  assert.equal(player.plays, 5)
  await h.render(false, h.clip)
  player.events.onStateChange({ target: player, data: 5 })
  await h.render(true, h.clip)
  assert.equal(player.plays, 6)
  assert.equal(h.players.length, 1)
  h.dispose()
  assert.equal(player.destroyed, true)
})

test('song changes during iframe initialization cue only the latest selection', async () => {
  const h = harness()
  await h.render(false)
  const next = { key: 2, song: { videoId: 'newvideo123', start: 20, end: 40 } }
  await h.render(false, next)
  h.ready()
  assert.equal(h.players.length, 1)
  assert.deepEqual(h.players[0].cues, [{ videoId: 'newvideo123', startSeconds: 20, endSeconds: 40 }])
  assert.equal(h.players[0].plays, 0)
  h.dispose()
})


test('volume changes apply to the existing player without restarting the song', async () => {
  const h = harness()
  await h.render(true)
  h.ready()
  const player = h.players[0]
  await h.render(true, h.clip, 0)
  assert.equal(player.volume, 0)
  await h.render(true, h.clip, 75)
  assert.equal(player.volume, 75)
  assert.equal(player.unmuted, true)
  assert.equal(player.plays, 1)
  assert.equal(player.cues.length, 1)
  assert.equal(h.players.length, 1)
  h.dispose()
})
