import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schemas from './schema'

export const newDrizzle = (dsn: string) => {
  const queryClient = postgres(dsn)
  return {
    db: drizzle(queryClient, { schema: schemas }),
    connection: queryClient
  }
}

export type NewDrizzle = ReturnType<typeof newDrizzle>

const { db, connection } = newDrizzle(process.env.DB_URL!)
export { db, connection }
