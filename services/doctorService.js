import { query, queryOne } from '../server/db.js';

export async function createDoctor(name, specialty) {
  return queryOne(
    'INSERT INTO doctors (name, specialty, status) VALUES ($1, $2, $3) RETURNING *',
    [name, specialty, 'available']
  );
}

export async function getDoctor(doctorId) {
  return queryOne('SELECT * FROM doctors WHERE id = $1', [doctorId]);
}

export async function getDoctorSlots(doctorId) {
  return query(
    `SELECT s.*, d.name as doctor_name FROM slots s
     JOIN doctors d ON s.doctor_id = d.id
     WHERE s.doctor_id = $1 ORDER BY s.start_time ASC`,
    [doctorId]
  );
}

export async function updateDoctorStatus(doctorId, status) {
  return queryOne(
    'UPDATE doctors SET status = $1 WHERE id = $2 RETURNING *',
    [status, doctorId]
  );
}
