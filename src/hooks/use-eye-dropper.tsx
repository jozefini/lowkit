import { useIsomorphicEffect } from './use-isomorphic-effect'
import { useCallback, useState } from 'react'

type EyeDropperOpenOptions = {
  signal?: AbortSignal
}

export type EyeDropperOpenReturnType = {
  sRGBHex: string
}

declare global {
  interface Window {
    EyeDropper?: {
      new (): {
        open: (
          options?: EyeDropperOpenOptions
        ) => Promise<EyeDropperOpenReturnType>
      }
    }
  }
}

const isOpera = () => {
  return navigator.userAgent.includes('OPR')
}

export function useEyeDropper() {
  const [supported, setSupported] = useState(false)

  useIsomorphicEffect(() => {
    setSupported(
      typeof window !== 'undefined' && !isOpera() && 'EyeDropper' in window
    )
  }, [])

  const open = useCallback(
    (
      options: EyeDropperOpenOptions = {}
    ): Promise<EyeDropperOpenReturnType | undefined> => {
      if (supported && window.EyeDropper) {
        const eyeDropper = new window.EyeDropper()
        return eyeDropper.open(options)
      }
      return Promise.resolve(undefined)
    },
    [supported]
  )

  return { supported, open }
}
