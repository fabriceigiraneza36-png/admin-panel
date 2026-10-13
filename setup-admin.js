import bcrypt from 'bcryptjs'
import pg from 'pg'

const required = [
  'DATABASE_URL',
  'ADMIN_EMAIL',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
]

const missing = required.filter((key) => !process.env[key])
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  console.error('Set them in your local environment before running this script.')
  process.exit(1)
}

const config = {
  dbUrl: process.env.DATABASE_URL,
  email: process.env.ADMIN_EMAIL,
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD,
  fullName: process.env.ADMIN_FULL_NAME || 'Super Admin',
  role: process.env.ADMIN_ROLE || 'admin',
}

async function run() {
  const hash = await bcrypt.hash(config.password, 12)
  const client = new pg.Client({
    connectionString: config.dbUrl,
    ssl: { rejectUnauthorized: false },
  })

  try {
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

    const result = await client.query(sql, [
      config.username,
      config.email,
      hash,
      config.fullName,
      config.role,
    ])

    const admin = result.rows[0]
    console.log('Admin account configured:', {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      active: admin.is_active,
    })
  } catch (error) {
    console.error('Admin setup failed:', error.message)
    process.exitCode = 1
  } finally {
    await client.end().catch(() => {})
  }
}

run().catch((error) => {
  console.error('Admin setup failed:', error.message)
  process.exitCode = 1
})
