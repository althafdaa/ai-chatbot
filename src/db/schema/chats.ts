import {
  boolean,
  pgTable,
  serial,
  timestamp,
  varchar
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  is_public: boolean('is_public').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  deleted_at: timestamp('deleted_at'),

  user_id: serial('user_id')
    .notNull()
    .references(() => users.id)
})

export type Chat = typeof chats.$inferSelect
export type ChatInsert = typeof chats.$inferInsert
