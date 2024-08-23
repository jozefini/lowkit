import { useState } from 'react'

type UseClipboardOptions = {
  timeout?: number
}

export function useClipboard({ timeout = 2000 }: UseClipboardOptions = {}) {
  const [error, setError] = useState<Error | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyTimeout, setCopyTimeout] = useState<number | undefined>(undefined)

  const handleCopyResult = (value: boolean) => {
    if (copyTimeout !== undefined) {
      window.clearTimeout(copyTimeout)
    }
    setCopyTimeout(window.setTimeout(() => setCopied(false), timeout))
    setCopied(value)
  }

  const copy = (valueToCopy: string) => {
    if ('clipboard' in navigator) {
      navigator.clipboard
        .writeText(valueToCopy)
        .then(() => handleCopyResult(true))
        .catch(err =>
          setError(err instanceof Error ? err : new Error('Failed to copy'))
        )
    } else {
      setError(new Error('useClipboard: navigator.clipboard is not supported'))
    }
  }

  const reset = () => {
    setCopied(false)
    setError(null)
    if (copyTimeout !== undefined) {
      window.clearTimeout(copyTimeout)
    }
  }

  return { copy, reset, error, copied }
}
