'server only'

import { Crypto } from '../crypto'

type CookieOptions = {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  path?: string
  expires?: Date
}

type CookieManager = {
  get: (name: string) => string | undefined
  set: (name: string, value: string, options?: CookieOptions) => void
  delete: (name: string) => void
}

export class AuthServer<UserData> {
  private crypto: Crypto
  private cookieManager: CookieManager
  private cookieOptions: {
    userName: string
    tokenName: string
    expires: number
    options: CookieOptions
  }

  constructor(
    secretKey: string,
    cookieManager: CookieManager,
    cookieOptions?: {
      name?: string
      expires?: number
      options?: CookieOptions
    }
  ) {
    const cookieName = cookieOptions?.name || 'session'
    this.crypto = new Crypto({ secretKey })
    this.cookieManager = cookieManager
    this.cookieOptions = {
      userName: cookieOptions?.name || 'session',
      tokenName: `${cookieName}-id`,
      expires: cookieOptions?.expires || 7 * 24 * 60 * 60 * 1000, // 7 days
      options: {
        httpOnly: cookieOptions?.options?.httpOnly || true,
        secure:
          cookieOptions?.options?.secure ||
          process.env.NODE_ENV === 'production',
        sameSite: cookieOptions?.options?.sameSite || 'lax',
        path: cookieOptions?.options?.path || '/',
      },
    }
  }

  async createSession(
    token: string,
    user: UserData
  ): Promise<{
    user: UserData
    token: string
  }> {
    // 1. Set expiration date
    const expires = new Date(Date.now() + this.cookieOptions.expires)

    // 2. Encrypt the session and token cookies
    const encryptedUser = await this.crypto.encrypt(JSON.stringify(user))
    const encryptedToken = await this.crypto.encrypt(token)

    // 3. Set the session and token cookies
    this.cookieManager.set(this.cookieOptions.userName, encryptedUser, {
      ...this.cookieOptions.options,
      expires,
    })
    this.cookieManager.set(this.cookieOptions.tokenName, encryptedToken, {
      ...this.cookieOptions.options,
      expires,
    })

    // 4. Return the user and token
    return { user, token }
  }

  async getSession(): Promise<{
    user: UserData | null
    token: string | null
  }> {
    // 1. Get the session and token
    const userCookie = this.cookieManager.get(this.cookieOptions.userName)
    const tokenCookie = this.cookieManager.get(this.cookieOptions.tokenName)

    // 2. If the cookies are not set, return null
    if (!userCookie || !tokenCookie) {
      return { user: null, token: null }
    }

    try {
      // 3. Decrypt the session and token cookies
      const decryptedUser = await this.crypto.decrypt(userCookie)
      const token = await this.crypto.decrypt(tokenCookie)
      const user = JSON.parse(decryptedUser) as UserData

      // 4. Return the user and token
      return { user, token }
    } catch (error) {
      // 5. If there is an error, return null
      return { user: null, token: null }
    }
  }

  async deleteSession(): Promise<{
    user: null
    token: null
  }> {
    // 1. Delete the session and token cookies
    this.cookieManager.delete(this.cookieOptions.userName)
    this.cookieManager.delete(this.cookieOptions.tokenName)

    // 2. Return null
    return { user: null, token: null }
  }
}
