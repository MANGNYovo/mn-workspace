import { useEffect } from 'react'

export function useAutosave<T>(
  value: T,
  isLoaded: boolean,
  save: (value: T) => Promise<boolean>,
) {
  useEffect(() => {
    if (!isLoaded) return
    void save(value).catch(console.error)
  }, [value, isLoaded, save])
}
