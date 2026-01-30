import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
console.log('Connection String Found:', !!process.env.DATABASE_URL);
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString });

const queries = [
  `
  CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS slots (
    id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    max_capacity INT NOT NULL,
    current_capacity INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doctor_id, start_time)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    patient_type VARCHAR(50) NOT NULL CHECK (patient_type IN ('emergency', 'paid', 'followup', 'online')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    slot_id INT NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    token_number INT NOT NULL,
    status VARCHAR(50) DEFAULT 'allocated',
    priority_level INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slot_id, token_number)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS cancellations (
    id SERIAL PRIMARY KEY,
    token_id INT NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `CREATE INDEX IF NOT EXISTS idx_tokens_slot_id ON tokens(slot_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tokens_patient_id ON tokens(patient_id)`,
  `CREATE INDEX IF NOT EXISTS idx_slots_doctor_id ON slots(doctor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_patients_type ON patients(patient_type)`
];

async function migrate() {
  try {
    console.log('Starting migration');
    
    for (const query of queries) {
      await pool.query(query);
      console.log('Query executed');
    }
    
    console.log('Migration completed successfully');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    try {
      await pool.end();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }
}

migrate();
