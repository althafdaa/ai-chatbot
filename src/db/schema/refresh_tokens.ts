import { pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core'
import { users } from './users'

export const refresh_tokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  token: varchar('token', { length: 255 }).unique().notNull(),
  access_token: varchar('access_token', { length: 255 }).unique().notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  expired_at: timestamp('expired_at').notNull(),
  deleted_at: timestamp('deleted_at'),
  user_id: serial('user_id')
    .notNull()
    .references(() => users.id)
})

export type RefreshToken = typeof refresh_tokens.$inferSelect
export type RefreshTokenInsert = typeof refresh_tokens.$inferInsert
