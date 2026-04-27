const mongoose = require('mongoose');

// 1. USER SCHEMA
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: String,
  phone: String,
  dateOfBirth: Date
}, { timestamps: true });

// 2. FAMILY SCHEMA (Tracks relatives)
const familySchema = new mongoose.Schema({
  personalUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  relativeUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  relation: { type: String, required: true }
}, { timestamps: true });

// 3. MEDICINE SCHEMA (Medicine Information Database)
const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  instructions: String,
  category: String,
  sideEffects: String
}, { timestamps: true });

// 4. ALTERNATE MEDICINE SCHEMA (Mapping for alternative options)
const alternateMedSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  alternateMedicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true }
});

// 5. PRESCRIBED MEDICINE SCHEMA (Tracks what a user is taking & stock)
const prescribedMedSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  dose: { type: String, required: true },
  frequency: { type: String, required: true },
  startDate: Date,
  endDate: Date,
  totalQuantity: { type: Number, required: true },
  remainingQuantity: { type: Number, required: true },
  active: { type: Boolean, default: true },
  refillAlertAt: { type: Number, default: 5 }
}, { timestamps: true });

// 6. DOSE LOG SCHEMA (Tracks daily pill intake history)
const doseLogSchema = new mongoose.Schema({
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrescribedMed', required: true },
  dateTaken: { type: Date, required: true },
  timeTaken: { type: String, required: true },
  scheduledTime: { type: String, required: true }, // Needed to calculate if it was late
  status: { type: String, enum: ['Taken', 'Early', 'Late', 'Missed'], required: true },
  notes: String // Optional comment about the dose
}, { timestamps: true });

// 7. REMINDER SCHEMA (Tracks notifications for doses)
const reminderSchema = new mongoose.Schema({
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrescribedMed', required: true },
  timeToTake: { type: String, required: true }, // e.g., "08:00 AM"
  isActive: { type: Boolean, default: true }
});

// 8. APPOINTMENT SCHEMA (Tracks doctor visits)
const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  doctorName: { type: String, required: true },
  type: String,
  note: String,
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' }
}, { timestamps: true });

// 9. TEST SCHEMA (Tracks lab tests and reports)
const testSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }, // Optional link
  testName: { type: String, required: true },
  date: { type: Date, required: true },
  resultStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  resultDetails: String
}, { timestamps: true });

// 10. SYMPTOM SCHEMA (Tracks daily user symptoms)
const symptomSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  symptomName: { type: String, required: true },
  severity: { type: String, enum: ['Mild', 'Moderate', 'Severe'], required: true },
  notes: String
}, { timestamps: true });

// 11. REPORT SCHEMA (Generated health summaries)
const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportDate: { type: Date, default: Date.now },
  adherenceRate: { type: Number, required: true }, // Percentage 0-100
  summary: String
}, { timestamps: true });

// 12. WEEKLY REPORT SCHEMA (Tracks doses and success rate per medicine)
const weeklyReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrescribedMed', required: true },
  totalDose: { type: Number, required: true },
  doseTaken: { type: Number, required: true },
  doseMissed: { type: Number, required: true },
  medicineStart: { type: Date },
  medicineEnd: { type: Date },
  successRate: { type: Number, required: true }, // Percentage 0-100
  lastWeeksRate: { type: Number }, // Percentage 0-100
  reportDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Compile Models
const User = mongoose.model('User', userSchema);
const Family = mongoose.model('Family', familySchema);
const Medicine = mongoose.model('Medicine', medicineSchema);
const AlternateMed = mongoose.model('AlternateMed', alternateMedSchema);
const PrescribedMed = mongoose.model('PrescribedMed', prescribedMedSchema);
const DoseLog = mongoose.model('DoseLog', doseLogSchema);
const Reminder = mongoose.model('Reminder', reminderSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Test = mongoose.model('Test', testSchema);
const Symptom = mongoose.model('Symptom', symptomSchema);
const Report = mongoose.model('Report', reportSchema);
const WeeklyReport = mongoose.model('WeeklyReport', weeklyReportSchema);

module.exports = {
  User,
  Family,
  Medicine,
  AlternateMed,
  PrescribedMed,
  DoseLog,
  Reminder,
  Appointment,
  Test,
  Symptom,
  Report,
  WeeklyReport
};
