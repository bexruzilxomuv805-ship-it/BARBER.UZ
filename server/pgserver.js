import 'dotenv/config'
import express from 'express'
import { Pool } from 'pg'

// Drop-in replacement for `json-server server/db.json` backed by a real
// Postgres database (see scripts/migrate-to-postgres.mjs) instead of a file
// on Render's ephemeral disk — so bookings/chats/users created in production
// survive redeploys and idle-timeout restarts. Each collection is a table
// `(id TEXT PRIMARY KEY, data JSONB)`; the REST surface (list with simple
// equality filters + _sort/_order, get-by-id, POST, PATCH-merge, DELETE)
// intentionally mirrors json-server's so the frontend and bot code that
// talk to this API didn't need to change.

const { DATABASE_URL, PORT } = process.env
if (!DATABASE_URL) {
  console.error("[api] DATABASE_URL yo'q — .env faylini tekshiring (.env.example ga qarang).")
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

const COLLECTIONS = [
  'users', 'barbers', 'services', 'appointments', 'inventory', 'payments',
  'reviews', 'messages', 'conversations', 'telegramLogins',
]

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

function rowToRecord(row) {
  return { ...row.data, id: row.id }
}

// contactInfo is a singleton object in db.json, not a collection — handled
// separately from the generic :resource routes below.
app.get('/contactInfo', async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT data FROM contact_info WHERE id = 'contactInfo'")
    res.json(rows[0]?.data || {})
  } catch (err) {
    next(err)
  }
})

app.patch('/contactInfo', async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT data FROM contact_info WHERE id = 'contactInfo'")
    const merged = { ...(rows[0]?.data || {}), ...req.body }
    await pool.query(
      `INSERT INTO contact_info (id, data) VALUES ('contactInfo', $1)
       ON CONFLICT (id) DO UPDATE SET data = $1`,
      [JSON.stringify(merged)]
    )
    res.json(merged)
  } catch (err) {
    next(err)
  }
})

app.get('/:resource', async (req, res, next) => {
  const { resource } = req.params
  if (!COLLECTIONS.includes(resource)) return res.status(404).json({})
  try {
    const { rows } = await pool.query(`SELECT id, data FROM ${resource}`)
    let records = rows.map(rowToRecord)

    const { _sort, _order, ...filters } = req.query
    for (const [key, value] of Object.entries(filters)) {
      records = records.filter((r) => String(r[key]) === String(value))
    }
    if (_sort) {
      const dir = _order === 'desc' ? -1 : 1
      records.sort((a, b) => {
        const av = a[_sort] ?? ''
        const bv = b[_sort] ?? ''
        return av < bv ? -dir : av > bv ? dir : 0
      })
    }
    res.json(records)
  } catch (err) {
    next(err)
  }
})

app.get('/:resource/:id', async (req, res, next) => {
  const { resource, id } = req.params
  if (!COLLECTIONS.includes(resource)) return res.status(404).json({})
  try {
    const { rows } = await pool.query(`SELECT id, data FROM ${resource} WHERE id = $1`, [id])
    if (!rows.length) return res.status(404).json({})
    res.json(rowToRecord(rows[0]))
  } catch (err) {
    next(err)
  }
})

app.post('/:resource', async (req, res, next) => {
  const { resource } = req.params
  if (!COLLECTIONS.includes(resource)) return res.status(404).json({})
  const body = req.body || {}
  const id = body.id != null ? String(body.id) : `${resource[0]}-${Date.now()}`
  const data = { ...body, id }
  try {
    await pool.query(`INSERT INTO ${resource} (id, data) VALUES ($1, $2)`, [id, JSON.stringify(data)])
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

app.patch('/:resource/:id', async (req, res, next) => {
  const { resource, id } = req.params
  if (!COLLECTIONS.includes(resource)) return res.status(404).json({})
  try {
    const { rows } = await pool.query(`SELECT data FROM ${resource} WHERE id = $1`, [id])
    if (!rows.length) return res.status(404).json({})
    const merged = { ...rows[0].data, ...req.body, id }
    await pool.query(`UPDATE ${resource} SET data = $1 WHERE id = $2`, [JSON.stringify(merged), id])
    res.json(merged)
  } catch (err) {
    next(err)
  }
})

app.delete('/:resource/:id', async (req, res, next) => {
  const { resource, id } = req.params
  if (!COLLECTIONS.includes(resource)) return res.status(404).json({})
  try {
    await pool.query(`DELETE FROM ${resource} WHERE id = $1`, [id])
    res.json({})
  } catch (err) {
    next(err)
  }
})

app.use((err, req, res, _next) => {
  console.error('[api] error:', err.message)
  res.status(500).json({ error: err.message })
})

const port = PORT || 4000
app.listen(port, () => console.log(`[api] Postgres-backed API listening on :${port}`))
