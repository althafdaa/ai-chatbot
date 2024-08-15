import 'dotenv/config'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { newDrizzle } from './drizzle'

const { db, connection } = newDrizzle(process.env.DB_URL!)
migrate(db, { migrationsFolder: 'src/db/sql_schema' })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => {
    connection.end()
  })
