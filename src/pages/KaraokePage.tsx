import { musicControlIconMap } from '../constants'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { KaraokeVideo, type KaraokeClip } from '../components/KaraokeVideo'
import { availableSongs, defaultKaraokeLibrary, formatKaraokeTime, isKaraokeLibrary, parseKaraokeTime, youtubeVideoId, type KaraokeGenre, type KaraokeLibrary, type KaraokeSong } from '../utils/karaoke'

function KaraokeModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  return <dialog ref={dialog} className="karaoke-modal" aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}>
    <header><h2>{title}</h2><button aria-label="닫기" onClick={onClose}>×</button></header>{children}
  </dialog>
}

function GenreEditor({ library, onSave, onClose, busy }: { library: KaraokeLibrary; onSave: (data: KaraokeLibrary) => Promise<boolean>; onClose: () => void; busy: boolean }) {
  const [genres, setGenres] = useState<KaraokeGenre[]>(library.genres.map(g => ({ ...g })))
  const [error, setError] = useState('')
  const save = async () => {
    const normalized = genres.map(g => ({ ...g, name: g.name.trim() }))
    if (normalized.some(g => !g.name || g.name === '전체') || new Set(normalized.map(g => g.name.toLocaleLowerCase())).size !== normalized.length) {
      setError('비어 있거나 중복된 이름, “전체”는 사용할 수 없어요.'); return
    }
    if (await onSave({ genres: normalized, songs: library.songs.map(s => ({ ...s, genreIds: s.genreIds.filter(id => normalized.some(g => g.id === id)) })) })) onClose()
    else setError('저장하지 못했어요. 다시 저장해 주세요.')
  }
  return <KaraokeModal title="장르 편집" onClose={onClose}>
    <p className="karaoke-muted">장르를 삭제해도 곡은 ‘전체’에 남아요.</p>
    <div className="karaoke-genre-list">{genres.map((genre, index) => <div key={genre.id}>
      <input aria-label={`장르 ${index + 1}`} maxLength={30} value={genre.name} onChange={e => setGenres(genres.map(g => g.id === genre.id ? { ...g, name: e.target.value } : g))} />
      <button aria-label={`${genre.name || '장르'} 삭제`} onClick={() => setGenres(genres.filter(g => g.id !== genre.id))}>삭제</button>
    </div>)}</div>
    <button onClick={() => setGenres([...genres, { id: crypto.randomUUID(), name: '' }])}>＋ 장르 추가</button>
    {error && <p role="alert" className="karaoke-error">{error}</p>}
    <footer><button onClick={onClose} disabled={busy}>취소</button><button className="karaoke-primary" disabled={busy} onClick={() => void save()}>저장</button></footer>
  </KaraokeModal>
}

