import bcrypt from 'bcryptjs'
import pg from 'pg'
import fetch from 'node-fetch'

const CONFIG = {
  dbUrl:
    'postgresql://neondb_owner:npg_tHirA2BjhbJ3@ep-gentle-butterfly-aii8023t-pooler.c-4.us-east-1.aws.neon.tech/altuvera?sslmode=require&channel_binding=require',
  apiUrl: 'https://backend-jd8f.onrender.com/api',
  email: 'admin@altuvera.com',
  username: 'admin',
  password: 'altuvera',
  fullName: 'Super Admin',
  role: 'admin',
}

async function run() {
  console.log('\n🚀 ALTUVERA ADMIN SETUP\n====================\n')

  // 1. HASH PASSWORD
  console.log('[1/3] Generating bcrypt hash...')
  const hash = await bcrypt.hash(CONFIG.password, 12)
  console.log('✔ Hash generated')

  const client = new pg.Client({
    connectionString: CONFIG.dbUrl,
    ssl: { rejectUnauthorized: false },
  })

  try {
    console.log('\n[2/3] Connecting DB...')
    await client.connect()

    const sql = `
      INSERT INTO admin_users
        (username, email, password_hash, full_name, role, is_active)
      VALUES
        ($1, $2, $3, $4, $5, true)
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = true,
        updated_at = NOW()
      RETURNING id, username, email, role, is_active;
    `

    const res = await client.query(sql, [
      CONFIG.username,
      CONFIG.email,
      hash,
      CONFIG.fullName,
      CONFIG.role,
    ])

    console.log('✔ Admin saved:', res.rows[0])
  } catch (err) {
    console.error('DB ERROR:', err.message)
  } finally {
    await client.end().catch(() => {})
  }

  console.log('\n[3/3] Testing login...')

  try {
    const res = await fetch(CONFIG.apiUrl + '/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: CONFIG.email,
        password: CONFIG.password,
      }),
    })

    const data = await res.json()
    console.log('\nLOGIN RESPONSE:\n', data)
  } catch (err) {
    console.error('Login error:', err.message)
  }
}

run()