import axios from 'axios'

// json-server backend — run with: npm run server (port 4000).
// In production set VITE_API_BASE_URL to the deployed json-server URL
// (e.g. Render), otherwise it falls back to localhost for local dev.
// This file is also imported directly by the Node bot process (server/bot),
// where import.meta.env doesn't exist — hence the optional chaining and the
// process.env fallback.
export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ||
  (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) ||
  'http://localhost:4000'

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export default client
