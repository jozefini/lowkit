'use client'

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
} from 'react'
import { CreateStore } from '../store'
import { useRouter } from 'next/navigation'

type Session<UserData> = {
  user: UserData | null
  token: string | null
}
const SessionContext = <UserData,>() =>
  createContext<Session<UserData>>({ user: null, token: null })

type ConstructorProps = {
  cookieName?: string
}

export class CreateClientSession<UserData> {
  private sessionContext: React.Context<Session<UserData>>
  private store: CreateStore<Session<UserData>>
  private cookieName: string
  private initialCookieExpire: number

  constructor(props?: ConstructorProps) {
    const { cookieName } = props || {}
    this.sessionContext = SessionContext<UserData>()
    this.cookieName = cookieName ?? 'session'
    this.initialCookieExpire = this.getCookieExpireTime()
    this.store = new CreateStore<Session<UserData>>({
      devtools: true,
      name: 'AuthStore',
      initialMap: new Map([
        ['user', null],
        ['token', null],
      ]),
      type: 'object',
    })
  }

  public getSession(): Session<UserData> {
    const user = this.store.get('user')
    const token = this.store.get('token')
    return { user, token }
  }

  public useSession(): Session<UserData> {
    const user = this.store.use('user')
    const token = this.store.use('token')

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const value = useContext(this.sessionContext)
    return token ? { user, token } : value
  }

  public updateSession(user: UserData | null, token: string | null): void {
    this.store.set('user', user)
    this.store.set('token', token)
  }

  public hasSessionChanged(): boolean {
    const currentExpire = this.getCookieExpireTime()
    if (currentExpire !== this.initialCookieExpire) {
      this.initialCookieExpire = currentExpire
      return true
    }
    return false
  }

  private getCookieExpireTime(): number {
    const cookieValue = this.getCookieValue(this.cookieName)
    if (!cookieValue) return 0
    // Assuming the cookie value includes the expiration time as a timestamp
    // You might need to adjust this based on your actual cookie format
    const expireMatch = cookieValue?.match(/expires=(\d+)/)
    return expireMatch && expireMatch[1] ? parseInt(expireMatch[1], 10) : 0
  }

  private getCookieValue(name: string): string | undefined {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
  }

  public AuthClient({
    user,
    token,
    validate,
    deleteSession,
    children,
  }: {
    user: UserData | null
    token: string | null
    validate?: () => Promise<{ user: UserData | null; token: string | null }>
    deleteSession?: () => Promise<{ user: null; token: null }>
    children: ReactNode
  }) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { refresh } = useRouter()

    // Run on mount
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useLayoutEffect(() => {
      validate?.().then((res) => {
        const { user: rUser, token: rToken } = res || {}
        this.updateSession(rUser || null, rToken || null)

        // If server token doesn't exist on client,
        // remove session.
        if (token && !rToken) {
          deleteSession?.()
        }
      })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Run every session change
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useLayoutEffect(() => {
      this.updateSession(user, token)
    }, [user, token])

    // Run on session change
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const checkSession = () => {
        if (this.hasSessionChanged()) {
          refresh()
        }
      }
      document.addEventListener('visibilitychange', checkSession)
      return () => {
        document.removeEventListener('visibilitychange', checkSession)
      }
    }, [refresh])

    return (
      <this.sessionContext.Provider value={{ user, token }}>
        {children}
      </this.sessionContext.Provider>
    )
  }
}
