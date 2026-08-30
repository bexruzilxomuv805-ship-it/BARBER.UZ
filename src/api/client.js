import axios from 'axios'

// json-server backend — run with: npm run server (port 4000)
export const API_BASE_URL = 'http://localhost:4000'

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export default client
