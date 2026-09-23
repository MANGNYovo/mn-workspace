import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../electron/microphone.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { MicrophoneController } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

test('helper only targets Analog 1/2 capture and never writes volume/default device', () => {
  assert.match(source, /EDataFlow\.eCapture/)
  assert.match(source, /if \(match != null\) return false/)
  assert.doesNotMatch(source, /MasterVolume\w*\s*=|SetDefault|Set-AudioDevice/)
})

test('floating overlay script parses and microphone is separate from output switches', () => {
  const main = fs.readFileSync(new URL('../electron/main.ts', import.meta.url), 'utf8')
  const html = main.slice(main.indexOf('return String.raw`<!doctype html>'))
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]
  assert.doesNotThrow(() => new vm.Script(script))
  assert.match(html, /id="microphone"/)
  assert.match(script, /button\[data-device\]/)
  assert.match(script, /removeMicrophoneListener\(\)/)
})

// Opt in: temporarily toggles the real microphone and restores its initial state.
test('native toggle, external notification, volume preservation and cleanup', {
  skip: process.env.MN_TEST_MICROPHONE !== '1' || process.platform !== 'win32',
  timeout: 30000,
}, async () => {
  const snapshot = () => JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', String.raw`
$env:PSModulePath = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'WindowsPowerShell\Modules') + ';' + $env:PSModulePath
Import-Module AudioDeviceCmdlets
$enumerator = New-Object CoreAudioApi.MMDeviceEnumerator
$devices = $enumerator.EnumerateAudioEndPoints([CoreAudioApi.EDataFlow]::eCapture, [CoreAudioApi.EDeviceState]::DEVICE_STATE_ACTIVE)
@(for ($i = 0; $i -lt $devices.Count; $i++) {
  $device = $devices[$i]
  $volume = $device.AudioEndpointVolume
  [PSCustomObject]@{ ID = $device.ID; Muted = $volume.Mute; Volume = $volume.MasterVolumeLevelScalar }
  $volume.Dispose()
}) | ConvertTo-Json -Compress
`], { encoding: 'utf8', windowsHide: true }))
  const events = []
  const observer = new MicrophoneController(state => events.push(state))
  const writer = new MicrophoneController(() => {})
  let original
  const before = snapshot()
  try {
    original = await observer.request('get')
    assert.equal(original.available, true)
    assert.equal((await writer.request('get')).muted, original.muted)
    events.length = 0
    assert.equal((await writer.request('toggle')).muted, !original.muted)
    const deadline = Date.now() + 2000
    while (!events.some(state => state.muted === !original.muted) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    assert.ok(events.some(state => state.muted === !original.muted), 'other process receives native mute notification')
    const during = snapshot()
    assert.deepEqual(during.map(d => d.Volume), before.map(d => d.Volume))
    assert.equal(during.filter((d, i) => d.Muted !== before[i].Muted).length, 1)
  } finally {
    try {
      if (original?.available) {
        const current = await writer.request('get')
        assert.equal(current.available, true, 'device must remain available to restore mute')
        if (current.muted !== original.muted) await writer.request('toggle')
      }
    } finally {
      writer.stop()
      observer.stop()
    }
  }
  assert.deepEqual(snapshot(), before, 'original mute and volume of every input restored')
})
