const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { User, Family, Medicine, AlternateMed, PrescribedMed, DoseLog, Reminder, Appointment, Test, Symptom, Report, WeeklyReport } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json());

// ============================================================
// DATABASE CONNECTION
// ============================================================
const MONGO_URI = 'mongodb://127.0.0.1:27017/health_management_mern';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB successfully connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ============================================================
// FEATURE 1: AUTHENTICATION (Signup & Login)
// ============================================================

// POST /api/signup — Create a new user account
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });

    const newUser = new User({ name, email, password });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully', user: { id: newUser._id, name: newUser.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/login — Verify credentials and log the user in
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    res.json({ message: 'Login successful', user: { id: user._id, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FEATURE 2: MEDICINE MANAGEMENT (Add & Remove)
// ============================================================

// GET /api/medicines/:userId — Fetch all active medicines for a user
app.get('/api/medicines/:userId', async (req, res) => {
  try {
    const medicines = await PrescribedMed.find({ userId: req.params.userId, active: true }).populate('medicineId');
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/medicines — Add a new medicine + create reminders for each scheduled time
app.post('/api/medicines', async (req, res) => {
  try {
    const { name, dose, frequency, scheduledTimes, total_quantity, refillAlertAt, userId } = req.body;

    // Step 1: Create the Medicine entry in the database
    const newMedicine = new Medicine({ name, description: 'User added' });
    const savedMed = await newMedicine.save();

    // Step 2: Link the medicine to the user via PrescribedMed
    const newPrescription = new PrescribedMed({
      userId,
      medicineId: savedMed._id,
      dose,
      frequency,
      totalQuantity: parseInt(total_quantity),
      remainingQuantity: parseInt(total_quantity),
      refillAlertAt: refillAlertAt ? parseInt(refillAlertAt) : 5 // Default threshold: 5 pills
    });
    const savedPrescription = await newPrescription.save();

    // Step 3: Create one Reminder per scheduled time (e.g., 2 reminders for Twice a day)
    if (scheduledTimes && Array.isArray(scheduledTimes)) {
      const reminderPromises = scheduledTimes.map(time => {
        if (!time) return Promise.resolve();
        const newReminder = new Reminder({
          prescriptionId: savedPrescription._id,
          timeToTake: time
        });
        return newReminder.save();
      });
      await Promise.all(reminderPromises);
    }

    res.status(201).json({ message: 'Medicine added!', prescription: savedPrescription });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/medicines/:id — Remove a medicine prescription
app.delete('/api/medicines/:id', async (req, res) => {
  try {
    await PrescribedMed.findByIdAndDelete(req.params.id);
    res.json({ message: 'Medicine removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FEATURE 3: DOSE REMINDER (Schedule & Mark as Taken)
// ============================================================

// GET /api/schedule/:userId — Fetch today's reminder schedule for a user
app.get('/api/schedule/:userId', async (req, res) => {
  try {
    // Get all active prescriptions for this user
    const prescriptions = await PrescribedMed.find({ userId: req.params.userId, active: true }).populate('medicineId');
    const prescriptionIds = prescriptions.map(p => p._id);

    // Get all reminders linked to those prescriptions
    const reminders = await Reminder.find({ prescriptionId: { $in: prescriptionIds }, isActive: true }).populate({
      path: 'prescriptionId',
      populate: { path: 'medicineId' }
    });
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/doselogs — Log a dose and determine if it was Taken, Early, or Late
app.post('/api/doselogs', async (req, res) => {
  try {
    const { prescriptionId, scheduledTime, timeTaken } = req.body;

    // Compare the scheduled time vs the actual time taken
    const schedDate = new Date(`1970/01/01 ${scheduledTime}`);
    const takenDate = new Date(`1970/01/01 ${timeTaken}`);
    const diffHours = (takenDate - schedDate) / (1000 * 60 * 60);

    // Determine status based on the time difference
    let status = 'Taken';
    if (diffHours >= 1) {
      status = 'Late';    // Taken 1+ hour AFTER the scheduled time
    } else if (diffHours <= -1) {
      status = 'Early';   // Taken 1+ hour BEFORE the scheduled time
    }

    // Save the dose log record
    const newLog = new DoseLog({
      prescriptionId,
      dateTaken: new Date(),
      timeTaken,
      scheduledTime,
      status
    });
    await newLog.save();

    // Reduce the remaining pill count by 1
    await PrescribedMed.findByIdAndUpdate(prescriptionId, { $inc: { remainingQuantity: -1 } });

    res.status(201).json({ message: `Dose logged as ${status}`, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// FEATURE 4: REFILL ALERTS
// ============================================================

// GET /api/refill-alerts/:userId — Returns medicines that are below their refill threshold
app.get('/api/refill-alerts/:userId', async (req, res) => {
  try {
    const medicines = await PrescribedMed.find({ userId: req.params.userId, active: true }).populate('medicineId');

    // Filter: only return medicines where remaining stock is at or below the alert threshold
    const lowStockMeds = medicines.filter(med => med.remainingQuantity <= (med.refillAlertAt || 5));

    res.json(lowStockMeds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// FEATURE 5: SYMPTOM CHECKER
// ============================================================

// Rule-based diagnosis engine
const diagnosisRules = [
  {
    name: 'Dengue Fever',
    symptoms: ['Fever', 'Headache', 'Joint pain', 'Muscle aches', 'Fatigue'],
    minMatch: 4,
    severity: 'Severe',
    feedback: 'Your combination of symptoms strongly suggests Dengue Fever. This is a serious condition. Please visit a doctor immediately and request a blood platelet count test.'
  },
  {
    name: 'Hypertensive Episode',
    symptoms: ['Headache', 'Blurred vision', 'Dizziness'],
    minMatch: 3,
    severity: 'Severe',
    feedback: 'Headache with Blurred Vision and Dizziness together may indicate a hypertensive episode or a neurological concern. Seek medical attention immediately.'
  },
  {
    name: 'Influenza (Flu)',
    symptoms: ['Fever', 'Fatigue', 'Headache', 'Muscle aches'],
    minMatch: 3,
    severity: 'Moderate',
    feedback: 'Your symptoms are consistent with Influenza (Flu). Rest, stay hydrated, and consider antiviral medication. See a doctor if your fever exceeds 39°C or lasts more than 3 days.'
  },
  {
    name: 'Migraine',
    symptoms: ['Headache', 'Nausea', 'Blurred vision', 'Dizziness'],
    minMatch: 3,
    severity: 'Moderate',
    feedback: 'Your symptoms suggest a Migraine episode. Rest in a dark, quiet room and avoid screens. If migraines are recurring, consult a neurologist.'
  },
  {
    name: 'Arthritis / Rheumatic Condition',
    symptoms: ['Joint pain', 'Muscle aches', 'Fatigue'],
    minMatch: 3,
    severity: 'Moderate',
    feedback: 'Your symptoms may indicate an arthritic or rheumatic condition. Consult a rheumatologist for a proper diagnosis and consider anti-inflammatory medication.'
  },
  {
    name: 'Gastroenteritis (Stomach Flu)',
    symptoms: ['Nausea', 'Diarrhea', 'Fever', 'Fatigue'],
    minMatch: 2,
    severity: 'Mild',
    feedback: 'Your symptoms indicate Gastroenteritis (stomach flu). Stay well-hydrated with water and oral rehydration salts. Eat light, bland foods and rest.'
  },
  {
    name: 'Dehydration',
    symptoms: ['Dizziness', 'Headache', 'Fatigue', 'Nausea'],
    minMatch: 3,
    severity: 'Mild',
    feedback: 'Your symptoms may be caused by dehydration. Drink plenty of water and electrolyte-rich fluids immediately. Avoid caffeine and alcohol.'
  },
  {
    name: 'General Viral Infection',
    symptoms: ['Fever', 'Fatigue', 'Muscle aches', 'Headache'],
    minMatch: 2,
    severity: 'Mild',
    feedback: 'Your symptoms suggest a general viral infection. Rest, drink plenty of fluids, and monitor your temperature. See a doctor if the fever persists beyond 3 days.'
  }
];

// POST /api/symptoms/check — Analyze selected symptoms and return possible conditions
app.post('/api/symptoms/check', async (req, res) => {
  try {
    const { userId, selectedSymptoms } = req.body;

    if (!selectedSymptoms || selectedSymptoms.length === 0) {
      return res.status(400).json({ error: 'Please select at least one symptom.' });
    }

    // Score each rule by how many of the user's symptoms match
    const results = diagnosisRules
      .map(rule => {
        const matchedSymptoms = rule.symptoms.filter(s => selectedSymptoms.includes(s));
        return { ...rule, matchCount: matchedSymptoms.length, matchedSymptoms };
      })
      .filter(rule => rule.matchCount >= rule.minMatch) // Only include rules with enough matches
      .sort((a, b) => b.matchCount - a.matchCount);    // Best matches first

    // Determine overall severity (worst case wins)
    let overallSeverity = 'Mild';
    if (results.some(r => r.severity === 'Severe')) overallSeverity = 'Severe';
    else if (results.some(r => r.severity === 'Moderate')) overallSeverity = 'Moderate';

    // Save the symptom log to the database
    if (userId) {
      const newSymptom = new Symptom({
        userId,
        date: new Date(),
        symptomName: selectedSymptoms.join(', '),
        severity: overallSeverity,
        notes: results.length > 0 ? results.map(r => r.name).join(', ') : 'No specific condition identified'
      });
      await newSymptom.save();
    }

    res.json({
      selectedSymptoms,
      overallSeverity,
      conditions: results.length > 0 ? results : null,
      message: results.length === 0
        ? 'No specific condition identified based on your symptoms. Monitor your health and consult a doctor if symptoms worsen.'
        : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FEATURE 6: WEEKLY REPORT
// ============================================================

// POST /api/weekly-report/generate
app.post('/api/weekly-report/generate', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Find all active prescriptions for the user
    const prescriptions = await PrescribedMed.find({ userId, active: true });

    // Determine the date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const generatedReports = [];

    for (const rx of prescriptions) {
      // Find all reminders for this prescription
      const reminders = await Reminder.find({ prescriptionId: rx._id, isActive: true });
      const dailyDoses = reminders.length;

      // Expected total doses for 7 days
      const totalDose = dailyDoses * 7;

      // If there are no reminders, we can't calculate adherence properly, skip
      if (totalDose === 0) continue;

      // Find DoseLogs for this prescription in the last 7 days
      const doseLogs = await DoseLog.find({
        prescriptionId: rx._id,
        dateTaken: { $gte: startDate, $lte: endDate }
      });

      // Calculate doses taken
      const doseTaken = doseLogs.filter(log => ['Taken', 'Early', 'Late'].includes(log.status)).length;

      // Calculate doses missed
      const doseMissed = Math.max(0, totalDose - doseTaken); // Ensure it doesn't go below 0

      // Calculate success rate
      const successRate = (doseTaken / totalDose) * 100;

      // Fetch last week's rate from the most recent WeeklyReport for this prescription
      const lastReport = await WeeklyReport.findOne({ prescriptionId: rx._id })
        .sort({ reportDate: -1 }); // Get the latest one

      const lastWeeksRate = lastReport ? lastReport.successRate : null;

      // Create new WeeklyReport
      const newReport = new WeeklyReport({
        userId,
        prescriptionId: rx._id,
        totalDose,
        doseTaken,
        doseMissed,
        medicineStart: rx.startDate,
        medicineEnd: rx.endDate,
        successRate,
        lastWeeksRate
      });

      await newReport.save();
      generatedReports.push(newReport);
    }

    res.status(201).json({ message: 'Weekly reports generated successfully', reports: generatedReports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
