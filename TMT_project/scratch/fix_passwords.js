require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../server/db');

async function fix() {
  try {
    const hash = await bcrypt.hash('Password123!', 10);
    await db.query('UPDATE users SET password_hash = $1', [hash]);
    const res = await db.query('SELECT email, password_hash FROM users');
    for (const u of res.rows) {
      const match = await bcrypt.compare('Password123!', u.password_hash);
      console.log(`User ${u.email}: password match = ${match}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fix();
