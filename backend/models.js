const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: String,
  phone: String,
  dateOfBirth: Date
}, { timestamps: true });

// Medicine Schema
const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  instructions: String,
  category: String,
  sideEffects: String
});

// Prescribed Medicine Schema (maps to the Dosage tracking)
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

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  doctorName: { type: String, required: true },
  type: String,
  note: String
});

const User = mongoose.model('User', userSchema);
const Medicine = mongoose.model('Medicine', medicineSchema);
const PrescribedMed = mongoose.model('PrescribedMed', prescribedMedSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = { User, Medicine, PrescribedMed, Appointment };
