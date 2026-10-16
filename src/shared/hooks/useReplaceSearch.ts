import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Replaces the query string of the browser's *current* URL, keeping its path and hash.
 *
 * `setSearchParams` resolves `?…` against the path the hook last rendered with. When
 * a redirect (`<Navigate>`) fires in the same commit, that path is already stale and
 * the update navigates straight back to it, so a link like `/:username` never left
 * `/:username`. The live `window.location` is always the post-redirect truth.
 */
export function useReplaceSearch() {
  const navigate = useNavigate()
  return useCallback((params: URLSearchParams) => {
    const { pathname, hash } = window.location
    const search = params.toString()
    navigate({ pathname, search: search ? `?${search}` : '', hash }, { replace: true })
  }, [navigate])
}
