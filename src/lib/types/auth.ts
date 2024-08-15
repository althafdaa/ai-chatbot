import { z } from 'zod'

export const googleInfoSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  picture: z.string()
})

export type GoogleInfo = z.infer<typeof googleInfoSchema>
