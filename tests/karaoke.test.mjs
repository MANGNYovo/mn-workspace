import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/utils/karaoke.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { youtubeVideoId, parseKaraokeTime, availableSongs, isKaraokeLibrary } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const library = {
  genres: [{ id: 'j', name: 'JPOP' }, { id: 'k', name: 'KPOP' }],
  songs: [
    { id: '1', title: 'Song A', artist: '', videoId: 'abcdefghijk', genreIds: ['j', 'k'], start: 72, end: 107 },
    { id: '2', title: 'Song B', artist: '', videoId: '12345678901', genreIds: ['k'], start: 0, end: 30 },
  ],
}

test('supports YouTube URLs and rejects lookalike domains or invalid IDs', () => {
  for (const url of ['https://youtu.be/abcdefghijk?t=72', 'https://www.youtube.com/watch?v=abcdefghijk&list=x', 'https://m.youtube.com/shorts/abcdefghijk']) assert.equal(youtubeVideoId(url), 'abcdefghijk')
  for (const url of ['https://youtube.com.evil.com/watch?v=abcdefghijk', 'javascript:alert(1)', 'https://youtu.be/short', 'https://example.com/abcdefghijk']) assert.equal(youtubeVideoId(url), null)
})
test('validates timestamps without silently accepting malformed values', () => {
  assert.equal(parseKaraokeTime('01:12'), 72)
  assert.equal(parseKaraokeTime('72'), 72)
  assert.equal(parseKaraokeTime('1:02:03'), 3723)
  for (const value of ['1:99', '-1', '', '1.5', 'abc']) assert.ok(Number.isNaN(parseKaraokeTime(value)))
})
test('history excludes a video across genres; exhausted genres stay empty until reset', () => {
  assert.equal(availableSongs(library, 'j', []).length, 1)
  assert.equal(availableSongs(library, 'j', ['abcdefghijk']).length, 0)
  assert.deepEqual(availableSongs(library, 'k', ['abcdefghijk']).map(s => s.id), ['2'])
  assert.equal(availableSongs(library, 'all', ['abcdefghijk', '12345678901']).length, 0)
  assert.equal(availableSongs(library, 'all', []).length, 2)
})
test('library validation rejects duplicate videos, broken genre references and invalid intervals', () => {
  assert.ok(isKaraokeLibrary(library))
  assert.ok(!isKaraokeLibrary({ ...library, songs: [...library.songs, { ...library.songs[0], id: '3' }] }))
  assert.ok(!isKaraokeLibrary({ ...library, songs: [{ ...library.songs[0], end: 20 }] }))
  assert.ok(!isKaraokeLibrary({ ...library, genres: [] }))
  assert.ok(!isKaraokeLibrary({ genres: [], songs: [null] }))
  assert.ok(isKaraokeLibrary({ genres: [], songs: library.songs.map(s => ({ ...s, genreIds: [] })) }))
})
