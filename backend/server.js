const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { User, Family, Medicine, AlternateMed, PrescribedMed, DoseLog, Reminder, Appointment, Test, Symptom, Report } = require('./models');

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

//Create new user 
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

// Verify and login user
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

// Fetch all active medicines 
app.get('/api/medicines/:userId', async (req, res) => {
  try {
    const medicines = await PrescribedMed.find({ userId: req.params.userId, active: true }).populate('medicineId');
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new medicine + create reminders 
app.post('/api/medicines', async (req, res) => {
  try {
    const { name, dose, frequency, scheduledTimes, total_quantity, refillAlertAt, userId } = req.body;


    const newMedicine = new Medicine({ name, description: 'User added' });
    const savedMed = await newMedicine.save();


    const newPrescription = new PrescribedMed({
      userId,
      medicineId: savedMed._id,
      dose,
      frequency,
      totalQuantity: parseInt(total_quantity),
      remainingQuantity: parseInt(total_quantity),
      refillAlertAt: refillAlertAt ? parseInt(refillAlertAt) : null
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

// Today's reminder schedule 
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

// Taken, Early, or Late
app.post('/api/doselogs', async (req, res) => {
  try {
    const { prescriptionId, scheduledTime, timeTaken } = req.body;

    // Scheduled time vs the actual time compare
    const schedDate = new Date(`1970/01/01 ${scheduledTime}`);
    const takenDate = new Date(`1970/01/01 ${timeTaken}`);
    const diffHours = (takenDate - schedDate) / (1000 * 60 * 60);

    // Status based on the time diff
    let status = 'Taken';
    if (diffHours >= 1) {
      status = 'Late';
    } else if (diffHours <= -1) {
      status = 'Early';
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

    // Pill count -1
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
    const lowStockMeds = medicines.filter(med => med.remainingQuantity <= med.refillAlertAt);

    res.json(lowStockMeds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// FEATURE 5: SYMPTOM CHECKER
// ============================================================

// Rule-based diagnosis engine
// SYMPTOM CHECKER
const diagnosisRules = [
  {
    name: 'Dengue Fever',
    symptoms: ['Fever', 'Headache', 'Joint pain', 'Muscle aches', 'Fatigue'],
    minMatch: 4,
    severity: 'Severe',
    feedback: 'Symptoms are pointing to Dengue Fever. Patient should consult a doctor as soon as possible.'
  },
  {
    name: 'Hypertensive Episode',
    symptoms: ['Headache', 'Blurred vision', 'Dizziness'],
    minMatch: 3,
    severity: 'Severe',
    feedback: 'Symptoms are pointing to Hypertensive Episode. Patient should seek medical attention immediately.'
  },
  {
    name: 'Influenza (Flu)',
    symptoms: ['Fever', 'Fatigue', 'Headache', 'Muscle aches'],
    minMatch: 3,
    severity: 'Moderate',
    feedback: 'Symptoms are pointing to Influenza (Flu). For the time being patient should take rest, stay hydrated, and consider antiviral medication. If fever exceeds 39°C or lasts more than 3 days patient should consult a doctor.'
  },
  {
    name: 'Migraine',
    symptoms: ['Headache', 'Nausea', 'Blurred vision', 'Dizziness'],
    minMatch: 3,
    severity: 'Moderate',
    feedback: 'Symptoms are pointing to a Migraine episode. Patient should rest in a dark, quiet room and avoid screens. If migraines are recurring, patient should consult a neurologist.'
  },
  {
    name: 'Arthritis / Rheumatic Condition',
    symptoms: ['Joint pain', 'Muscle aches', 'Fatigue'],
    minMatch: 3,
    severity: 'Moderate',
    feedback: 'Symptoms are pointing to an arthritic or rheumatic condition. Patient should consult a rheumatologist for a proper diagnosis.'
  },
  {
    name: 'Gastroenteritis (Stomach Flu)',
    symptoms: ['Nausea', 'Diarrhea', 'Fever', 'Fatigue'],
    minMatch: 2,
    severity: 'Mild',
    feedback: 'Symptoms are pointing to Gastroenteritis (stomach flu). Patient should stay well-hydrated with water and oral rehydration salts. Patient should eat light, bland foods and rest.'
  },
  {
    name: 'Dehydration',
    symptoms: ['Dizziness', 'Headache', 'Fatigue', 'Nausea'],
    minMatch: 3,
    severity: 'Mild',
    feedback: 'Symptoms can be caused by dehydration. Patient should drink plenty of water and electrolyte-rich fluids immediately.'
  },
  {
    name: 'General Viral Infection',
    symptoms: ['Fever', 'Fatigue', 'Muscle aches', 'Headache'],
    minMatch: 2,
    severity: 'Mild',
    feedback: 'Symptoms are pointing to a general viral infection. Patient should rest, drink plenty of fluids, and monitor temperature. See a doctor if the fever stays beyond 3 days.'
  }
];

// Analyze symp, return conditions
app.post('/api/symptoms/check', async (req, res) => {
  try {
    const { userId, selectedSymptoms } = req.body;

    if (!selectedSymptoms || selectedSymptoms.length === 0) {
      return res.status(400).json({ error: 'Please select at least one symptom.' });
    }

    const results = diagnosisRules
      .map(rule => {
        const matchedSymptoms = rule.symptoms.filter(s => selectedSymptoms.includes(s));
        return { ...rule, matchCount: matchedSymptoms.length, matchedSymptoms };
      })
      .filter(rule => rule.matchCount >= rule.minMatch)
      .sort((a, b) => b.matchCount - a.matchCount);

    // severity
    let overallSeverity = 'Mild';
    if (results.some(r => r.severity === 'Severe')) overallSeverity = 'Severe';
    else if (results.some(r => r.severity === 'Moderate')) overallSeverity = 'Moderate';

    // Save symp
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
        ? 'No specific condition identified. Please monitor your health and consult a doctor if symptoms worsen.'
        : null
    });
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
