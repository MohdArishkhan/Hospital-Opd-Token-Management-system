# OPD Token Allocation Engine - API Documentation

## Overview
RESTful API for managing Out-Patient Department (OPD) token allocation with priority-based queuing and dynamic reallocation.

## Base URL
```
http://localhost:3001/api
```

## Doctor Endpoints

### Create Doctor
```
POST /doctors
Body: { name: string, specialty: string }
Response: { id, name, specialty, status, created_at }
```

### Get Doctor
```
GET /doctors/:id
Response: { id, name, specialty, status, created_at }
```

### Get Doctor's Slots
```
GET /doctors/:id/slots
Response: [{ id, doctor_id, start_time, end_time, max_capacity, current_capacity, status, ... }]
```

### Update Doctor Status
```
PATCH /doctors/:id/status
Body: { status: 'available' | 'unavailable' }
Response: { id, name, specialty, status, ... }
```

## Slot Endpoints

### Create Slot
```
POST /slots
Body: { doctorId: int, startTime: ISO8601, endTime: ISO8601, maxCapacity: int }
Response: { id, doctor_id, start_time, end_time, max_capacity, current_capacity, status, ... }
```

### Get Slot
```
GET /slots/:id
Response: { id, doctor_id, start_time, end_time, max_capacity, current_capacity, status, ... }
```

### Get Slot Queue
```
GET /slots/:id/queue
Response: [{ id, token_number, name, phone, patient_type, priority_level, status, ... }]
```

### Get Available Slots
```
GET /doctors/:id/available-slots?date=YYYY-MM-DD
Response: [{ id, doctor_id, start_time, end_time, max_capacity, current_capacity, ... }]
```

### Update Slot Status
```
PATCH /slots/:id/status
Body: { status: 'open' | 'closed' }
Response: { id, doctor_id, start_time, end_time, max_capacity, current_capacity, status, ... }
```

## Patient Endpoints

### Create Patient
```
POST /patients
Body: { name: string, phone: string, patientType: 'emergency' | 'paid' | 'followup' | 'online' }
Response: { id, name, phone, patient_type, created_at }
```

### Get Patient
```
GET /patients/:id
Response: { id, name, phone, patient_type, created_at }
```

### Get Patient Tokens
```
GET /patients/:id/tokens
Response: [{ id, token_number, slot_id, status, priority_level, start_time, end_time, doctor_name, ... }]
```

## Token Endpoints

### Allocate Token
```
POST /tokens
Body: { patientId: int, slotId: int, patientType: string }
Response: { id, patient_id, slot_id, token_number, priority_level, status, ... }
```

### Reallocate Token
```
POST /tokens/:id/reallocate
Body: { newSlotId: int }
Response: { id, patient_id, slot_id, token_number, priority_level, status, ... }
```

### Emergency Insertion
```
POST /tokens/emergency
Body: { patientId: int, slotId: int }
Response: { id, patient_id, slot_id, token_number, priority_level, status, ... }
Description: Bumps lowest priority token if slot is full
```

### Cancel Token
```
PATCH /tokens/:id/cancel
Body: { reason?: string }
Response: { id, patient_id, slot_id, token_number, status, ... }

## Realtime Events (Socket.IO)

The server emits Socket.IO events to notify connected clients of token/queue changes. Connect a client to `http://localhost:3001` using the Socket.IO client and subscribe to events below:

- `token:allocated` — payload: `{ token, slotId }` — emitted after successful allocation
- `token:reallocated` — payload: `{ token, fromSlotId, toSlotId }` — emitted after reallocation
- `token:cancelled` — payload: `{ token, slotId }` — emitted after cancellation

## Postman

- A Postman collection is available at `postman/opd-token.postman_collection.json`. Import it and set `{{api}}` to `http://localhost:3001/api`.
```

## Priority System

Patients are prioritized in this order:

1. **Emergency** (Priority Level: 1) - Highest
2. **Paid Priority** (Priority Level: 2)
3. **Follow-up** (Priority Level: 3)
4. **Online Bookings & Walk-ins** (Priority Level: 4) - Lowest

## Edge Cases Handled

### Overbooked Slots
When a slot reaches capacity:
- Emergency insertions bump the lowest priority token
- Bumped token is reallocated to the next available slot

### Cancellations
- Freed capacity is returned to the slot
- Cancellation is logged with reason

### No-Shows
- Use `/tokens/:id/cancel` endpoint
- System automatically adjusts capacity

### Doctor Unavailability
- Update doctor status to 'unavailable'
- New bookings cannot use unavailable doctor's slots
- Existing tokens remain allocated

## Health Check of server

```
GET /health
Response: { status: 'ok' }
```
## end of document 

## Made By: 
Mohd Arish Khan | Full stack Developer | write.to.arishkhan@gmail.com

Resume link = https://drive.google.com/file/d/1ajo90YHjkVT3dX5UjmhTlqfdfEpshYzl/view

Github link = https://github.com/MohdArishkhan
