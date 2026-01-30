import { query, queryOne } from '../db.js';

export async function createSlot(doctorId, startTime, endTime, maxCapacity) {
  return queryOne(
    `INSERT INTO slots (doctor_id, start_time, end_time, max_capacity, status)
     VALUES ($1, $2, $3, $4, 'open') RETURNING *`,
    [doctorId, startTime, endTime, maxCapacity]
  );
}

export async function getSlot(slotId) {
  return queryOne('SELECT * FROM slots WHERE id = $1', [slotId]);
}

export async function updateSlotStatus(slotId, status) {
  return queryOne(
    'UPDATE slots SET status = $1 WHERE id = $2 RETURNING *',
    [status, slotId]
  );
}

export async function getAvailableSlots(doctorId, date) {
  return query(
    `SELECT * FROM slots 
     WHERE doctor_id = $1 
     AND DATE(start_time) = $2
     AND status = 'open'
     AND current_capacity < max_capacity
     ORDER BY start_time ASC`,
    [doctorId, date]
  );
}

export async function closeSlot(slotId) {
  return queryOne(
    'UPDATE slots SET status = $1 WHERE id = $2 RETURNING *',
    ['closed', slotId]
  );
}
