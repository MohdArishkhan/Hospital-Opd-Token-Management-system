# OPD Token Allocation Engine

Production-ready Node.js backend for hospital Out-Patient Department (OPD) token allocation with PostgreSQL (Neon).

## Features

- **Priority-Based Queue**: Emergency → Paid → Follow-up → Online
- **Dynamic Reallocation**: Automatic bumping of lowest priority when capacity exceeded
- **Edge Case Handling**: Cancellations, no-shows, emergency insertions
- **Data Integrity**: Database constraints prevent corruption
- **SOLID Architecture**: Clean, maintainable, extensible code

## Quick Start

### 1. Setup Environment
```bash
# Copy environment template
cp .env.example .env

# Add your Neon PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3001
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Migrations
```bash
npm run migrate
```

### 4. Start Server
```bash
npm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### Doctors
- `POST /api/doctors` - Create doctor
- `GET /api/doctors/:id` - Get doctor
- `GET /api/doctors/:id/slots` - List doctor's slots
- `PATCH /api/doctors/:id/status` - Update status
- `GET /api/doctors/:id/available-slots?date=YYYY-MM-DD` - Available slots

### Slots
- `POST /api/slots` - Create slot
- `GET /api/slots/:id` - Get slot
- `GET /api/slots/:id/queue` - View queue
- `PATCH /api/slots/:id/status` - Update status

### Patients
- `POST /api/patients` - Register patient
- `GET /api/patients/:id` - Get patient
- `GET /api/patients/:id/tokens` - Patient's tokens

### Tokens
- `POST /api/tokens` - Allocate token
- `POST /api/tokens/:id/reallocate` - Move to different slot
- `POST /api/tokens/emergency` - Emergency insertion (bumps lowest priority)
- `PATCH /api/tokens/:id/cancel` - Cancel token

See [API_DOCS.md](./API_DOCS.md) for detailed endpoint documentation.

## Example Usage

### Create Doctor & Slots
```bash
# Create doctor
curl -X POST http://localhost:3001/api/doctors \
  -H "Content-Type: application/json" \
  -d '{"name": "Dr. Sharma", "specialty": "General"}'

# Create slot
curl -X POST http://localhost:3001/api/slots \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": 1,
    "startTime": "2024-01-30T09:00:00Z",
    "endTime": "2024-01-30T10:00:00Z",
    "maxCapacity": 3
  }'
```

### Register Patient & Allocate Token
```bash
# Register patient
curl -X POST http://localhost:3001/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rajesh Kumar",
    "phone": "9001001000",
    "patientType": "online"
  }'

# Allocate token
curl -X POST http://localhost:3001/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "slotId": 1,
    "patientType": "online"
  }'
```

### Emergency Insertion
```bash
# Insert emergency (bumps lowest priority)
curl -X POST http://localhost:3001/api/tokens/emergency \
  -H "Content-Type: application/json" \
  -d '{"patientId": 2, "slotId": 1}'
```

### View Queue
```bash
curl http://localhost:3001/api/slots/1/queue
```

## Realtime (Socket.IO)

- The server exposes a Socket.IO endpoint on the same origin/port as the HTTP server.
- Events emitted by the server (clients should listen):
  - `token:allocated` — payload: `{ token, slotId }`
  - `token:reallocated` — payload: `{ token, fromSlotId, toSlotId }`
  - `token:cancelled` — payload: `{ token, slotId }`

Client example (browser):
```html
<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io('http://localhost:3001');
  socket.on('token:allocated', data => console.log('allocated', data));
  socket.on('token:reallocated', data => console.log('reallocated', data));
  socket.on('token:cancelled', data => console.log('cancelled', data));
</script>
```




## Running Simulation

Simulates a full OPD day with 3 doctors, 5 patients, emergency insertion, and cancellations:

```bash
npm run simulate
```

Expected output demonstrates:
- Token allocation with priority ordering
- Emergency patient bumping lower priority patient
- Queue reordering after emergency
- Cancellation and capacity management

## Project Structure

```
├── server/
│   ├── index.js              # Express server setup
│   ├── db.js                 # Database queries
│   ├── routes.js             # API route handlers
│   └── services/
│       ├── doctorService.js
│       ├── slotService.js
│       ├── patientService.js
│       └── tokenService.js   # Core allocation logic
├── scripts/
│   ├── migrate.js            # Database schema
│   └── simulate.js           # OPD day simulation
├── API_DOCS.md               # Endpoint documentation
├── ARCHITECTURE.md           # System design details
└── README.md                 # This file
```

## Database Schema

- **doctors**: Doctor profiles and availability
- **slots**: Time slots with capacity tracking
- **patients**: Patient registry with type classification
- **tokens**: Queue positions with priority levels
- **cancellations**: Cancellation audit log

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed schema.

## Token Priority System

1. **Emergency** (Priority 1) - Highest
2. **Paid Priority** (Priority 2)
3. **Follow-up** (Priority 3)
4. **Online/Walk-ins** (Priority 4) - Lowest

When slot capacity is exceeded, lowest priority (highest number) token is automatically bumped to next available slot.

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

## Performance

- Database indexes on frequently queried fields
- Efficient queue retrieval with indexed lookups
- Transaction safety with database constraints
- Connection pooling via Neon serverless

## Error Handling

All endpoints return meaningful error messages:
```json
{ "error": "Slot is at full capacity" }
```

Invalid patient types, missing slots, and duplicate phone numbers are caught and reported.


## Postman

- Import the collection file at `postman/opd-token.postman_collection.json`.
- Set collection variable `api` to `http://localhost:3001/api` and run requests.

## Environment Variables


```
For database i have used PostgreSQL database from neon.
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3001
```

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **Client**: @neondatabase/serverless

## Code Quality

- Minimal, clean code with no unnecessary lines
- SOLID principles throughout
- Single responsibility per service
- Comprehensive error handling
- Clear naming conventions

---

Built as a production-ready system with clean architecture and comprehensive error handling.

## Made By: 

Mohd Arish Khan | Full stack Developer | write.to.arishkhan@gmail.com

Resume link = https://drive.google.com/file/d/1ajo90YHjkVT3dX5UjmhTlqfdfEpshYzl/view

Github link = https://github.com/MohdArishkhan
