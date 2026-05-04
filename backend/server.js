const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { User, FamilyMember, Medicine, AlternateMed, PrescribedMed, DoseLog, Reminder, Appointment, Test, Symptom, Report } = require('./models');

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
// FEATURE 1.5: FAMILY MEMBER MANAGEMENT
// ============================================================

// Get all family members for a user
app.get('/api/family/:userId', async (req, res) => {
  try {
    const members = await FamilyMember.find({ userId: req.params.userId });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new family member
app.post('/api/family', async (req, res) => {
  try {
    const { userId, name, relation } = req.body;
    const newMember = new FamilyMember({ userId, name, relation });
    await newMember.save();
    res.status(201).json(newMember);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a family member
app.delete('/api/family/:id', async (req, res) => {
  try {
    await FamilyMember.findByIdAndDelete(req.params.id);
    res.json({ message: 'Family member removed' });
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
    const medicines = await PrescribedMed.find({ userId: req.params.userId, active: true })
      .populate('medicineId')
      .populate('familyMemberId');
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new medicine + create reminders 
app.post('/api/medicines', async (req, res) => {
  try {
    const { name, dose, frequency, scheduledTimes, total_quantity, refillAlertAt, userId, familyMemberId } = req.body;

    let med = await Medicine.findOne({ name });
    if (!med) {
      med = new Medicine({ name, description: 'User added' });
      await med.save();
    }

    const newPrescription = new PrescribedMed({
      userId,
      familyMemberId: familyMemberId || null,
      medicineId: med._id,
      dose,
      frequency,
      totalQuantity: parseInt(total_quantity),
      remainingQuantity: parseInt(total_quantity),
      refillAlertAt: refillAlertAt ? parseInt(refillAlertAt) : null
    });
    const savedPrescription = await newPrescription.save();

    // Create one Reminder per scheduled time 
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

// Remove a medicine 
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
    const reminders = await Reminder.find()
      .populate({
        path: 'prescriptionId',
        match: { userId: req.params.userId, active: true },
        populate: [{ path: 'medicineId' }, { path: 'familyMemberId' }]
      });
    const filteredReminders = reminders.filter(r => r.prescriptionId !== null);
    res.json(filteredReminders);
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

app.get('/api/refill-alerts/:userId', async (req, res) => {
  try {
    const medicines = await PrescribedMed.find({ userId: req.params.userId, active: true })
      .populate('medicineId')
      .populate('familyMemberId');

    // return medicines
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
// FEATURE 6: WEEKLY REPORT
// ============================================================

app.post('/api/weekly-report/generate', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const prescriptions = await PrescribedMed.find({ userId, active: true });

    // date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const generatedReports = [];

    for (const rx of prescriptions) {
      const reminders = await Reminder.find({ prescriptionId: rx._id, isActive: true });
      const dailyDoses = reminders.length;

      const totalDose = dailyDoses * 7;

      if (totalDose === 0) continue;

      // logs for last 7 days
      const doseLogs = await DoseLog.find({
        prescriptionId: rx._id,
        dateTaken: { $gte: startDate, $lte: endDate }
      });

      // Calculate
      const doseTaken = doseLogs.filter(log => ['Taken', 'Early', 'Late'].includes(log.status)).length;

      const doseMissed = Math.max(0, totalDose - doseTaken);

      const successRate = (doseTaken / totalDose) * 100;

      // Fetch last week's rate from the most recent Report for this prescription
      const lastReport = await Report.findOne({ prescriptionId: rx._id })
        .sort({ reportDate: -1 }); // Get the latest one

      const lastWeeksRate = lastReport ? lastReport.successRate : null;

      // Create new Report
      const newReport = new Report({
        userId,
        prescriptionId: rx._id,
        totalDose,
        doseTaken,
        doseMissed,
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
// FEATURE 7: APPOINTMENTS & LAB TESTS
// ============================================================

// Fetch all appointments for a user
app.get('/api/appointments/:userId', async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.params.userId })
      .populate('familyMemberId')
      .sort({ date: 1, time: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new appointment
app.post('/api/appointments', async (req, res) => {
  try {
    const { userId, familyMemberId, date, time, doctorName, hospitalName, type, note } = req.body;
    const newAppointment = new Appointment({
      userId,
      familyMemberId: familyMemberId || null,
      date,
      time,
      doctorName,
      hospitalName,
      type,
      note
    });
    await newAppointment.save();
    res.status(201).json(newAppointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all lab tests for a user
app.get('/api/tests/:userId', async (req, res) => {
  try {
    const tests = await Test.find({ userId: req.params.userId })
      .populate('familyMemberId')
      .sort({ date: -1 });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new lab test
app.post('/api/tests', async (req, res) => {
  try {
    const { userId, familyMemberId, testName, hospitalName, date, resultStatus, resultDetails, appointmentId } = req.body;

    // Fix: If appointmentId is an empty string, don't pass it to the model to avoid cast errors
    const testData = { userId, familyMemberId: familyMemberId || null, testName, hospitalName, date, resultStatus, resultDetails };
    if (appointmentId && appointmentId.trim() !== '') {
      testData.appointmentId = appointmentId;
    }

    const newTest = new Test(testData);
    await newTest.save();
    res.status(201).json(newTest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SHARED MEDICINE DATABASE (MOCK DATA)
// ============================================================
const MEDICINE_DATABASE = [
  {
    name: 'Napa',
    class: 'Analgesic & Antipyretic',
    usage: 'Fever, Headache, Body pain',
    mealInstructions: 'After Meal',
    sideEffects: 'Nausea, allergic reactions (rare)',
    alternates: ['Ace', 'Fast', 'Renova']
  },
  {
    name: 'Ace',
    class: 'Analgesic & Antipyretic',
    usage: 'Fever, Pain relief',
    mealInstructions: 'After Meal',
    sideEffects: 'Nausea, skin rash',
    alternates: ['Napa', 'Fast', 'Renova']
  },
  {
    name: 'Seclo',
    class: 'Proton Pump Inhibitor (Antacid)',
    usage: 'Gastritis, Heartburn, Acid reflux',
    mealInstructions: 'Before Meal',
    sideEffects: 'Headache, diarrhea, abdominal pain',
    alternates: ['Sergel', 'Losectil', 'Pantix']
  },
  {
    name: 'Sergel',
    class: 'Proton Pump Inhibitor (Antacid)',
    usage: 'Acid reflux, Gastric ulcers',
    mealInstructions: 'Before Meal',
    sideEffects: 'Dizziness, dry mouth',
    alternates: ['Seclo', 'Losectil', 'Pantix']
  },
  {
    name: 'Azithrocin',
    class: 'Antibiotic (Macrolide)',
    usage: 'Bacterial infections, Respiratory infections',
    mealInstructions: 'Before Meal',
    sideEffects: 'Diarrhea, vomiting, stomach pain',
    alternates: ['Zimax', 'Tridosil', 'Azin']
  },
  {
    name: 'Amodis',
    class: 'Antiprotozoal / Antibiotic',
    usage: 'Diarrhea, Amoebiasis',
    mealInstructions: 'After Meal',
    sideEffects: 'Metallic taste, headache',
    alternates: ['Metryl', 'Filmet']
  },
  {
    name: 'Metformin',
    class: 'Antidiabetic',
    usage: 'Type 2 Diabetes management',
    mealInstructions: 'After Meal',
    sideEffects: 'Nausea, stomach upset',
    alternates: ['Comet', 'Glucomin']
  },
  {
    name: 'Fexo',
    class: 'Antihistamine',
    usage: 'Allergy, Sneezing, Runny nose',
    mealInstructions: 'Before Meal',
    sideEffects: 'Headache, dizziness',
    alternates: ['Alatrol', 'Deslor', 'Fenadin']
  },
  {
    name: 'Flagyl',
    class: 'Antibiotic / Antiprotozoal',
    usage: 'Diarrhea, Amoebiasis, Bacterial infections',
    mealInstructions: 'After Meal',
    sideEffects: 'Nausea, metallic taste, dry mouth',
    alternates: ['Amodis', 'Metryl', 'Filmet']
  },
  {
    name: 'Ciprocin',
    class: 'Antibiotic (Fluoroquinolone)',
    usage: 'Urinary tract infection, Bacterial infections',
    mealInstructions: 'After Meal',
    sideEffects: 'Nausea, dizziness',
    alternates: ['Ciprox', 'Neofloxin']
  },
  {
    name: 'Alatrol',
    class: 'Antihistamine',
    usage: 'Allergy, Itching, Urticaria',
    mealInstructions: 'After Meal',
    sideEffects: 'Drowsiness, dry mouth',
    alternates: ['Fexo', 'Deslor']
  },
  {
    name: 'Losectil',
    class: 'Proton Pump Inhibitor (Antacid)',
    usage: 'Gastric ulcer, Heartburn',
    mealInstructions: 'Before Meal',
    sideEffects: 'Abdominal pain, nausea',
    alternates: ['Seclo', 'Sergel']
  },
  {
    name: 'Cef-3',
    class: 'Antibiotic (Cephalosporin)',
    usage: 'Bacterial infections, Typhoid',
    mealInstructions: 'After Meal',
    sideEffects: 'Stomach upset, rash',
    alternates: ['Fixacef', 'Cefixime']
  },
  {
    name: 'Algin',
    class: 'Antacid / Anti-reflux (Alginic acid preparation)',
    usage: 'Acid reflux, Heartburn, Indigestion',
    mealInstructions: 'After Meal',
    sideEffects: 'Bloating, mild nausea (rare)',
    alternates: ['Gaviscon', 'Algicid']
  },
  {
    name: 'Monas',
    class: 'Leukotriene Receptor Antagonist',
    usage: 'Allergic rhinitis, Asthma prevention',
    mealInstructions: 'After Meal',
    sideEffects: 'Headache, abdominal pain, fatigue',
    alternates: ['Montair', 'Montene']
  },
  {
    name: 'Monaire',
    class: 'Leukotriene Receptor Antagonist',
    usage: 'Allergic rhinitis, Asthma prevention',
    mealInstructions: 'After Meal',
    sideEffects: 'Headache, dizziness, abdominal pain',
    alternates: ['Monas', 'Montair', 'Montene']
  },
  {
    name: 'Fecilax',
    class: 'Laxative (Bulk-forming / Stool softener)',
    usage: 'Constipation, Irregular bowel movement',
    mealInstructions: 'After Meal / With plenty of water',
    sideEffects: 'Bloating, gas, abdominal discomfort',
    alternates: ['Dulcolax', 'Laxol']
  },
  {
    name: 'Omidon',
    class: 'Antiemetic / Prokinetic (Domperidone)',
    usage: 'Nausea, Vomiting, Indigestion, Gastric discomfort',
    mealInstructions: 'Before Meal',
    sideEffects: 'Dry mouth, abdominal cramps, headache',
    alternates: ['Domstal', 'Motigut', 'Domperon']
  },
  {
    name: 'Tamen Turbo',
    class: 'Analgesic (Opioid + Paracetamol Combination)',
    usage: 'Moderate to severe pain (e.g., injury, post-operative pain)',
    mealInstructions: 'After Meal',
    sideEffects: 'Drowsiness, nausea, dizziness, constipation, dependence risk',
    alternates: ['Tamen', 'Tramadol', 'Ultracet']
  },
  {
    name: 'Rivortil',
    class: 'Benzodiazepine (Clonazepam)',
    usage: 'Anxiety, Panic disorder, Seizures, Sleep problems (short-term)',
    mealInstructions: 'After Meal / Before Sleep',
    sideEffects: 'Drowsiness, dizziness, dependence risk, memory issues',
    alternates: ['Clonazepam', 'Clonotril']
  },
  {
    name: 'Savlon',
    class: 'Antiseptic (Chlorhexidine + Cetrimide)',
    usage: 'Wound cleaning, Cuts, Burns, Skin disinfection',
    mealInstructions: 'Not applicable (external use)',
    sideEffects: 'Skin irritation (rare), dryness, allergic reaction (rare)',
    alternates: ['Dettol', 'Betadine', 'Hexisol']
  },
  {
    name: 'Pevison Cream',
    class: 'Topical Antifungal + Corticosteroid',
    usage: 'Fungal skin infections, Itching, Rash, Dermatitis',
    mealInstructions: 'Not applicable (topical use)',
    sideEffects: 'Skin thinning (with long use), burning sensation, irritation',
    alternates: ['Betnovate-N', 'Fungidal-B', 'Quadriderm']
  },
  {
    name: 'Betameson Cream',
    class: 'Topical Corticosteroid (Betamethasone)',
    usage: 'Skin inflammation, eczema, allergic skin reactions, itching',
    mealInstructions: 'Not applicable (topical use)',
    sideEffects: 'Skin thinning, burning, irritation, discoloration (with prolonged use)',
    alternates: ['Betnovate', 'Celestoderm', 'Bexitrol']
  },
  {
    name: 'Fungidal',
    class: 'Topical Antifungal',
    usage: 'Fungal skin infections, ringworm, athlete’s foot, itching',
    mealInstructions: 'Not applicable (topical use)',
    sideEffects: 'Mild burning, redness, skin irritation',
    alternates: ['Canesten', 'Clotrimazole cream', 'Lamisil']
  }

];

// ============================================================
// FEATURE 8: MEDICINE DETAILS
// ============================================================

app.get('/api/medicine-details', (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Medicine name is required' });

  const med = MEDICINE_DATABASE.find(m => m.name.toLowerCase() === name.toLowerCase());

  if (med) {
    const { alternates, ...details } = med; // Exclude alternates for this route
    res.json(details);
  } else {
    res.status(404).json({ error: 'No Info for The Med Exists in Our Database.' });
  }
});

// ============================================================
// FEATURE 9: ALTERNATE MEDICINES
// ============================================================

app.get('/api/medicine-alternates', (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Medicine name is required' });

  const med = MEDICINE_DATABASE.find(m => m.name.toLowerCase() === name.toLowerCase());

  if (med) {
    res.json({ name: med.name, alternates: med.alternates });
  } else {
    res.status(404).json({ error: 'No Info for The Med Exists in Our Database.' });
  }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
