'use server'

import { signIn } from '@/auth'
import { User } from '@/lib/types'
import { AuthError } from 'next-auth'
import { z } from 'zod'
import { kv } from '@vercel/kv'
import { ResultCode } from '@/lib/utils'
import { GoogleInfo, googleInfoSchema } from '@/lib/types/auth'
import { createNewJWT, getUserByEmail } from '../actions'
import { hash } from 'bcrypt'
import { generateRandomString } from '@/components/ui/codeblock'
import { db } from '@/db/drizzle'
import { refresh_tokens, users } from '@/db/schema'
import { cookies } from 'next/headers'

export async function getUser(email: string) {
  const user = await kv.hgetall<User>(`user:${email}`)
  return user
}

interface Result {
  type: string
  resultCode: ResultCode
}

export async function authenticate(
  _prevState: Result | undefined,
  formData: FormData
): Promise<Result | undefined> {
  try {
    const email = formData.get('email')
    const password = formData.get('password')

    const parsedCredentials = z
      .object({
        email: z.string().email(),
        password: z.string().min(6)
      })
      .safeParse({
        email,
        password
      })

    if (parsedCredentials.success) {
      await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      return {
        type: 'success',
        resultCode: ResultCode.UserLoggedIn
      }
    } else {
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials
      }
    }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return {
            type: 'error',
            resultCode: ResultCode.InvalidCredentials
          }
        default:
          return {
            type: 'error',
            resultCode: ResultCode.UnknownError
          }
      }
    }
  }
}

export const getGoogleAccessTokenFromCode = async (code: string) => {
  const endpoint = new URL('https://oauth2.googleapis.com/token')
  endpoint.searchParams.set('code', code)
  endpoint.searchParams.set('grant_type', 'authorization_code')
  endpoint.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
  endpoint.searchParams.set('client_secret', process.env.GOOGLE_CLIENT_SECRET!)
  endpoint.searchParams.set('redirect_uri', 'http://localhost:3000')

  const response = await fetch(endpoint.origin + endpoint.pathname, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: endpoint.searchParams.toString()
  })
  if (!response.ok) {
    throw new Error('FAILED_TO_GET_ACCESS_TOKEN')
  }
  const json = (await response.json()) as { access_token: string }
  return json.access_token
}

export const getGoogleUserInfo = async (accessToken: string) => {
  const userInfoResponse = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  )

  if (!userInfoResponse.ok) {
    throw new Error('FAILED_TO_GET_USER_INFO')
  }

  const userInfo = await userInfoResponse.json()
  const parsed = googleInfoSchema.safeParse(userInfo)
  if (!parsed.success) {
    throw new Error('FAILED_TO_PARSE_USER_INFO')
  }
  return parsed.data
}

const hashPassword = async (password: string) => {
  const salt = await hash(password, 10)
  return salt
}

export const createNewAccount = async (payload: GoogleInfo) => {
  const password = generateRandomString(10)
  const salt = await hashPassword(password)
  const [returning] = await db
    .insert(users)
    .values({
      email: payload.email,
      hash: salt,
      profile_picture_url: payload.picture
    })
    .returning({ id: users.id })
  return returning.id
}

export const createNewRefreshToken = async ({
  accessToken,
  userId
}: {
  accessToken: string
  userId: number
}) => {
  const now = new Date()
  // set 1 month from now
  now.setMonth(now.getMonth() + 1)
  const generatedToken = generateRandomString(32)
  const [refresh] = await db
    .insert(refresh_tokens)
    .values({
      access_token: accessToken,
      user_id: userId,
      token: generatedToken,
      expired_at: now
    })
    .returning()
  return refresh
}

export const setCookies = (
  {
    accessToken,
    exp
  }: {
    accessToken: string
    exp: number
  },
  {
    refreshToken,
    expired_at
  }: {
    refreshToken: string
    expired_at: Date
  }
) => {
  cookies().set('access_token', accessToken, {
    secure: true,
    sameSite: true,
    expires: Date.now() + exp * 1000
  })

  cookies().set('refresh_token', refreshToken, {
    secure: true,
    sameSite: true,
    expires: new Date(expired_at).getTime()
  })
}

const login = async ({ email, userId }: { email: string; userId: number }) => {
  const at = await createNewJWT({
    email: email,
    id: userId
  })
  const rt = await createNewRefreshToken({
    accessToken: at.token,
    userId
  })

  setCookies(
    {
      accessToken: at.token,
      exp: at.payload.exp as number
    },
    {
      refreshToken: rt.token,
      expired_at: rt.expired_at
    }
  )
  return {
    access_token: at.token,
    refresh_token: rt.token
  }
}

export const authenticateWithGoogle = async (code: string) => {
  try {
    const googleAccessToken = await getGoogleAccessTokenFromCode(code)
    const googleUserInfo = await getGoogleUserInfo(googleAccessToken)
    const user = await getUserByEmail(googleUserInfo.email)
    if (!user) {
      const id = await createNewAccount(googleUserInfo)
      const { access_token, refresh_token } = await login({
        email: googleUserInfo.email,
        userId: id
      })

      return {
        code: 201,
        data: {
          access_token: access_token,
          refresh_token: refresh_token
        }
      }
    } else {
      const { access_token, refresh_token } = await login({
        email: user.email,
        userId: user.id
      })

      return {
        code: 200,
        data: {
          access_token: access_token,
          refresh_token: refresh_token
        }
      }
    }
  } catch (error) {
    console.error(error)
    return {
      code: 500,
      error: 'INTERNAL_SERVER_ERROR'
    }
  }
}
