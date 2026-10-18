export type KaraokeGenre = { id: string; name: string }
export type KaraokeSong = { id: string; title: string; artist: string; videoId: string; genreIds: string[]; start: number; end: number }
export type KaraokeLibrary = { genres: KaraokeGenre[]; songs: KaraokeSong[] }

export const defaultKaraokeLibrary: KaraokeLibrary = {
  genres: ['JPOP', 'KPOP', 'R&B', '2000년대'].map((name, index) => ({ id: `genre-${index}`, name })),
  songs: [],
}

export function youtubeVideoId(link: string): string | null {
  try {
    const url = new URL(link)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    const host = url.hostname.toLowerCase()
    const id = host === 'youtu.be' ? url.pathname.slice(1) :
      ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)
        ? url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:embed|shorts|live)\/([^/]+)$/.exec(url.pathname)?.[1]
        : null
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch { return null }
}

export function parseKaraokeTime(value: string): number {
  if (!/^\d+(?::[0-5]\d){0,2}$/.test(value.trim())) return NaN
  return value.trim().split(':').reduce((total, part) => total * 60 + Number(part), 0)
}

export function formatKaraokeTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function availableSongs(library: KaraokeLibrary, genre: string, played: readonly string[]): KaraokeSong[] {
  return library.songs.filter(song => (genre === 'all' || song.genreIds.includes(genre)) && !played.includes(song.videoId))
}

export function isKaraokeLibrary(value: unknown): value is KaraokeLibrary {
  if (!value || typeof value !== 'object') return false
  const data = value as KaraokeLibrary
  return Array.isArray(data.genres) && Array.isArray(data.songs) &&
    data.genres.every(g => g && typeof g.id === 'string' && typeof g.name === 'string' && g.name.trim().length > 0) &&
    new Set(data.genres.map(g => g.id)).size === data.genres.length &&
    data.songs.every(s => s && typeof s.id === 'string' && typeof s.title === 'string' && s.title.trim().length > 0 &&
      typeof s.artist === 'string' && typeof s.videoId === 'string' && /^[\w-]{11}$/.test(s.videoId) &&
      Array.isArray(s.genreIds) && s.genreIds.every(id => data.genres.some(g => g.id === id)) &&
      Number.isInteger(s.start) && Number.isInteger(s.end) && s.start >= 0 && s.end > s.start) &&
    new Set(data.songs.map(s => s.videoId)).size === data.songs.length &&
    new Set(data.songs.map(s => s.id)).size === data.songs.length
}
