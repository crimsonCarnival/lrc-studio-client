import { useEffect, useRef } from 'react'
import { enqueueLoad, type LoadJobType } from '../batch-loader'

export function useIntersectionLoader(
  ref: React.RefObject<Element | null>,
  id: string,
  type: LoadJobType
): void {
  const loaded = useRef(false)

  useEffect(() => {
    if (!ref.current || loaded.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loaded.current) {
          loaded.current = true
          enqueueLoad({
            id,
            type,
            resolve: () => {},
          })
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [id, type])
}
