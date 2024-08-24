'server only'

export function createCrypto({
  secretKey,
  hashAlgorithm = 'SHA-256',
  encryptionAlgorithm = 'AES-GCM',
  ivLength = 12,
}: {
  secretKey: string
  hashAlgorithm?: string
  encryptionAlgorithm?: string
  ivLength?: number
}) {
  const badEnvError = 'Crypto instance must be server-side'
  const badSecretError = 'Secret key must be provided'

  if (!secretKey) {
    throw new Error(badSecretError)
  }
  if (typeof window !== 'undefined') {
    throw new Error(badEnvError)
  }

  function str2ab(str: string): ArrayBuffer {
    const buf = new ArrayBuffer(str.length)
    const bufView = new Uint8Array(buf)
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i)
    }
    return buf
  }

  function ab2str(buf: ArrayBuffer): string {
    return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)))
  }

  async function generateKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const data = encoder.encode(secretKey)
    const hash = await crypto.subtle.digest(hashAlgorithm, data)
    return crypto.subtle.importKey(
      'raw',
      hash,
      { name: encryptionAlgorithm },
      false,
      ['encrypt', 'decrypt']
    )
  }

  async function encrypt<T = string>(data: T): Promise<string> {
    if (typeof window !== 'undefined') {
      return Promise.reject(new Error(badEnvError))
    }
    const key = await generateKey()
    const encoder = new TextEncoder()
    const encodedData = encoder.encode(JSON.stringify(data))
    const iv = crypto.getRandomValues(new Uint8Array(ivLength))

    const encryptedContent = await crypto.subtle.encrypt(
      { name: encryptionAlgorithm, iv: iv },
      key,
      encodedData
    )

    const encryptedContentArr = new Uint8Array(encryptedContent)
    const buf = new Uint8Array(iv.byteLength + encryptedContentArr.byteLength)
    buf.set(iv, 0)
    buf.set(encryptedContentArr, iv.byteLength)

    return btoa(ab2str(buf.buffer))
  }

  async function decrypt<T = string>(encryptedData: string): Promise<T> {
    if (typeof window !== 'undefined') {
      return Promise.reject(new Error(badEnvError))
    }
    const key = await generateKey()
    const encryptedDataBuf = str2ab(atob(encryptedData))
    const iv = encryptedDataBuf.slice(0, ivLength)
    const data = encryptedDataBuf.slice(ivLength)

    const decryptedContent = await crypto.subtle.decrypt(
      { name: encryptionAlgorithm, iv: iv },
      key,
      data
    )

    const decoder = new TextDecoder()
    return JSON.parse(decoder.decode(decryptedContent))
  }

  return {
    encrypt,
    decrypt,
  }
}
