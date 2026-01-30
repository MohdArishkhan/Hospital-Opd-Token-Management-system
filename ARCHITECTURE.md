# OPD Token Allocation Engine - Architecture

## System Design

### Core Concepts

**Token**: Digital queue position assigned to a patient for a specific doctor's slot.

**Slot**: Fixed time window (e.g., 9:00-10:00) with maximum patient capacity per doctor.

**Priority**: Ranking system determining queue order when capacity is exceeded.

## Database Schema

### Tables

**doctors**
- id (PK)
- name
- specialty
- status (available | unavailable)
- created_at

**slots**
- id (PK)
- doctor_id (FK)
- start_time
- end_time
- max_capacity
- current_capacity (tracks occupancy)
- status (open | closed)
- created_at
- UNIQUE(doctor_id, start_time)

**patients**
- id (PK)
- name
- phone (UNIQUE)
- patient_type (emergency | paid | followup | online)
- created_at

**tokens**
- id (PK)
- patient_id (FK)
- slot_id (FK)
- token_number (position in queue)
- priority_level (1-4)
- status (allocated | cancelled)
- created_at
- updated_at
- UNIQUE(slot_id, token_number)

**cancellations**
- id (PK)
- token_id (FK)
- reason
- cancelled_at

### Indexes
- tokens(slot_id, patient_id)
- slots(doctor_id)
- patients(patient_type)

## Token Allocation Algorithm

### Priority Map
```
Emergency:  Level 1 (Highest)
Paid:       Level 2
Follow-up:  Level 3
Online:     Level 4 (Lowest)
```

### Allocation Flow

1. **Check Slot Availability**
   - Validate slot exists and is open
   - Verify current_capacity < max_capacity

2. **Assign Token Number**
   - Token number = current_capacity + 1
   - Ensures sequential queue position

3. **Store Priority Level**
   - Assign priority based on patient_type
   - Used for sorting when retrieving queue

4. **Update Capacity**
   - Increment slot.current_capacity

### Dynamic Reallocation

**Scenario**: Emergency patient arrives at full slot

**Algorithm**:
1. Check if slot has capacity → Allocate directly
2. If full:
   - Find token with LOWEST priority_level (highest number)
   - Among tied priorities, select OLDEST token (created_at DESC)
   - Find next available slot (same doctor, later time, has capacity)
   - Reallocate bumped token to new slot
   - Allocate emergency to freed position (position = bumped token_number)

**Code Location**: `services/tokenService.js` → `insertEmergency()`

### Cancellation Handling

1. Update token status to 'cancelled'
2. Log cancellation with reason
3. Decrement slot.current_capacity
4. Slot becomes available for other patients

## Realtime / Live Updates (Socket.IO)

This system supports real-time push updates via Socket.IO (added to the Express server).

- Purpose: push token/queue changes to connected clients (doctor consoles, patient displays, receptionist panels).
- Events emitted by server:
   - `token:allocated` — emitted after a successful allocation; payload: `{ token, slotId }`.
   - `token:reallocated` — after moving a token between slots; payload: `{ token, fromSlotId, toSlotId }`.
   - `token:cancelled` — after cancellation; payload: `{ token, slotId }`.

## Implementation Details:
   - Socket server initialized in `server/socket.js` and started from `server/index.js`.
   - `tokenService.js` emits events after DB updates.
   Future Enhancements:
   - For reliability: implement acknowledgment from clients to ensure they received updates.
   - For scale: use a message broker (Redis pub/sub) to propagate socket events across multiple Node instances and keep clients in rooms by `slotId` to minimize traffic.

   ## Future Scalability

   Below are recommended strategies to scale each layer of the system as load grows.

   - **Frontend / Edge**: Move static assets to a CDN; use server-side rendering or edge functions (Next.js Edge) for low-latency pages. Cache public pages at the edge.
   - **API / Application Layer**: Keep app instances stateless; deploy behind a load balancer and autoscale based on request/CPU. Use health checks and graceful shutdown to drain connections.
   - **WebSocket / Realtime**: Replace in-process Socket.IO state with a distributed pub/sub (Redis, Kafka, or managed pub/sub) so multiple app instances can share events. Consider a dedicated WebSocket gateway or managed service for global scale.
   - **Database (Postgres / Neon)**: Add read replicas for analytics and read-heavy workloads. For write scaling, consider partitioning hot tables, logical sharding, or moving extremely hot data (caches, sessions) to Redis. Ensure connection pooling (PgBouncer) and tune max connections.
   - **Indexing & Query Optimization**: Monitor slow queries, add targeted indexes, and archive old records to keep active tables compact.
   - **Background Jobs & Workers**: Offload reallocation, notification, and heavy workflows to a job queue (BullMQ/RabbitMQ). Autoscale workers separately from HTTP instances.
   - **Caching Layer**: Use Redis for frequently-read data (slot summaries, token counts) and for distributed locks when handling concurrent allocations to prevent race conditions.
   - **Storage & CDN**: Serve large or versioned assets via object storage + CDN; keep application origin for dynamic data only.
   - **Service Decomposition**: Evolve to a modular microservices architecture if team and ops readiness allow—split heavy domains (token allocator, notification, analytics) to scale independently.
   - **Observability & SLOs**: Add metrics (Prometheus), traces (OpenTelemetry), and structured logs to an aggregation service. Define SLOs and alerting thresholds for latency, error rates, and queue growth.
   - **Deployment & Infra**: Use containers and orchestration (Kubernetes) or managed server groups; express resource requests/limits and leverage horizontal pod autoscaling. Keep deployments reproducible with IaC (Terraform).
   - **Testing & Release Strategy**: Implement integration tests for allocation logic, canary deployments for risky changes, and automated performance tests that simulate peak OPD day loads.
   - **Global / Multi-region**: For multi-region, prefer read replicas and geo-routing; handle cross-region consistency carefully (eventual consistency or user session affinity) and use multi-region queues or brokerage.
   - **Operational Controls**: Add API rate-limits, throttling, circuit breakers, and graceful degradation modes (read-only or reduced features) for overload events.

   ### Recommended Migration Path (priority)
   1. Add Redis for caching and distributed pub/sub (low friction, immediate benefit).
   2. Add a job queue and move non-critical tasks to workers.
   3. Introduce read replicas and connection pooling (PgBouncer).
   4. Containerize and enable autoscaling with health checks.
   5. Move to multi-region and adopt managed WebSocket gateways if global presence required.



