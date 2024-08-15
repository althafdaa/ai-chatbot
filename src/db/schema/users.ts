import { relations } from 'drizzle-orm'
import { pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  hash: varchar('hash', { length: 255 }).unique().notNull(),
  profile_picture_url: varchar('profile_picture_url', {
    length: 255
  }).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at')
})

export type User = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert
