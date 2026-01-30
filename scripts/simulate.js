//its important to import dotenv/config at the very top 
//otherwise it will not load env variables in project.
import 'dotenv/config';
import { query, queryOne } from '../server/db.js';
import * as doctorService from '../server/services/doctorService.js';
import * as slotService from '../server/services/slotService.js';
import * as patientService from '../server/services/patientService.js';
import * as tokenService from '../server/services/tokenService.js';

async function simulate() {
  console.log('\n=== OPD Token Allocation Engine Simulation ===\n');

  try {
    // WARNING THIS WILL DELETE EXISTING DATA
    // Its your choice if you dont want to remove existing data.. if yes then 
    //Uncomment these 5 lines below..
    // await query('DELETE FROM cancellations');
    // await query('DELETE FROM tokens');
    // await query('DELETE FROM slots');
    // await query('DELETE FROM patients');
    // await query('DELETE FROM doctors');

    // Create 3 doctors
    const doc1 = await doctorService.createDoctor('Dr. Sharma', 'General');
    const doc2 = await doctorService.createDoctor('Dr. Patel', 'Cardiology');
    const doc3 = await doctorService.createDoctor('Dr. Singh', 'Orthopedics');
    console.log('Created 3 doctors\n');

    // Create slots for today (9 AM - 12 PM)
    const today = new Date().toISOString().split('T')[0];
    const slot1_1 = await slotService.createSlot(doc1.id, `${today}T09:00:00Z`, `${today}T10:00:00Z`, 3);
    const slot1_2 = await slotService.createSlot(doc1.id, `${today}T10:00:00Z`, `${today}T11:00:00Z`, 3);
    const slot2_1 = await slotService.createSlot(doc2.id, `${today}T09:00:00Z`, `${today}T10:00:00Z`, 4);
    const slot3_1 = await slotService.createSlot(doc3.id, `${today}T11:00:00Z`, `${today}T12:00:00Z`, 3);
    console.log('Created slots\n');

    // Create patients
    const p1 = await patientService.createPatient('Rajesh Kumar', '9001001000', 'online');
    const p2 = await patientService.createPatient('Priya Singh', '9001001001', 'followup');
    const p3 = await patientService.createPatient('Amit Verma', '9001001002', 'paid');
    const p4 = await patientService.createPatient('Neha Chopra', '9001001003', 'online');
    const p5 = await patientService.createPatient('Emergency Patient', '9001001004', 'emergency');
    console.log('Created 5 patients\n');

    // Allocate initial tokens
    console.log('--- Initial Allocation ---');
    const t1 = await tokenService.allocateToken(p1.id, slot1_1.id, 'online');
    console.log(`Token ${t1.token_number} allocated to ${p1.name} (${p1.patient_type})`);

    const t2 = await tokenService.allocateToken(p2.id, slot1_1.id, 'followup');
    console.log(`Token ${t2.token_number} allocated to ${p2.name} (${p2.patient_type})`);

    const t3 = await tokenService.allocateToken(p3.id, slot1_1.id, 'paid');
    console.log(`Token ${t3.token_number} allocated to ${p3.name} (${p3.patient_type})`);

    const t4 = await tokenService.allocateToken(p4.id, slot1_2.id, 'online');
    console.log(`Token ${t4.token_number} allocated to ${p4.name} (${p4.patient_type})`);

    // Show queue before emergency
    console.log('\n--- Queue Status (Slot 1) ---');
    let queue = await tokenService.getSlotQueue(slot1_1.id);
    queue.forEach(t => {
      console.log(`Position ${t.token_number}: ${t.name} (${t.patient_type}, Priority: ${t.priority_level})`);
    });

    // Emergency insertion - bumps lowest priority
    console.log('\n--- Emergency Insertion ---');
    console.log('Emergency patient arrives! Inserting into full slot...');
    const emergency = await tokenService.insertEmergency(p5.id, slot1_1.id);
    console.log(`Emergency patient allocated to token ${emergency.token_number}`);
    console.log(`Patient ${p4.name} bumped to next available slot\n`);

    // Show queue after emergency
    console.log('--- Queue Status After Emergency (Slot 1) ---');
    queue = await tokenService.getSlotQueue(slot1_1.id);
    queue.forEach(t => {
      console.log(`Position ${t.token_number}: ${t.name} (${t.patient_type}, Priority: ${t.priority_level})`);
    });

    // Cancellation handling
    console.log('\n--- Cancellation Handling ---');
    console.log(`Cancelling token ${t2.id}...`);
    await tokenService.cancelToken(t2.id, 'Patient rescheduled');
    console.log('Token cancelled, slot capacity freed\n');

    // Show final queue
    console.log('--- Final Queue Status (Slot 1) ---');
    queue = await tokenService.getSlotQueue(slot1_1.id);
    queue.forEach(t => {
      console.log(`Position ${t.token_number}: ${t.name} (${t.patient_type}, Priority: ${t.priority_level})`);
    });

    const slot1Status = await slotService.getSlot(slot1_1.id);
    console.log(`\nSlot Capacity: ${slot1Status.current_capacity}/${slot1Status.max_capacity}`);

    console.log('\nSimulation completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('Simulation failed:', error.message);
    process.exit(1);
  }
}

simulate();
