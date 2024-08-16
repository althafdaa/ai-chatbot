import { jsonb, pgTable, serial, varchar } from 'drizzle-orm/pg-core'
import { chats } from './chats'

export const messages = pgTable('messages', {
  id: varchar('id', { length: 255 }).primaryKey(),
  /**
   * system | user | assistant | tool
   */
  role: varchar('role', { length: 255 }).notNull(),
  chat_id: serial('chat_id')
    .notNull()
    .references(() => chats.id),
  content: jsonb('content').notNull()
})

export type Message = typeof messages.$inferSelect
export type MessageInsert = typeof messages