function SongEditor({ song, library, volume, busy, onSave, onClose }: { song?: KaraokeSong; library: KaraokeLibrary; volume: number; busy: boolean; onSave: (data: KaraokeLibrary) => Promise<boolean>; onClose: () => void }) {
  const [title, setTitle] = useState(song?.title ?? '')
  const [artist, setArtist] = useState(song?.artist ?? '')
  const [link, setLink] = useState(song ? `https://www.youtube.com/watch?v=${song.videoId}` : '')
  const [start, setStart] = useState(formatKaraokeTime(song?.start ?? 0))
  const [end, setEnd] = useState(formatKaraokeTime(song?.end ?? 30))
  const [genreIds, setGenreIds] = useState(song?.genreIds ?? [])
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<KaraokeClip | null>(null)
  const draft = (): KaraokeSong | null => {
    const videoId = youtubeVideoId(link)
    const from = parseKaraokeTime(start), to = parseKaraokeTime(end)
    if (!title.trim() || !videoId || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
      setError('제목, 유튜브 링크, 시작·종료 시간을 확인해 주세요. 종료는 시작보다 뒤여야 해요.'); return null
    }
    if (library.songs.some(s => s.videoId === videoId && s.id !== song?.id)) { setError('이미 등록한 영상이에요. 곡 관리에서 장르나 구간을 수정해 주세요.'); return null }
    setError('')
    return { id: song?.id ?? crypto.randomUUID(), title: title.trim(), artist: artist.trim(), videoId, start: from, end: to, genreIds }
  }
  const save = async () => {
    const value = draft(); if (!value) return
    if (await onSave({ ...library, songs: song ? library.songs.map(s => s.id === song.id ? value : s) : [...library.songs, value] })) onClose()
    else setError('저장하지 못했어요. 다시 저장해 주세요.')
  }
  return <KaraokeModal title={song ? '곡 수정' : '노래 등록'} onClose={onClose}>
    <div className="karaoke-form-grid">
      <label>노래 제목<input autoFocus maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="노래 제목" /></label>
      <label>가수<input maxLength={100} value={artist} onChange={e => setArtist(e.target.value)} placeholder="가수 이름" /></label>
      <label className="full">유튜브 노래방 영상 링크<input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></label>
      <label>시작 시간<input value={start} onChange={e => setStart(e.target.value)} placeholder="01:12" /></label>
      <label>종료 시간<input value={end} onChange={e => setEnd(e.target.value)} placeholder="01:47" /></label>
    </div>
    <p className="karaoke-muted">분:초 또는 초 단위로 입력해 주세요. 예: 01:12 또는 72</p>
    <fieldset className="karaoke-checks"><legend>장르 · 여러 개 선택 가능</legend>{library.genres.map(g => <label key={g.id}><input type="checkbox" checked={genreIds.includes(g.id)} onChange={e => setGenreIds(e.target.checked ? [...genreIds, g.id] : genreIds.filter(id => id !== g.id))} />{g.name}</label>)}{!library.genres.length && <span>장르 편집에서 장르를 추가할 수 있어요.</span>}</fieldset>
    {error && <p className="karaoke-error" role="alert">{error}</p>}
    <button onClick={() => { const value = draft(); if (value) setPreview({ song: value, key: Date.now() }) }}>▷ 구간 미리보기</button>
    {preview && <div className="karaoke-preview"><KaraokeVideo clip={preview} volume={volume} /><button onClick={() => setPreview(null)}>미리보기 정지</button></div>}
    <footer><button disabled={busy} onClick={onClose}>취소</button><button disabled={busy} className="karaoke-primary" onClick={() => void save()}>저장</button></footer>
  </KaraokeModal>
}

