/**
 * afterPack.cjs
 * electron-builder afterPack 훅:
 * 빌드 후 Electron의 기본 ffmpeg.dll을 H.264/AAC 코덱 지원 버전으로 교체
 * (YouTube 오디오 재생에 필요)
 */

const path = require('path')
const fs = require('fs')
const https = require('https')

// 다운로드 헬퍼
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close()
        fs.unlinkSync(dest)
        download(res.headers.location, dest).then(resolve).catch(reject)
        return
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', (err) => {
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

// zip 압축 해제 헬퍼
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process')
    // Windows: PowerShell로 압축 해제
    const cmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`
    exec(cmd, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

exports.default = async function afterPack(context) {
  const { appOutDir, packager } = context
  const electronVersion = packager.config.electronVersion || require('electron/package.json').version

  // Windows x64만 처리
  if (process.platform !== 'win32' && packager.platform.name !== 'windows') {
    console.log('[afterPack] Skipping ffmpeg replacement (not Windows)')
    return
  }

  const ffmpegDest = path.join(appOutDir, 'ffmpeg.dll')
  const zipDest = path.join(appOutDir, 'ffmpeg-tmp.zip')

  // Electron 공식 릴리즈에서 ffmpeg 다운로드
  // (코덱 포함된 기본 버전 - electron/releases에서 직접 제공)
  const ffmpegUrl = `https://github.com/electron/electron/releases/download/v${electronVersion}/ffmpeg-v${electronVersion}-win32-x64.zip`

  console.log(`[afterPack] Downloading ffmpeg v${electronVersion}...`)
  console.log(`[afterPack] URL: ${ffmpegUrl}`)

  try {
    await download(ffmpegUrl, zipDest)
    console.log('[afterPack] ffmpeg downloaded, extracting...')

    const extractDir = path.join(appOutDir, 'ffmpeg-tmp')
    if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir)

    await extractZip(zipDest, extractDir)

    // 압축 해제된 ffmpeg.dll 찾아서 교체
    const extractedDll = path.join(extractDir, 'ffmpeg.dll')
    if (fs.existsSync(extractedDll)) {
      fs.copyFileSync(extractedDll, ffmpegDest)
      console.log('[afterPack] ffmpeg.dll replaced successfully!')
    } else {
      console.error('[afterPack] ffmpeg.dll not found in zip!')
    }

    // 임시 파일 정리
    fs.unlinkSync(zipDest)
    fs.rmSync(extractDir, { recursive: true, force: true })

  } catch (err) {
    console.error('[afterPack] Failed to replace ffmpeg:', err.message)
    // 실패해도 빌드는 계속 진행
  }
}
