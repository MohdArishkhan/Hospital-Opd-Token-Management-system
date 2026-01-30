import express from 'express';
import * as doctorService from '../services/doctorService.js';
import * as slotService from '../services/slotService.js';
import * as patientService from '../services/patientService.js';
import * as tokenService from '../services/tokenService.js';

const router = express.Router();


// I could have seprated routes according to domain but due to small
//project size keeping all in one file for simplicity

// Doctor endpoints
router.post('/doctors', async (req, res) => {
  try {
    const { name, specialty } = req.body;
    const doctor = await doctorService.createDoctor(name, specialty);
    res.status(201).json(doctor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/doctors/:id', async (req, res) => {
  try {
    const doctor = await doctorService.getDoctor(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/doctors/:id/slots', async (req, res) => {
  try {
    const slots = await doctorService.getDoctorSlots(req.params.id);
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/doctors/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const doctor = await doctorService.updateDoctorStatus(req.params.id, status);
    res.json(doctor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Slot endpoints
router.post('/slots', async (req, res) => {
  try {
    const { doctorId, startTime, endTime, maxCapacity } = req.body;
    const slot = await slotService.createSlot(doctorId, startTime, endTime, maxCapacity);
    res.status(201).json(slot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/slots/:id', async (req, res) => {
  try {
    const slot = await slotService.getSlot(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/slots/:id/queue', async (req, res) => {
  try {
    const queue = await tokenService.getSlotQueue(req.params.id);
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/doctors/:id/available-slots', async (req, res) => {
  try {
    const { date } = req.query;
    const slots = await slotService.getAvailableSlots(req.params.id, date);
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/slots/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const slot = await slotService.updateSlotStatus(req.params.id, status);
    res.json(slot);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Patient endpoints
router.post('/patients', async (req, res) => {
  try {
    const { name, phone, patientType } = req.body;
    const patient = await patientService.createPatient(name, phone, patientType);
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/patients/:id', async (req, res) => {
  try {
    const patient = await patientService.getPatient(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/patients/:id/tokens', async (req, res) => {
  try {
    const tokens = await patientService.getPatientTokens(req.params.id);
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Token endpoints
router.post('/tokens', async (req, res) => {
  try {
    const { patientId, slotId, patientType } = req.body;
    const token = await tokenService.allocateToken(patientId, slotId, patientType);
    res.status(201).json(token);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/tokens/:id/reallocate', async (req, res) => {
  try {
    const { newSlotId } = req.body;
    const token = await tokenService.reallocateToken(req.params.id, newSlotId);
    res.json(token);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/tokens/emergency', async (req, res) => {
  try {
    const { patientId, slotId } = req.body;
    const token = await tokenService.insertEmergency(patientId, slotId);
    res.status(201).json(token);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/tokens/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const token = await tokenService.cancelToken(req.params.id, reason);
    res.json(token);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