## Failure Handling

### Data Integrity

**Problem**: Request fails mid-transaction (e.g., network timeout)

**Solutions**:
- Database constraints (UNIQUE, FK) prevent orphaned records
- Indexing ensures query performance
- Reallocation happens atomically (all updates succeed or all fail)

**Example**: If reallocation fails after bumping token:
- Bumped token still exists in old slot
- Emergency token never created
- System remains consistent

### Doctor Unavailability

1. Update doctor.status = 'unavailable'
2. New bookings check doctor.status before allocation
3. Existing tokens remain in slots (no cascade delete)
4. Once available again, doctor can accept new bookings

### Slot Overflow Prevention

**Database Constraint**: 
```sql
CHECK (current_capacity <= max_capacity)
```

Prevents data corruption if logic error occurs.

## Service Layer

### doctorService.js
- createDoctor()
- getDoctor()
- getDoctorSlots()
- updateDoctorStatus()

### slotService.js
- createSlot()
- getSlot()
- updateSlotStatus()
- getAvailableSlots()
- closeSlot()

### patientService.js
- createPatient()
- getPatient()
- getPatientByPhone()
- getPatientTokens()

### tokenService.js (Core Logic)
- allocateToken() - Standard allocation
- reallocateToken() - Move token to different slot
- insertEmergency() - Emergency with bumping
- cancelToken() - Cancellation with cleanup
- getSlotQueue() - Retrieve sorted queue

## SOLID Principles Applied

**Single Responsibility**
- Each service handles one domain (doctors, slots, patients, tokens)
- Database queries isolated in db.js

**Open/Closed**
- Services are extensible (add new patient types without changing allocation logic)

**Liskov Substitution**
- All services follow same interface pattern

**Interface Segregation**
- Routes only call necessary service methods

**Dependency Inversion**
- High-level modules (routes) depend on abstractions (services)
- Services depend on database layer (db.js)

## Queue Ordering

When retrieving `getSlotQueue()`:
```sql
ORDER BY priority_level ASC, token_number ASC
```

This ensures:
- Emergency (level 1) appears first
- Within same priority, earliest allocated token appears first

## Documentation Checklist

- **Prioritization logic**: See "Token Allocation Algorithm" → "Priority Map" and "Queue Ordering" for full rules and examples.
- **Edge cases**: See the "Edge Cases" section below for explicit handling of full slots, simultaneous emergencies, cancellations, and doctor unavailability.
- **Failure handling**: See the "Failure Handling" section for transactional and constraint-based safeguards.
- **Simulation**: A reproducible simulation of one OPD day with at least 3 doctors is available in `/scripts/simulate.js` (run instructions below).

## Edge Cases

- **Full slot with emergency arrival**: Implemented via bumping the lowest-priority token (see "Dynamic Reallocation"). Use DB transactions and row-level locking to avoid race conditions.
- **Simultaneous emergencies**: Ensure allocations and reallocation run inside transactions; adopt optimistic/pessimistic locking (e.g., `SELECT ... FOR UPDATE`) or a job queue to serialize competing high-priority inserts.
- **Concurrent cancellations and allocations**: Handle with transactions and re-checks of `current_capacity` before commit; cancelled token numbers may create gaps but ordering is by priority then token_number.
- **Doctor becomes unavailable mid-day**: Mark `doctor.status = 'unavailable'`; existing tokens are preserved. Optionally provide automatic reallocation to other doctors of the same specialty (configurable policy).
- **Database constraint violations (unique, fk, capacity checks)**: Failures should roll back the transaction and surface a clear error for operator action; consider alerting/logging.
- **Slot overlap or duplicate slot creation**: Validation on slot creation prevents overlapping slots for the same doctor; rely on UNIQUE constraints and application-level checks.
- **Network/socket delivery failures**: Emit events but persist important state changes first; add retry and acknowledgement mechanisms for critical notifications.

## Simulation

See `/scripts/simulate.js` for full day simulation demonstrating:
- Initial token allocation
- Emergency insertion with bumping
- Cancellation handling
- Queue reordering

Simulation details:
- Scenario: a single OPD day involving at least 3 doctors with multiple slots each.
- Purpose: demonstrate allocation under normal load, emergency insertions (bumping), concurrent cancellations, and reallocation across slots.
- How to run: `npm run simulate` (ensure `DATABASE_URL` is set).

## Made By: 
Mohd Arish Khan | Full stack Developer | write.to.arishkhan@gmail.com

Resume link = https://drive.google.com/file/d/1ajo90YHjkVT3dX5UjmhTlqfdfEpshYzl/view

Github link = https://github.com/MohdArishkhan
