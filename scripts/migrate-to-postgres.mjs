import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

// One-time (and re-runnable) loader: creates the Postgres tables the new
// server/pgserver.js expects and copies server/db.json's current contents
// into them. Safe to re-run — it upserts by id, so re-running after editing
// db.json locally just syncs the changes over.

const { DATABASE_URL } = process.env
if (!DATABASE_URL) {
  console.error("DATABASE_URL yo'q — .env faylini tekshiring.")
  process.exit(1)
}

const dbPath = fileURLToPath(new URL('../server/db.json', import.meta.url))
const db = JSON.parse(readFileSync(dbPath, 'utf-8'))

const COLLECTIONS = [
  'users', 'barbers', 'services', 'appointments', 'inventory', 'payments',
  'reviews', 'messages', 'conversations', 'telegramLogins',
]

const pool = new Pool({ connectionString: DATABASE_URL })

async function main() {
  for (const name of COLLECTIONS) {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (id TEXT PRIMARY KEY, data JSONB NOT NULL)`)
    const records = db[name] || []
    for (const record of records) {
      await pool.query(
        `INSERT INTO ${name} (id, data) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET data = $2`,
        [String(record.id), JSON.stringify(record)]
      )
    }
    console.log(`[migrate] ${name}: ${records.length} ta yozuv`)
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS contact_info (id TEXT PRIMARY KEY, data JSONB NOT NULL)`)
  if (db.contactInfo) {
    await pool.query(
      `INSERT INTO contact_info (id, data) VALUES ('contactInfo', $1)
       ON CONFLICT (id) DO UPDATE SET data = $1`,
      [JSON.stringify(db.contactInfo)]
    )
    console.log('[migrate] contactInfo: 1 ta yozuv')
  }

  await pool.end()
  console.log('[migrate] tugadi.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