export function KaraokePage({ active, volume, onVolumeChange, iconSrc }: { active: boolean; volume: number; onVolumeChange: (volume: number) => void; iconSrc: string }) {
  const [library, setLibrary] = useState<KaraokeLibrary>(defaultKaraokeLibrary)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const [error, setError] = useState('')
  const [genre, setGenre] = useState('all')
  const [played, setPlayed] = useState<string[]>([])
  const [pending, setPending] = useState<KaraokeClip | null>(null)
  const [clip, setClip] = useState<KaraokeClip | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [message, setMessage] = useState('장르를 선택하고 노래를 시작해 보세요')
  const [modal, setModal] = useState<'genres' | 'song' | 'manage' | null>(null)
  const [editing, setEditing] = useState<KaraokeSong | undefined>()
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const sequence = useRef(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data: unknown = window.mnAPI ? await window.mnAPI.loadKaraoke() : JSON.parse(localStorage.getItem('mn-karaoke-library') ?? 'null')
        if (data !== null && !isKaraokeLibrary(data)) throw new Error('Invalid library')
        if (!cancelled) { setLibrary(data ?? defaultKaraokeLibrary); setLoaded(true) }
      } catch { if (!cancelled) setError('곡 목록을 읽지 못했어요. 앱을 다시 열어 주세요. 저장된 목록은 덮어쓰지 않습니다.') }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!active) { setPending(null); setClip(null); setModal(null) }
  }, [active])

  useEffect(() => {
    if (!pending || !active) return
    setCountdown(3)
    const started = Date.now()
    const tick = window.setInterval(() => setCountdown(Math.max(1, 3 - Math.floor((Date.now() - started) / 1000))), 100)
    const timer = window.setTimeout(() => { setClip(pending); setPending(null) }, 3000)
    return () => { window.clearInterval(tick); window.clearTimeout(timer) }
  }, [pending, active])

  const save = async (data: KaraokeLibrary): Promise<boolean> => {
    if (!loaded || saving.current) return false
    saving.current = true; setBusy(true)
    try {
      if (window.mnAPI) { if (!await window.mnAPI.saveKaraoke(data)) throw new Error('Save failed') }
      else localStorage.setItem('mn-karaoke-library', JSON.stringify(data))
      setLibrary(data); setError('')
      if (genre !== 'all' && !data.genres.some(g => g.id === genre)) setGenre('all')
      return true
    } catch { setError('저장하지 못했어요. 변경 내용을 유지한 채 다시 저장해 주세요.'); return false }
    finally { saving.current = false; setBusy(false) }
  }

  const choose = (id: string, history = played) => {
    setGenre(id); setPending(null); setClip(null)
    const remaining = availableSongs(library, id, history)
    if (!remaining.length) {
      setMessage(library.songs.some(s => id === 'all' || s.genreIds.includes(id)) ? '이 장르의 모든 곡을 불렀어요. 다른 장르를 선택하거나 종료 후 다시 시작해 주세요.' : '등록된 곡이 없어요. 노래를 먼저 등록해 주세요.')
      return
    }
    setPending({ song: remaining[Math.floor(Math.random() * remaining.length)], key: ++sequence.current })
  }
  const next = () => {
    if (!clip || pending) return
    // Include skipped videos even when loading failed before onPlayed fired.
    const history = played.includes(clip.song.videoId) ? played : [...played, clip.song.videoId]
    setPlayed(history)
    choose(genre, history)
  }
  const open = (value: typeof modal, song?: KaraokeSong) => {
    setPending(null); setClip(null); setEditing(song); setModal(value)
  }
  const stop = () => {
    setPending(null); setClip(null); setPlayed([])
    setMessage('노래방을 종료했어요. 모든 곡을 다시 뽑을 수 있어요.')
  }
  const openFullSong = () => {
    if (!clip) return
    window.open(`https://www.youtube.com/watch?v=${clip.song.videoId}`, '_blank', 'noopener,noreferrer')
    setPending(null)
    setClip(null)
    setMessage('브라우저에서 전체 영상을 열었어요. 랜덤 재생을 누르면 이어서 진행해요.')
  }
  const songs = library.songs.filter(s => genre === 'all' || s.genreIds.includes(genre))
  const remaining = availableSongs(library, genre, played).length
  const managed = library.songs.filter(s => `${s.title} ${s.artist}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))

  return <section className="karaoke-page" hidden={!active}>
    <header className="karaoke-heading"><div className="karaoke-heading-title"><div><h1>Random Karaoke</h1><p>Pick a song. Sing along.</p></div></div>
      <div className="karaoke-actions"><button disabled={!loaded} onClick={() => open('song')}>＋ 노래 등록</button><button disabled={!loaded} onClick={() => open('manage')}>곡 관리 ›</button></div>
    </header>
    {error && <p role="alert" className="karaoke-error karaoke-library-error">{error}</p>}
    <div className="karaoke-genres" aria-label="장르 선택"><div className="karaoke-chips">{[{ id: 'all', name: '전체' }, ...library.genres].map(g => <button key={g.id} disabled={!loaded} className={genre === g.id ? 'selected' : ''} aria-pressed={genre === g.id} onClick={() => choose(g.id)}>{g.name}</button>)}</div><button disabled={!loaded} className="karaoke-edit-genres" onClick={() => open('genres')}>장르 편집</button></div>
    <div className="karaoke-stage">
      <div className="karaoke-screen">
        {active && <div className={pending || !clip ? 'karaoke-player-layer is-preparing' : 'karaoke-player-layer'} aria-hidden={!!pending || !clip}>
          <KaraokeVideo clip={pending || clip} volume={volume} playbackEnabled={!!clip && !pending} onEnded={next} onPlayed={videoId => setPlayed(previous => previous.includes(videoId) ? previous : [...previous, videoId])} />
        </div>}
        {!pending && !clip && <div className="karaoke-empty karaoke-countdown-overlay"><img className="karaoke-icon" src={iconSrc} alt="" /><h2>{loaded ? '오늘은 어떤 노래를 부를까요?' : '곡 목록을 불러오는 중…'}</h2><p role="status">{message}</p></div>}
        {pending && <div className="karaoke-empty karaoke-countdown-overlay" role="status"><span className="karaoke-countdown">{countdown}</span><h2>다음 노래를 준비하세요</h2><p>잠시 후 하이라이트가 시작돼요</p></div>}
      </div>
      <div className="karaoke-stage-footer"><div className="karaoke-track"><h2>{clip?.song.title ?? 'Ready to sing?'}</h2><p>{clip ? `${clip.song.artist || '가수 미등록'} · ${formatKaraokeTime(clip.song.start)} – ${formatKaraokeTime(clip.song.end)}` : '나만의 하이라이트 노래방'}</p></div><button className="karaoke-youtube" disabled={!clip || !!pending} onClick={openFullSong} title="브라우저에서 전체 노래방 영상 열기">▶ YouTube</button><span className="karaoke-count">전체 {songs.length}곡 · 남은 곡 {remaining}곡</span><div className="karaoke-actions"><div className="karaoke-volume"><div className="home-player-volume-track"><i style={{ width: `${volume}%` }} aria-hidden="true" /><input type="range" min="0" max="100" step="1" value={volume} onChange={event => onVolumeChange(Number(event.target.value))} aria-label="노래방 음량" aria-valuetext={`${volume}%`} /></div></div><button className="karaoke-primary" disabled={!loaded || !!pending || !remaining} onClick={() => choose(genre)}><img className="karaoke-shuffle-icon" src={musicControlIconMap.shuffle.white} alt="" />랜덤 재생</button><button disabled={!loaded || !clip || !!pending} onClick={next}>다음 곡</button><button onClick={stop} disabled={!loaded}>종료</button></div></div>
    </div>
    {active && modal === 'genres' && <GenreEditor library={library} busy={busy} onSave={save} onClose={() => { if (!busy) setModal(null) }} />}
    {active && modal === 'song' && <SongEditor song={editing} library={library} volume={volume} busy={busy} onSave={save} onClose={() => { if (!busy) setModal(null) }} />}
    {active && modal === 'manage' && <KaraokeModal title={`곡 관리 · ${library.songs.length}곡`} onClose={() => { if (!busy) setModal(null) }}>
      {error && <p role="alert" className="karaoke-error">{error}</p>}
      <input className="karaoke-search" aria-label="곡 검색" placeholder="제목 또는 가수 검색" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="karaoke-song-list">{managed.map(song => <article key={song.id}><div><strong>{song.title}</strong><p>{song.artist} · {formatKaraokeTime(song.start)} – {formatKaraokeTime(song.end)}</p><small>{song.genreIds.map(id => library.genres.find(g => g.id === id)?.name).join(' · ') || '미분류'}</small></div><div className="karaoke-actions"><button disabled={busy} onClick={() => open('song', song)}>수정</button>{deleteId === song.id ? <><button disabled={busy} onClick={() => void save({ ...library, songs: library.songs.filter(s => s.id !== song.id) }).then(ok => { if (ok) setDeleteId(null) })}>삭제 확인</button><button onClick={() => setDeleteId(null)}>취소</button></> : <button disabled={busy} onClick={() => setDeleteId(song.id)}>삭제</button>}</div></article>)}{!managed.length && <p className="karaoke-muted">{library.songs.length ? '검색 결과가 없어요.' : '아직 등록된 곡이 없어요.'}</p>}</div>
      <footer><button className="karaoke-primary" onClick={() => open('song')}>＋ 노래 등록</button><button onClick={() => setModal(null)}>닫기</button></footer>
    </KaraokeModal>}
  </section>
}
