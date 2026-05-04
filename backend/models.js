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

// 2. FAMILY MEMBER SCHEMA 
const familyMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  relation: { type: String, required: true }
}, { timestamps: true });

// 3. MEDICINE SCHEMA 
const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  instructions: String,
  mealInstructions: { type: String, enum: ['Before Meal', 'After Meal', 'Anytime'] },
  category: String, // This will be the "class"
  sideEffects: String
}, { timestamps: true });

// 4. ALTERNATE MEDICINE SCHEMA 
const alternateMedSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  alternateMedicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true }
});

// 5. PRESCRIBED MEDICINE SCHEMA 
const prescribedMedSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  familyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' }, // Optional: if null, it's for the primary user
  dose: { type: String, required: true },
  frequency: { type: String, required: true },
  startDate: Date,
  endDate: Date,
  totalQuantity: { type: Number, required: true },
  remainingQuantity: { type: Number, required: true },
  active: { type: Boolean, default: true },
  refillAlertAt: { type: Number, default: 5 }
}, { timestamps: true });

// 6. DOSE LOG SCHEMA 
const doseLogSchema = new mongoose.Schema({
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrescribedMed', required: true },
  dateTaken: { type: Date, required: true },
  timeTaken: { type: String, required: true },
  scheduledTime: { type: String, required: true },
  status: { type: String, enum: ['Taken', 'Early', 'Late', 'Missed'], required: true },
  notes: String
}, { timestamps: true });

// 7. REMINDER SCHEMA 
const reminderSchema = new mongoose.Schema({
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrescribedMed', required: true },
  timeToTake: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});

// 8. APPOINTMENT SCHEMA 
const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  familyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  doctorName: { type: String, required: true },
  hospitalName: String,
  type: String,
  note: String,
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' }
}, { timestamps: true });

// 9. TEST SCHEMA 
const testSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  familyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }, // Optional link
  testName: { type: String, required: true },
  hospitalName: String,
  date: { type: Date, required: true },
  resultStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  resultDetails: String
}, { timestamps: true });

// 10. SYMPTOM SCHEMA 
const symptomSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  symptomName: { type: String, required: true },
  severity: { type: String, enum: ['Mild', 'Moderate', 'Severe'], required: true },
  notes: String
}, { timestamps: true });

// 11. REPORT SCHEMA 
const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrescribedMed' },
  reportDate: { type: Date, default: Date.now },
  totalDose: { type: Number },
  doseTaken: { type: Number },
  doseMissed: { type: Number },
  successRate: { type: Number, required: true },
  lastWeeksRate: { type: Number },
  summary: String
}, { timestamps: true });

// Compile Models
const User = mongoose.model('User', userSchema);
const FamilyMember = mongoose.model('FamilyMember', familyMemberSchema);
const Medicine = mongoose.model('Medicine', medicineSchema);
const AlternateMed = mongoose.model('AlternateMed', alternateMedSchema);
const PrescribedMed = mongoose.model('PrescribedMed', prescribedMedSchema);
const DoseLog = mongoose.model('DoseLog', doseLogSchema);
const Reminder = mongoose.model('Reminder', reminderSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Test = mongoose.model('Test', testSchema);
const Symptom = mongoose.model('Symptom', symptomSchema);
const Report = mongoose.model('Report', reportSchema);

module.exports = {
  User,
  FamilyMember,
  Medicine,
  AlternateMed,
  PrescribedMed,
  DoseLog,
  Reminder,
  Appointment,
  Test,
  Symptom,
  Report
};
