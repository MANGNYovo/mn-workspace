import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

export type MicrophoneState = { available: boolean; muted: boolean | null; error?: string }

// Reuse the audio module already required by the speaker/headset switcher.
// C# handles native notifications: PowerShell scriptblocks cannot run on COM callback threads.
export const microphoneScript = String.raw`
$ErrorActionPreference = 'Stop'
$moduleRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'WindowsPowerShell\Modules'
$env:PSModulePath = $moduleRoot + ';' + $env:PSModulePath
Import-Module AudioDeviceCmdlets
Add-Type -ReferencedAssemblies ([AudioDeviceCmdlets.AudioDevice].Assembly.Location) -TypeDefinition @'
using System;
using CoreAudioApi;
public static class MNMicrophone {
    static readonly object outputLock = new object();
    static MMDevice device;
    static AudioEndpointVolume volume;
    static void Send(int id, bool? muted, string error) {
        lock(outputLock) {
            Console.WriteLine("{\"id\":" + id + ",\"available\":" + (muted.HasValue ? "true" : "false") +
                ",\"muted\":" + (muted.HasValue ? (muted.Value ? "true" : "false") : "null") +
                ",\"error\":\"" + error + "\"}");
            Console.Out.Flush();
        }
    }
    static void Changed(AudioVolumeNotificationData data) { Send(0, data.Muted, ""); }
    static void Release() {
        if (volume != null) {
            volume.OnVolumeNotification -= Changed;
            volume.Dispose();
            volume = null;
        }
        device = null;
    }
    static bool Bind() {
        if (device != null && device.State == EDeviceState.DEVICE_STATE_ACTIVE) return true;
        Release();
        var devices = new MMDeviceEnumerator().EnumerateAudioEndPoints(EDataFlow.eCapture, EDeviceState.DEVICE_STATE_ACTIVE);
        MMDevice match = null;
        for (int i = 0; i < devices.Count; i++) {
            var candidate = devices[i];
            // Match the input label, never the default recording or playback endpoint.
            if (!System.Text.RegularExpressions.Regex.IsMatch(candidate.FriendlyName,
                @"^Analog\s+1\s*/\s*2(?:\s*\(|$)", System.Text.RegularExpressions.RegexOptions.IgnoreCase)) continue;
            if (match != null) return false; // Ambiguous devices must not be toggled.
            match = candidate;
        }
        if (match == null) return false;
        device = match;
        volume = device.AudioEndpointVolume;
        volume.OnVolumeNotification += Changed;
        return true;
    }
    public static void Run() {
        try {
            string line;
            while ((line = Console.ReadLine()) != null) {
                string[] parts = line.Split('|');
                int id;
                if (parts.Length != 2 || !Int32.TryParse(parts[0], out id)) continue;
                try {
                    if (!Bind()) { Send(id, null, "Analog 1/2 input missing or ambiguous"); continue; }
                    if (parts[1] == "toggle") volume.Mute = !volume.Mute;
                    else if (parts[1] != "get") { Send(id, null, "Invalid command"); continue; }
                    Send(id, volume.Mute, "");
                } catch { Release(); Send(id, null, "Microphone unavailable"); }
            }
        } finally { Release(); } // Never change mute or volume when exiting.
    }
}
'@
[MNMicrophone]::Run()
`

export class MicrophoneController {
  private child: ChildProcessWithoutNullStreams | null = null
  private sequence = 0
  private pending = new Map<number, { resolve: (state: MicrophoneState) => void; timer: NodeJS.Timeout }>()
  constructor(private readonly changed: (state: MicrophoneState) => void) {}

  private start() {
    if (this.child) return
    const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand',
      Buffer.from(microphoneScript, 'utf16le').toString('base64')], { windowsHide: true })
    this.child = child
    let buffer = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      if (this.child !== child) return
      buffer += chunk
      let end: number
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).trim()
        buffer = buffer.slice(end + 1)
        try {
          const message = JSON.parse(line)
          if (typeof message.id !== 'number' || typeof message.available !== 'boolean' ||
              (message.muted !== null && typeof message.muted !== 'boolean')) continue
          const state: MicrophoneState = { available: message.available, muted: message.muted, error: message.error }
          this.changed(state)
          const request = this.pending.get(message.id)
          if (request) {
            clearTimeout(request.timer)
            this.pending.delete(message.id)
            request.resolve(state)
          }
        } catch { /* Ignore non-protocol PowerShell output. */ }
      }
    })
    child.stderr.on('data', () => { /* Drained; errors surface as unavailable, not stale state. */ })
    child.stdin.on('error', () => { if (this.child === child) this.stop() })
    child.on('error', () => { if (this.child === child) this.stop() })
    child.on('exit', () => { if (this.child === child) this.stop() })
  }

  request(command: 'get' | 'toggle'): Promise<MicrophoneState> {
    if (process.platform !== 'win32') return Promise.resolve({ available: false, muted: null })
    this.start()
    const id = ++this.sequence
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.stop(), 10000)
      this.pending.set(id, { resolve, timer })
      this.child!.stdin.write(`${id}|${command}\n`)
    })
  }

  stop() {
    const child = this.child
    this.child = null
    child?.kill()
    const state: MicrophoneState = { available: false, muted: null, error: 'Microphone connection unavailable' }
    for (const request of this.pending.values()) {
      clearTimeout(request.timer)
      request.resolve(state)
    }
    this.pending.clear()
    this.changed(state)
  }
}
