const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { User, Medicine, PrescribedMed, Appointment } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
// Replace with your actual MongoDB URI when running locally
const MONGO_URI = 'mongodb://127.0.0.1:27017/health_management_mern';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB successfully connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- AUTHENTICATION ROUTES ---

// Signup
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

// Login
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

// --- MEDICINE ROUTES ---

// GET all prescribed medicines
app.get('/api/medicines', async (req, res) => {
  try {
    // Populate the medicine details from the Medicine collection
    const medicines = await PrescribedMed.find({ active: true }).populate('medicineId');
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new medicine
app.post('/api/medicines', async (req, res) => {
  try {
    const { name, dose, frequency, total_quantity, userId } = req.body;
    
    // 1. Create Medicine Document
    const newMedicine = new Medicine({ name, description: 'User added medicine via React' });
    const savedMed = await newMedicine.save();

    // 2. Create PrescribedMed Document mapping to the user
    // Using a dummy user ID if none provided since there's no auth yet
    const defaultUserId = userId || new mongoose.Types.ObjectId(); 
    
    const newPrescription = new PrescribedMed({
      userId: defaultUserId,
      medicineId: savedMed._id,
      dose,
      frequency,
      totalQuantity: parseInt(total_quantity),
      remainingQuantity: parseInt(total_quantity)
    });
    
    const savedPrescription = await newPrescription.save();
    res.status(201).json({ message: 'Medicine added!', prescription: savedPrescription });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET appointments
app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ date: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
