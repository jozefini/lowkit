'use server'

export class Crypto {
  private secretKey: string
  private hashAlgorithm: string
  private encryptionAlgorithm: string
  private ivLength: number
  private badEnvError = 'Crypto instance must be server-side'
  private badSecretError = 'Secret key must be provided'

  constructor(options: {
    secretKey: string
    hashAlgorithm?: string
    encryptionAlgorithm?: string
    ivLength?: number
  }) {
    if (!options.secretKey) {
      throw new Error(this.badSecretError)
    }
    if (typeof window !== 'undefined') {
      throw new Error(this.badEnvError)
    }

    this.secretKey = options.secretKey
    this.hashAlgorithm = options.hashAlgorithm || 'SHA-256'
    this.encryptionAlgorithm = options.encryptionAlgorithm || 'AES-GCM'
    this.ivLength = options.ivLength || 12
  }

  private isBrowser() {
    if (typeof window === 'undefined') {
      return false
    }
  }

  private str2ab(str: string): ArrayBuffer {
    const buf = new ArrayBuffer(str.length)
    const bufView = new Uint8Array(buf)
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i)
    }
    return buf
  }

  private ab2str(buf: ArrayBuffer): string {
    return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)))
  }

  private async generateKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hash = await crypto.subtle.digest(this.hashAlgorithm, data)
    return crypto.subtle.importKey(
      'raw',
      hash,
      { name: this.encryptionAlgorithm },
      false,
      ['encrypt', 'decrypt']
    )
  }

  async encrypt<T>(data: T, password?: string): Promise<string> {
    if (typeof window !== 'undefined') {
      return Promise.reject(new Error(this.badEnvError))
    }
    const secret = password || this.secretKey
    const key = await this.generateKey(secret)
    const encoder = new TextEncoder()
    const encodedData = encoder.encode(JSON.stringify(data))
    const iv = crypto.getRandomValues(new Uint8Array(this.ivLength))

    const encryptedContent = await crypto.subtle.encrypt(
      { name: this.encryptionAlgorithm, iv: iv },
      key,
      encodedData
    )

    const encryptedContentArr = new Uint8Array(encryptedContent)
    const buf = new Uint8Array(iv.byteLength + encryptedContentArr.byteLength)
    buf.set(iv, 0)
    buf.set(encryptedContentArr, iv.byteLength)

    return btoa(this.ab2str(buf.buffer))
  }

  async decrypt<T>(encryptedData: string, password?: string): Promise<T> {
    if (typeof window !== 'undefined') {
      return Promise.reject(new Error(this.badEnvError))
    }
    const secret = password || this.secretKey
    const key = await this.generateKey(secret)
    const encryptedDataBuf = this.str2ab(atob(encryptedData))
    const iv = encryptedDataBuf.slice(0, this.ivLength)
    const data = encryptedDataBuf.slice(this.ivLength)

    const decryptedContent = await crypto.subtle.decrypt(
      { name: this.encryptionAlgorithm, iv: iv },
      key,
      data
    )

    const decoder = new TextDecoder()
    return JSON.parse(decoder.decode(decryptedContent))
  }
}
