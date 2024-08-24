'server only'

import { Crypto } from '../crypto'
import { cookies } from 'next/headers'

type CookieOptions = {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  path?: string
  expires?: Date
}
type ConstructorProps = {
  secretKey: string
  cookieName?: string
  cookieOptions?: {
    expires?: number
    options?: CookieOptions
  }
}

export class CreateServerAuth<UserData> {
  private tokenNameSuffix = '_key'
  private crypto: Crypto
  private userCookieName: string
  private tokenCookieName: string
  private cookieOptions: {
    expires: number
    options: CookieOptions
  }

  constructor(props: ConstructorProps) {
    const { secretKey, cookieName, cookieOptions } = props || {}
    this.crypto = new Crypto({ secretKey })
    this.userCookieName = cookieName || 'session'
    this.tokenCookieName = `${this.userCookieName}${this.tokenNameSuffix}`
    this.cookieOptions = {
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
    cookies()
      .set(this.userCookieName, encryptedUser, {
        ...this.cookieOptions.options,
        expires,
      })
      .set(this.tokenCookieName, encryptedToken, {
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
    const userCookie = cookies().get(this.userCookieName)?.value || ''
    const tokenCookie = cookies().get(this.tokenCookieName)?.value || ''

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
    cookies().delete(this.userCookieName).delete(this.tokenCookieName)

    // 2. Return null
    return { user: null, token: null }
  }
}
