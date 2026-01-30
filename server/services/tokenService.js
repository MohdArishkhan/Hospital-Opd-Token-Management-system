import { query, queryOne } from '../db.js';
import { getIo } from '../socket.js';

const PRIORITY_MAP = {
  emergency: 1,
  paid: 2,
  followup: 3,
  online: 4
};

export async function allocateToken(patientId, slotId, patientType) {
  const slot = await queryOne(
    'SELECT * FROM slots WHERE id = $1',
    [slotId]
  );

  if (!slot) throw new Error('Slot not found');
  if (slot.status !== 'open') throw new Error('Slot is not open');
  if (slot.current_capacity >= slot.max_capacity) {
    throw new Error('Slot is at full capacity');
  }

  const priorityLevel = PRIORITY_MAP[patientType] || PRIORITY_MAP.online;
  const nextToken = slot.current_capacity + 1;

  const token = await queryOne(
    `INSERT INTO tokens (patient_id, slot_id, token_number, priority_level, status)
     VALUES ($1, $2, $3, $4, 'allocated')
     RETURNING *`,
    [patientId, slotId, nextToken, priorityLevel]
  );

  await query(
    'UPDATE slots SET current_capacity = current_capacity + 1 WHERE id = $1',
    [slotId]
  );

  // emit websocket event
  const io = getIo();
  if (io) io.emit('token:allocated', { token, slotId });

  return token;
}

export async function reallocateToken(tokenId, newSlotId) {
  const token = await queryOne(
    'SELECT * FROM tokens WHERE id = $1',
    [tokenId]
  );

  if (!token) throw new Error('Token not found');

  const oldSlot = await queryOne(
    'SELECT * FROM slots WHERE id = $1',
    [token.slot_id]
  );

  const newSlot = await queryOne(
    'SELECT * FROM slots WHERE id = $1',
    [newSlotId]
  );

  if (!newSlot) throw new Error('New slot not found');
  if (newSlot.status !== 'open') throw new Error('Target slot is not open');
  if (newSlot.current_capacity >= newSlot.max_capacity) {
    throw new Error('Target slot is at full capacity');
  }

  // Update token
  await query(
    'UPDATE tokens SET slot_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newSlotId, tokenId]
  );

  // Adjust capacities
  await query(
    'UPDATE slots SET current_capacity = current_capacity - 1 WHERE id = $1',
    [token.slot_id]
  );

  await query(
    'UPDATE slots SET current_capacity = current_capacity + 1 WHERE id = $1',
    [newSlotId]
  );

  const updatedToken = await queryOne('SELECT * FROM tokens WHERE id = $1', [tokenId]);

  // emit websocket event
  const io = getIo();
  if (io) io.emit('token:reallocated', { token: updatedToken, fromSlotId: oldSlot.id, toSlotId: newSlotId });

  return updatedToken;
}

export async function insertEmergency(patientId, slotId) {
  const slot = await queryOne(
    'SELECT * FROM slots WHERE id = $1',
    [slotId]
  );

  if (!slot) throw new Error('Slot not found');

  if (slot.current_capacity < slot.max_capacity) {
    return allocateToken(patientId, slotId, 'emergency');
  }

  // If slot is full, bump the lowest priority token and reallocate emergency
  const lowestPriority = await queryOne(
    `SELECT * FROM tokens WHERE slot_id = $1 AND status = 'allocated'
     ORDER BY priority_level DESC, created_at DESC LIMIT 1`,
    [slotId]
  );

  if (!lowestPriority) {
    throw new Error('Cannot insert emergency - no tokens to bump');
  }

  // Find next available slot for bumped patient
  const nextSlot = await queryOne(
    `SELECT * FROM slots WHERE doctor_id = $1 AND start_time > $2 
     AND status = 'open' AND current_capacity < max_capacity
     ORDER BY start_time ASC LIMIT 1`,
    [slot.doctor_id, slot.end_time]
  );

  if (!nextSlot) {
    throw new Error('No available slot to bump patient to');
  }

  // Reallocate bumped token
  await reallocateToken(lowestPriority.id, nextSlot.id);

  // Allocate emergency with priority
  const emergency = await queryOne(
    `INSERT INTO tokens (patient_id, slot_id, token_number, priority_level, status)
     VALUES ($1, $2, $3, 1, 'allocated')
     RETURNING *`,
    [patientId, slotId, lowestPriority.token_number]
  );

  return emergency;
}

export async function cancelToken(tokenId, reason = '') {
  const token = await queryOne(
    'SELECT * FROM tokens WHERE id = $1',
    [tokenId]
  );

  if (!token) throw new Error('Token not found');

  await query(
    'UPDATE tokens SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    ['cancelled', tokenId]
  );

  await query(
    'INSERT INTO cancellations (token_id, reason) VALUES ($1, $2)',
    [tokenId, reason]
  );

  await query(
    'UPDATE slots SET current_capacity = current_capacity - 1 WHERE id = $1',
    [token.slot_id]
  );

  // emit websocket event
  const io = getIo();
  if (io) io.emit('token:cancelled', { token, slotId: token.slot_id });

  return token;
}

export async function getSlotQueue(slotId) {
  return query(
    `SELECT t.*, p.name, p.phone, p.patient_type
     FROM tokens t
     JOIN patients p ON t.patient_id = p.id
     WHERE t.slot_id = $1 AND t.status = 'allocated'
     ORDER BY t.priority_level ASC, t.token_number ASC`,
    [slotId]
  );
}
