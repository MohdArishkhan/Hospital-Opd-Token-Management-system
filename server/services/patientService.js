import { query, queryOne } from '../db.js';

export async function createPatient(name, phone, patientType) {
  if (!['emergency', 'paid', 'followup', 'online'].includes(patientType)) {
    throw new Error('Invalid patient type');
  }

  return queryOne(
    `INSERT INTO patients (name, phone, patient_type) VALUES ($1, $2, $3)
     ON CONFLICT (phone) DO UPDATE SET name = $1, patient_type = $3
     RETURNING *`,
    [name, phone, patientType]
  );
}

export async function getPatient(patientId) {
  return queryOne('SELECT * FROM patients WHERE id = $1', [patientId]);
}

export async function getPatientByPhone(phone) {
  return queryOne('SELECT * FROM patients WHERE phone = $1', [phone]);
}

export async function getPatientTokens(patientId) {
  return query(
    `SELECT t.*, s.start_time, s.end_time, d.name as doctor_name
     FROM tokens t
     JOIN slots s ON t.slot_id = s.id
     JOIN doctors d ON s.doctor_id = d.id
     WHERE t.patient_id = $1
     ORDER BY s.start_time DESC`,
    [patientId]
  );
}
