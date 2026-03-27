import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret')
const COOKIE_NAME = 'ss_token'

export async function createToken(code: string): Promise<string | null> {
  const validCodes = (process.env.INVITE_CODES || '').split(',').map(c => c.trim())
  if (!validCodes.includes(code)) return null

  const token = await new SignJWT({ code, role: 'user' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET)

  return token
}

export async function verifyToken(token: string): Promise<{ code: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as any
  } catch {
    return null
  }
}

export async function getSession(): Promise<{ code: string; role: string } | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export { COOKIE_NAME }
