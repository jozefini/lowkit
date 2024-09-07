'use server'

export function createCrypto({
  secretKey,
  hashAlgorithm = 'SHA-256',
  encryptionAlgorithm = 'AES-GCM',
  ivLength = 12,
  iterations = 100000,
  saltLength = 16,
}: {
  secretKey: string
  hashAlgorithm?: string
  encryptionAlgorithm?: string
  ivLength?: number
  iterations?: number
  saltLength?: number
}) {
  const badEnvError = 'Operation not permitted'
  const badSecretError = 'Invalid configuration'

  if (!secretKey || typeof secretKey !== 'string' || secretKey.length < 32) {
    throw new Error(badSecretError)
  }
  if (typeof window !== 'undefined') {
    throw new Error(badEnvError)
  }

  function str2ab(str: string): ArrayBuffer {
    return new TextEncoder().encode(str)
  }

  function ab2str(buf: ArrayBuffer): string {
    return new TextDecoder().decode(buf)
  }

  async function pbkdf2(
    password: string,
    salt: Uint8Array
  ): Promise<ArrayBuffer> {
    const passwordBuffer = str2ab(password)

    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )

    return crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: hashAlgorithm,
      },
      baseKey,
      256 // 256 bits
    )
  }

  async function getKeyWithPBKDF2(salt?: Uint8Array): Promise<CryptoKey> {
    const actualSalt =
      salt ?? crypto.getRandomValues(new Uint8Array(saltLength))
    const keyMaterial = await pbkdf2(secretKey, actualSalt)
    return crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: encryptionAlgorithm },
      false,
      ['encrypt', 'decrypt']
    )
  }

  async function getKeyWithoutPBKDF2(): Promise<CryptoKey> {
    const keyMaterial = str2ab(secretKey.slice(0, 32))
    return crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: encryptionAlgorithm },
      false,
      ['encrypt', 'decrypt']
    )
  }

  async function encryptWithKey<T = string>(
    data: T,
    getKey: (salt?: Uint8Array) => Promise<CryptoKey>,
    useSalt: boolean
  ): Promise<string> {
    if (typeof window !== 'undefined') {
      return Promise.reject(new Error(badEnvError))
    }
    const salt = useSalt
      ? crypto.getRandomValues(new Uint8Array(saltLength))
      : new Uint8Array(0)
    const key = await getKey(salt)
    const encodedData = str2ab(JSON.stringify(data))
    const iv = crypto.getRandomValues(new Uint8Array(ivLength))

    const encryptedContent = await crypto.subtle.encrypt(
      { name: encryptionAlgorithm, iv: iv },
      key,
      encodedData
    )

    const encryptedContentArr = new Uint8Array(encryptedContent)
    const buf = new Uint8Array(
      salt.byteLength + iv.byteLength + encryptedContentArr.byteLength
    )
    buf.set(salt, 0)
    buf.set(iv, salt.byteLength)
    buf.set(encryptedContentArr, salt.byteLength + iv.byteLength)

    return btoa(String.fromCharCode.apply(null, Array.from(buf)))
  }

  async function decryptWithKey<T = string>(
    encryptedData: string,
    getKey: (salt?: Uint8Array) => Promise<CryptoKey>,
    useSalt: boolean
  ): Promise<T> {
    if (typeof window !== 'undefined') {
      return Promise.reject(new Error(badEnvError))
    }
    const buf = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map((char) => char.charCodeAt(0))
    )
    const salt = useSalt ? buf.slice(0, saltLength) : new Uint8Array(0)
    const iv = buf.slice(
      useSalt ? saltLength : 0,
      (useSalt ? saltLength : 0) + ivLength
    )
    const data = buf.slice((useSalt ? saltLength : 0) + ivLength)

    const key = await getKey(salt)

    const decryptedContent = await crypto.subtle.decrypt(
      { name: encryptionAlgorithm, iv: iv },
      key,
      data
    )

    return JSON.parse(ab2str(decryptedContent))
  }

  const secureEncrypt = <T = string>(data: T) =>
    encryptWithKey(data, getKeyWithPBKDF2, true)
  const secureDecrypt = <T = string>(encryptedData: string) =>
    decryptWithKey<T>(encryptedData, getKeyWithPBKDF2, true)

  const encrypt = <T = string>(data: T) =>
    encryptWithKey(data, getKeyWithoutPBKDF2, false)
  const decrypt = <T = string>(encryptedData: string) =>
    decryptWithKey<T>(encryptedData, getKeyWithoutPBKDF2, false)

  return {
    secureEncrypt,
    secureDecrypt,
    encrypt,
    decrypt,
  }
}
