import { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [medicines, setMedicines] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [newMedForm, setNewMedForm] = useState({ name: '', dose: '', frequency: '', scheduledTimes: [''], total_quantity: '', refillAlertAt: '' });
  const [takenStatuses, setTakenStatuses] = useState({});
  const [lowStockMeds, setLowStockMeds] = useState([]);

  // Symptom Checker State
  const SYMPTOM_LIST = ['Fever', 'Fatigue', 'Headache', 'Dizziness', 'Blurred vision', 'Nausea', 'Diarrhea', 'Joint pain', 'Muscle aches'];
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [symptomResult, setSymptomResult] = useState(null);
  const [symptomLoading, setSymptomLoading] = useState(false);

  const fetchData = () => {
    if (!user) return;
    fetch(`http://localhost:5000/api/medicines/${user.id}`)
      .then(res => res.json())
      .then(data => setMedicines(data))
      .catch(err => console.error(err));
      
    fetch(`http://localhost:5000/api/schedule/${user.id}`)
      .then(res => res.json())
      .then(data => setSchedule(data))
      .catch(err => console.error(err));

    // Fetch Refill Alerts from backend
    fetch(`http://localhost:5000/api/refill-alerts/${user.id}`)
      .then(res => res.json())
      .then(data => setLowStockMeds(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLoginView ? '/api/login' : '/api/signup';
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        setAuthForm({ name: '', email: '', password: '' });
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to connect to server.");
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMedForm, userId: user.id })
      });
      if (response.ok) {
        setNewMedForm({ name: '', dose: '', frequency: '', scheduledTimes: [''], total_quantity: '', refillAlertAt: '' });
        fetchData();
        setActiveTab('medicines'); // Switch to medicines tab to see it added
      } else {
        alert('Error adding medicine');
      }
    } catch (err) {
      alert("Failed to connect");
    }
  };

  const handleRemoveMedicine = async (id) => {
    if (!window.confirm("Are you sure you want to delete this medicine?")) return;
    try {
      const response = await fetch(`http://localhost:5000/api/medicines/${id}`, { method: 'DELETE' });
      if (response.ok) fetchData();
    } catch (err) {
      alert("Failed to remove");
    }
  };

  const handleTakeDose = async (prescriptionId, scheduledTime, reminderId) => {
    const now = new Date();
    const timeTaken = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    try {
      const response = await fetch('http://localhost:5000/api/doselogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prescriptionId, scheduledTime, timeTaken })
      });
      const data = await response.json();
      if (response.ok) {
        setTakenStatuses(prev => ({ ...prev, [reminderId]: data.status }));
        fetchData(); 
      }
    } catch (err) {
      alert("Failed to log dose");
    }
  };

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="title">Health Nest</h2>
          <p className="subtitle">{isLoginView ? 'Welcome Back' : 'Create an Account'}</p>
          <form onSubmit={handleAuth} className="auth-form">
            {!isLoginView && (
              <input type="text" placeholder="Full Name" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
            )}
            <input type="email" placeholder="Email Address" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
            <input type="password" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
            <button type="submit" className="btn-primary">{isLoginView ? 'Login' : 'Sign Up'}</button>
          </form>
          <p className="auth-toggle">
            {isLoginView ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => setIsLoginView(!isLoginView)}>{isLoginView ? 'Sign up' : 'Login'}</span>
          </p>
        </div>
      </div>
    );
  }

  // Derive unique meds for today from schedule
  const medsForTodayIds = new Set();
  const medsForToday = [];
  schedule.forEach(rem => {
    const medId = rem.prescriptionId?._id;
    if (medId && !medsForTodayIds.has(medId)) {
      medsForTodayIds.add(medId);
      medsForToday.push(rem.prescriptionId);
    }
  });

  // lowStockMeds is now fetched from backend via /api/refill-alerts/:userId

  // Toggle a symptom checkbox
  const toggleSymptom = (symptom) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  // Submit symptoms to backend for analysis
  const handleSymptomCheck = async () => {
    if (selectedSymptoms.length === 0) {
      alert('Please select at least one symptom.');
      return;
    }
    setSymptomLoading(true);
    setSymptomResult(null);
    try {
      const response = await fetch('http://localhost:5000/api/symptoms/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, selectedSymptoms })
      });
      const data = await response.json();
      if (response.ok) {
        setSymptomResult(data);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to connect to server.');
    }
    setSymptomLoading(false);
  };

  return (
    <div className="app-wrapper">
      {/* Sidebar Taskbar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Health Nest</h2>
        </div>
        <nav className="sidebar-nav">
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            Dashboard
          </button>
          <button className={activeTab === 'medicines' ? 'active' : ''} onClick={() => setActiveTab('medicines')}>
            Medicines Database
          </button>
          <button className={activeTab === 'symptoms' ? 'active' : ''} onClick={() => setActiveTab('symptoms')}>
            Symptom Checker
          </button>
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => setUser(null)} className="btn-logout">Logout</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header">
          <span>Welcome, <strong>{user.name}</strong>!</span>
        </header>

        <div className="content-container">
          
          {activeTab === 'dashboard' && (
            <div className="tab-view">
              {/* Refill Reminder Section */}
              <section className="card refill-section">
                <h3>⚠️ Refill Reminder</h3>
                {lowStockMeds.length === 0 ? (
                  <p className="success-text">No refill needed.</p>
                ) : (
                  <div className="alert-list">
                    {lowStockMeds.map(med => (
                      <div key={med._id} className="alert-item">
                        <span><strong>{med.medicineId?.name}</strong> is running low!</span>
                        <span className="badge danger">Only {med.remainingQuantity} left</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Add Medicine Form */}
              <section className="card">
                <h3>➕ Add New Medicine</h3>
                <form onSubmit={handleAddMedicine} className="add-med-form">
                  <input type="text" placeholder="Medicine Name" value={newMedForm.name} onChange={e => setNewMedForm({...newMedForm, name: e.target.value})} required />
                  <input type="text" placeholder="Dose (e.g. 500mg)" value={newMedForm.dose} onChange={e => setNewMedForm({...newMedForm, dose: e.target.value})} required />
                  <select value={newMedForm.frequency} onChange={e => {
                    const val = e.target.value;
                    let count = 1;
                    if (val === 'Twice a day') count = 2;
                    if (val === 'Thrice a day') count = 3;
                    const newTimes = Array(count).fill('');
                    setNewMedForm({...newMedForm, frequency: val, scheduledTimes: newTimes});
                  }} required>
                    <option value="">Select Frequency...</option>
                    <option value="Once a day">Once a day</option>
                    <option value="Twice a day">Twice a day</option>
                    <option value="Thrice a day">Thrice a day</option>
                  </select>
                  {newMedForm.scheduledTimes.map((time, index) => (
                    <input key={index} type="time" title={`Scheduled Time ${index + 1}`} value={time} onChange={e => {
                      const newTimes = [...newMedForm.scheduledTimes];
                      newTimes[index] = e.target.value;
                      setNewMedForm({...newMedForm, scheduledTimes: newTimes});
                    }} required />
                  ))}
                  <input type="number" placeholder="Total Pills" value={newMedForm.total_quantity} onChange={e => setNewMedForm({...newMedForm, total_quantity: e.target.value})} required />
                  <input type="number" placeholder="Alert at (e.g. 5)" value={newMedForm.refillAlertAt} onChange={e => setNewMedForm({...newMedForm, refillAlertAt: e.target.value})} />
                  <button type="submit" className="btn-primary">Save Medicine</button>
                </form>
              </section>

              <div className="grid-2-col">
                {/* Left Column: Today's Schedule */}
                <section className="card">
                  <h3>⏰ Today's Schedule</h3>
                  <div className="schedule-list">
                    {schedule.length === 0 ? <p className="empty-text">No medicines scheduled.</p> : schedule.map(reminder => (
                      <div key={reminder._id} className="schedule-item">
                        <div className="schedule-info">
                          <h4>{reminder.timeToTake}</h4>
                          <p><strong>{reminder.prescriptionId?.medicineId?.name}</strong></p>
                        </div>
                        {takenStatuses[reminder._id] ? (
                          <span className={`badge ${
                            takenStatuses[reminder._id] === 'Late' ? 'danger' :
                            takenStatuses[reminder._id] === 'Early' ? 'warning' :
                            'safe'
                          }`} style={{fontSize: '14px', padding: '6px 12px'}}>
                            {takenStatuses[reminder._id] === 'Late' ? 'Late Taken' :
                             takenStatuses[reminder._id] === 'Early' ? 'Early Taken' :
                             'Taken'}
                          </span>
                        ) : (
                          <button onClick={() => handleTakeDose(reminder.prescriptionId?._id, reminder.timeToTake, reminder._id)} className="btn-success icon-btn">
                            ✓
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Right Column: Meds for Today (NO STOCK) */}
                <section className="card">
                  <h3>💊 Meds for Today</h3>
                  <div className="medicine-list">
                    {medsForToday.length === 0 ? <p className="empty-text">No active medicines today.</p> : medsForToday.map(med => (
                      <div key={med._id} className="medicine-item">
                        <div className="med-details">
                          <h4>{med.medicineId?.name}</h4>
                          <p>Dose: {med.dose}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'medicines' && (
            <div className="tab-view">
              <section className="card">
                <h3>📚 Medicine Database</h3>
                <p style={{marginBottom: '16px', color: 'var(--text-muted)'}}>Here is your full list of medications and their current stock levels.</p>
                <div className="medicine-list">
                  {medicines.length === 0 ? <p className="empty-text">No active medicines.</p> : medicines.map(med => (
                    <div key={med._id} className="medicine-item">
                      <div className="med-details">
                        <h4>{med.medicineId?.name}</h4>
                        <p>{med.dose} • {med.frequency}</p>
                        <span className="badge safe">Stock: {med.remainingQuantity} / {med.totalQuantity}</span>
                      </div>
                      <button onClick={() => handleRemoveMedicine(med._id)} className="btn-danger">Delete</button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'symptoms' && (
            <div className="tab-view">
              <section className="card">
                <h3>🩺 Symptom Checker</h3>
                <p style={{marginBottom: '20px', color: 'var(--text-muted)'}}>Select all the symptoms you are currently experiencing and we will analyze possible conditions.</p>

                <div className="symptom-grid">
                  {SYMPTOM_LIST.map(symptom => (
                    <label key={symptom} className={`symptom-chip ${selectedSymptoms.includes(symptom) ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedSymptoms.includes(symptom)}
                        onChange={() => toggleSymptom(symptom)}
                        style={{display: 'none'}}
                      />
                      {symptom}
                    </label>
                  ))}
                </div>

                <div style={{marginTop: '24px', display: 'flex', gap: '12px', alignItems: 'center'}}>
                  <button onClick={handleSymptomCheck} className="btn-primary" disabled={symptomLoading}>
                    {symptomLoading ? 'Analyzing...' : '🔍 Analyze Symptoms'}
                  </button>
                  <button onClick={() => { setSelectedSymptoms([]); setSymptomResult(null); }} className="btn-outline">
                    Clear
                  </button>
                </div>
              </section>

              {symptomResult && (
                <section className="card">
                  <h3>📋 Analysis Results</h3>

                  <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px'}}>
                    <span>Overall Severity:</span>
                    <span className={`badge ${
                      symptomResult.overallSeverity === 'Severe' ? 'danger' :
                      symptomResult.overallSeverity === 'Moderate' ? 'warning' : 'safe'
                    }`} style={{fontSize: '14px', padding: '6px 14px'}}>
                      {symptomResult.overallSeverity}
                    </span>
                  </div>

                  {symptomResult.message && (
                    <p style={{color: 'var(--text-muted)', fontStyle: 'italic'}}>{symptomResult.message}</p>
                  )}

                  {symptomResult.conditions && symptomResult.conditions.map((cond, i) => (
                    <div key={i} className="condition-card">
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                        <h4>{cond.name}</h4>
                        <span className={`badge ${
                          cond.severity === 'Severe' ? 'danger' :
                          cond.severity === 'Moderate' ? 'warning' : 'safe'
                        }`}>{cond.severity}</span>
                      </div>
                      <p style={{color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px'}}>
                        Matched symptoms: <strong>{cond.matchedSymptoms.join(', ')}</strong>
                      </p>
                      <p style={{fontSize: '14px', lineHeight: '1.6'}}>{cond.feedback}</p>
                    </div>
                  ))}
                </section>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
