import { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [medicines, setMedicines] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [newMedForm, setNewMedForm] = useState({ name: '', dose: '', frequency: '', scheduledTimes: [''], total_quantity: '', refillAlertAt: '', familyMemberId: '' });
  const [takenStatuses, setTakenStatuses] = useState({});
  const [lowStockMeds, setLowStockMeds] = useState([]);

  // Symptom Checker 
  const SYMPTOM_LIST = ["Fever", "Headache", "Joint pain", "Muscle aches", "Fatigue", "Blurred vision", "Dizziness", "Nausea", "Diarrhea", "Runny nose", "Sneezing", "Sore throat", "Cough", "Mild fever", "Vomiting", "Abdominal pain", "High fever", "Chest pain", "Shortness of breath", "Itching", "Dry skin", "Rash", "Redness", "Red eyes", "Eye discharge", "Watering eyes", "Difficulty swallowing", "Swollen tonsils", "Heartburn", "Chest discomfort", "Bloating", "Body pain", "Pain swallowing"];
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [symptomResult, setSymptomResult] = useState(null);
  const [symptomLoading, setSymptomLoading] = useState(false);

  // Weekly Report 
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Appointments & Lab Tests 
  const [appointments, setAppointments] = useState([]);
  const [tests, setTests] = useState([]);
  const [newApptForm, setNewApptForm] = useState({ doctorName: '', hospitalName: '', date: '', time: '', type: '', note: '', familyMemberId: '' });
  const [newTestForm, setNewTestForm] = useState({ testName: '', hospitalName: '', date: '', resultStatus: 'Pending', resultDetails: '', appointmentId: '', familyMemberId: '' });

  // Family check
  const [familyMembers, setFamilyMembers] = useState([]);
  const [newFamilyForm, setNewFamilyForm] = useState({ name: '', relation: '' });

  // Med Info 
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [medInfoResult, setMedInfoResult] = useState(null);
  const [medInfoLoading, setMedInfoLoading] = useState(false);
  const [medInfoError, setMedInfoError] = useState(null);

  const handleGetMedDetails = async (e) => {
    if (e) e.preventDefault();
    if (!medSearchQuery) return;
    setMedInfoLoading(true);
    setMedInfoResult(null);
    setMedInfoError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/medicine-details?name=${medSearchQuery}`);
      const data = await response.json();
      if (response.ok) {
        setMedInfoResult(data);
      } else {
        setMedInfoError(data.error || 'Medicine not found');
      }
    } catch (err) {
      setMedInfoError("Error connecting to server");
    } finally {
      setMedInfoLoading(false);
    }
  };

  const handleGetAlternates = async (e) => {
    if (e) e.preventDefault();
    if (!medSearchQuery) return;
    setMedInfoLoading(true);
    setMedInfoResult(null);
    setMedInfoError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/medicine-alternates?name=${medSearchQuery}`);
      const data = await response.json();
      if (response.ok) {
        setMedInfoResult(data);
      } else {
        setMedInfoError(data.error || 'Medicine not found');
      }
    } catch (err) {
      setMedInfoError("Error connecting to server");
    } finally {
      setMedInfoLoading(false);
    }
  };

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

    // Fetch Refill Alerts 
    fetch(`http://localhost:5000/api/refill-alerts/${user.id}`)
      .then(res => res.json())
      .then(data => setLowStockMeds(data))
      .catch(err => console.error(err));

    // Fetch Appointments
    fetch(`http://localhost:5000/api/appointments/${user.id}`)
      .then(res => res.json())
      .then(data => setAppointments(data))
      .catch(err => console.error(err));

    // Fetch Lab Tests
    fetch(`http://localhost:5000/api/tests/${user.id}`)
      .then(res => res.json())
      .then(data => setTests(data))
      .catch(err => console.error(err));

    // Fetch Family Members
    fetch(`http://localhost:5000/api/family/${user.id}`)
      .then(res => res.json())
      .then(data => setFamilyMembers(data))
      .catch(err => console.error(err));

    // Fetch Today's Dose Logs to save taken status
    fetch(`http://localhost:5000/api/doselogs/today/${user.id}`)
      .then(res => res.json())
      .then(data => {
        const statuses = {};
        data.forEach(log => {
          const key = `${log.prescriptionId}_${log.scheduledTime}`;
          statuses[key] = log.status;
        });
        setTakenStatuses(statuses);
      })
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
        setNewMedForm({ name: '', dose: '', frequency: '', scheduledTimes: [''], total_quantity: '', refillAlertAt: '', familyMemberId: '' });
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
        const key = `${prescriptionId}_${scheduledTime}`;
        setTakenStatuses(prev => ({ ...prev, [key]: data.status }));
        fetchData();
      }
    } catch (err) {
      alert("Failed to log dose");
    }
  };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newApptForm, userId: user.id })
      });
      if (response.ok) {
        setNewApptForm({ doctorName: '', hospitalName: '', date: '', time: '', type: '', note: '', familyMemberId: '' });
        fetchData();
      } else {
        alert('Error adding appointment');
      }
    } catch (err) {
      alert("Failed to connect to server.");
    }
  };

  const handleAddTest = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTestForm, userId: user.id })
      });
      if (response.ok) {
        setNewTestForm({ testName: '', hospitalName: '', date: '', resultStatus: 'Pending', resultDetails: '', appointmentId: '', familyMemberId: '' });
        fetchData();
      } else {
        alert('Error adding lab test');
      }
    } catch (err) {
      alert("Failed to connect to server.");
    }
  };

  const handleAddFamilyMember = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newFamilyForm, userId: user.id })
      });
      if (response.ok) {
        setNewFamilyForm({ name: '', relation: '' });
        fetchData();
      } else {
        alert('Error adding family member');
      }
    } catch (err) {
      alert("Failed to connect to server.");
    }
  };

  const handleRemoveFamilyMember = async (id) => {
    if (!confirm("Remove this family member? Related records might become unlinked.")) return;
    try {
      const response = await fetch(`http://localhost:5000/api/family/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
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
              <input type="text" placeholder="Full Name" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} required />
            )}
            <input type="email" placeholder="Email Address" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} required />
            <input type="password" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} required />
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

  // send symptoms to backend 
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

  const handleGenerateWeeklyReport = async () => {
    setReportLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/weekly-report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await response.json();
      if (response.ok) {
        setWeeklyReports(data.reports);
      } else {
        alert(data.error || 'Failed to generate report');
      }
    } catch (err) {
      alert('Failed to connect to server.');
    }
    setReportLoading(false);
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
          <button className={activeTab === 'weekly-report' ? 'active' : ''} onClick={() => setActiveTab('weekly-report')}>
            Weekly Reports
          </button>
          <button className={activeTab === 'appointments' ? 'active' : ''} onClick={() => setActiveTab('appointments')}>
            Appointments & Tests
          </button>
          <button className={activeTab === 'family' ? 'active' : ''} onClick={() => setActiveTab('family')}>
            Family Management
          </button>
          <button className={activeTab === 'med-details' ? 'active' : ''} onClick={() => { setActiveTab('med-details'); setMedInfoResult(null); }}>
            Medicine Details
          </button>
          <button className={activeTab === 'alternates' ? 'active' : ''} onClick={() => { setActiveTab('alternates'); setMedInfoResult(null); }}>
            Alternate Meds
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
                <form onSubmit={handleAddMedicine} className="add-med-form grid-2-col-form">
                  <input type="text" placeholder="Medicine Name" value={newMedForm.name} onChange={e => setNewMedForm({ ...newMedForm, name: e.target.value })} required />
                  <input type="text" placeholder="Dose (e.g. 500mg)" value={newMedForm.dose} onChange={e => setNewMedForm({ ...newMedForm, dose: e.target.value })} required />
                  <select value={newMedForm.familyMemberId} onChange={e => setNewMedForm({ ...newMedForm, familyMemberId: e.target.value })}>
                    <option value="">For Self (Primary User)</option>
                    {familyMembers.map(member => (
                      <option key={member._id} value={member._id}>For {member.name} ({member.relation})</option>
                    ))}
                  </select>
                  <select value={newMedForm.frequency} onChange={e => {
                    const val = e.target.value;
                    let count = 1;
                    if (val === 'Twice a day') count = 2;
                    if (val === 'Thrice a day') count = 3;
                    const newTimes = Array(count).fill('');
                    setNewMedForm({ ...newMedForm, frequency: val, scheduledTimes: newTimes });
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
                      setNewMedForm({ ...newMedForm, scheduledTimes: newTimes });
                    }} required />
                  ))}
                  <input type="number" placeholder="Total Pills" value={newMedForm.total_quantity} onChange={e => setNewMedForm({ ...newMedForm, total_quantity: e.target.value })} required />
                  <input type="number" placeholder="Alert threshold (e.g. 5)" value={newMedForm.refillAlertAt} onChange={e => setNewMedForm({ ...newMedForm, refillAlertAt: e.target.value })} required />
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
                          <p>
                            <strong>{reminder.prescriptionId?.medicineId?.name}</strong> 
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              {reminder.prescriptionId?.familyMemberId ? `(${reminder.prescriptionId.familyMemberId.name})` : '(Self)'}
                            </span>
                          </p>
                        </div>
                        {takenStatuses[`${reminder.prescriptionId?._id}_${reminder.timeToTake}`] ? (
                          <span className={`badge ${takenStatuses[`${reminder.prescriptionId?._id}_${reminder.timeToTake}`] === 'Late' ? 'danger' :
                            takenStatuses[`${reminder.prescriptionId?._id}_${reminder.timeToTake}`] === 'Early' ? 'warning' :
                              'safe'
                            }`} style={{ fontSize: '14px', padding: '6px 12px' }}>
                            {takenStatuses[`${reminder.prescriptionId?._id}_${reminder.timeToTake}`] === 'Late' ? 'Late Taken' :
                              takenStatuses[`${reminder.prescriptionId?._id}_${reminder.timeToTake}`] === 'Early' ? 'Early Taken' :
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
                          <p>Dose: {med.dose} | For: {med.familyMemberId ? med.familyMemberId.name : 'Self'}</p>
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
                <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Here is your full list of medications and their current stock levels.</p>
                <div className="medicine-list">
                  {medicines.length === 0 ? <p className="empty-text">No active medicines.</p> : medicines.map(med => (
                    <div key={med._id} className="medicine-item">
                      <div className="med-details">
                        <h4>{med.medicineId?.name} ({med.dose})</h4>
                        <p>For: {med.familyMemberId ? med.familyMemberId.name : 'Self'}</p>
                        <p style={{ fontSize: '13px' }}>Frequency: {med.frequency}</p>
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
                <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>Select all the symptoms you are currently experiencing and we will analyze possible conditions.</p>

                <div className="symptom-grid">
                  {SYMPTOM_LIST.map(symptom => (
                    <label key={symptom} className={`symptom-chip ${selectedSymptoms.includes(symptom) ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedSymptoms.includes(symptom)}
                        onChange={() => toggleSymptom(symptom)}
                        style={{ display: 'none' }}
                      />
                      {symptom}
                    </label>
                  ))}
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span>Overall Severity:</span>
                    <span className={`badge ${symptomResult.overallSeverity === 'Severe' ? 'danger' :
                      symptomResult.overallSeverity === 'Moderate' ? 'warning' : 'safe'
                      }`} style={{ fontSize: '14px', padding: '6px 14px' }}>
                      {symptomResult.overallSeverity}
                    </span>
                  </div>

                  {symptomResult.message && (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{symptomResult.message}</p>
                  )}

                  {symptomResult.conditions && symptomResult.conditions.map((cond, i) => (
                    <div key={i} className="condition-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4>{cond.name}</h4>
                        <span className={`badge ${cond.severity === 'Severe' ? 'danger' :
                          cond.severity === 'Moderate' ? 'warning' : 'safe'
                          }`}>{cond.severity}</span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
                        Matched symptoms: <strong>{cond.matchedSymptoms.join(', ')}</strong>
                      </p>
                      <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{cond.feedback}</p>
                    </div>
                  ))}
                </section>
              )}
            </div>
          )}

          {activeTab === 'weekly-report' && (
            <div className="tab-view">
              <section className="card">
                <h3>📊 Weekly Progress Reports</h3>
                <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>Generate a report to see your medication adherence over the last 7 days.</p>
                <button onClick={handleGenerateWeeklyReport} className="btn-primary" disabled={reportLoading}>
                  {reportLoading ? 'Generating...' : '🔄 Generate Latest Report'}
                </button>

                {weeklyReports.length > 0 && (
                  <div className="medicine-list" style={{ marginTop: '24px' }}>
                    {weeklyReports.map(report => {
                      const med = medicines.find(m => m._id === report.prescriptionId);
                      const medName = med ? med.medicineId?.name : 'Unknown Medicine';

                      return (
                        <div key={report._id} className="medicine-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '12px' }}>
                            <h4 style={{ fontSize: '18px' }}>{medName}</h4>
                            <span className={`badge ${report.successRate === 100 ? 'safe' :
                              report.successRate >= 50 ? 'warning' : 'danger'
                              }`} style={{ fontSize: '16px' }}>
                              {report.successRate.toFixed(0)}% Success
                            </span>
                          </div>
                          <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Expected Doses: <strong>{report.totalDose}</strong> |
                            Taken: <strong>{report.doseTaken}</strong> |
                            Missed: <strong>{report.doseMissed}</strong>
                          </p>
                          {report.lastWeeksRate !== null && (
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                              Last week's rate: {report.lastWeeksRate.toFixed(0)}%
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="tab-view">
              <div className="grid-2-col">
                {/* Appointments Section */}
                <section className="card">
                  <h3>🗓️ Schedule Appointment</h3>
                  <form onSubmit={handleAddAppointment} className="add-med-form grid-2-col-form">
                    <input type="text" placeholder="Doctor Name" value={newApptForm.doctorName} onChange={e => setNewApptForm({ ...newApptForm, doctorName: e.target.value })} required />
                    <input type="text" placeholder="Hospital Name" value={newApptForm.hospitalName} onChange={e => setNewApptForm({ ...newApptForm, hospitalName: e.target.value })} required />
                    <select value={newApptForm.familyMemberId} onChange={e => setNewApptForm({ ...newApptForm, familyMemberId: e.target.value })}>
                      <option value="">For Self (Primary User)</option>
                      {familyMembers.map(member => (
                        <option key={member._id} value={member._id}>For {member.name} ({member.relation})</option>
                      ))}
                    </select>
                    <input type="text" placeholder="Type (e.g. General Checkup)" value={newApptForm.type} onChange={e => setNewApptForm({ ...newApptForm, type: e.target.value })} required />
                    <input type="date" value={newApptForm.date} onChange={e => setNewApptForm({ ...newApptForm, date: e.target.value })} required />
                    <input type="time" value={newApptForm.time} onChange={e => setNewApptForm({ ...newApptForm, time: e.target.value })} required />
                    <textarea placeholder="Notes" value={newApptForm.note} onChange={e => setNewApptForm({ ...newApptForm, note: e.target.value })} />
                    <button type="submit" className="btn-primary">Add Appointment</button>
                  </form>

                  <div className="schedule-list">
                    <h4 className="list-section-header">Upcoming Appointments</h4>
                    {appointments.length === 0 ? <p className="empty-text">No upcoming appointments.</p> : appointments.map(appt => (
                      <div key={appt._id} className="schedule-item">
                        <div className="schedule-info">
                          <h4>{new Date(appt.date).toLocaleDateString()} at {appt.time}</h4>
                          <p><strong>Dr. {appt.doctorName}</strong> @ {appt.hospitalName}</p>
                          <p>For: {appt.familyMemberId ? appt.familyMemberId.name : 'Self'}</p>
                          <p>Type: {appt.type}</p>
                          {appt.note && <p style={{ fontStyle: 'italic' }}>{appt.note}</p>}
                        </div>
                        <span className="badge safe">{appt.status}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Lab Tests Section */}
                <section className="card">
                  <h3>🧪 Lab Tests</h3>
                  <form onSubmit={handleAddTest} className="add-med-form grid-2-col-form">
                    <input type="text" placeholder="Test Name" value={newTestForm.testName} onChange={e => setNewTestForm({ ...newTestForm, testName: e.target.value })} required />
                    <input type="text" placeholder="Hospital/Lab Name" value={newTestForm.hospitalName} onChange={e => setNewTestForm({ ...newTestForm, hospitalName: e.target.value })} required />
                    <select value={newTestForm.familyMemberId} onChange={e => setNewTestForm({ ...newTestForm, familyMemberId: e.target.value })}>
                      <option value="">For Self (Primary User)</option>
                      {familyMembers.map(member => (
                        <option key={member._id} value={member._id}>For {member.name} ({member.relation})</option>
                      ))}
                    </select>
                    <input type="date" value={newTestForm.date} onChange={e => setNewTestForm({ ...newTestForm, date: e.target.value })} required />
                    <input type="text" placeholder="Test Notes" value={newTestForm.resultDetails} onChange={e => setNewTestForm({ ...newTestForm, resultDetails: e.target.value })} />
                    <button type="submit" className="btn-primary">Add Lab Test</button>
                  </form>

                  <div className="schedule-list">
                    <h4 className="list-section-header">Lab Test History</h4>
                    {tests.length === 0 ? <p className="empty-text">No lab tests recorded.</p> : tests.map(test => (
                      <div key={test._id} className="schedule-item">
                        <div className="schedule-info">
                          <h4>{test.testName}</h4>
                          <p>{new Date(test.date).toLocaleDateString()} @ {test.hospitalName}</p>
                          <p>For: {test.familyMemberId ? test.familyMemberId.name : 'Self'}</p>
                          {test.resultDetails && <p style={{ fontSize: '13px' }}>{test.resultDetails}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'family' && (
            <div className="tab-view">
              <section className="card">
                <h3>👨‍👩‍👧‍👦 Family Management</h3>
                <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>Add family members to track their specific medicines and appointments.</p>
                
                <form onSubmit={handleAddFamilyMember} className="add-med-form grid-2-col-form">
                  <input type="text" placeholder="Member Name" value={newFamilyForm.name} onChange={e => setNewFamilyForm({ ...newFamilyForm, name: e.target.value })} required />
                  <input type="text" placeholder="Relation (e.g. Mother, Son)" value={newFamilyForm.relation} onChange={e => setNewFamilyForm({ ...newFamilyForm, relation: e.target.value })} required />
                  <button type="submit" className="btn-primary">Add Member</button>
                </form>
              </section>

              <section className="card">
                <h3>Family Members</h3>
                <div className="medicine-list">
                  {familyMembers.length === 0 ? <p className="empty-text">No family members added yet.</p> : familyMembers.map(member => (
                    <div key={member._id} className="medicine-item">
                      <div className="med-details">
                        <h4>{member.name}</h4>
                        <p>{member.relation}</p>
                      </div>
                      <button onClick={() => handleRemoveFamilyMember(member._id)} className="btn-danger">Remove</button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'med-details' && (
            <div className="tab-view">
              <section className="card">
                <h3>💊 Detailed Medicine Information</h3>
                <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>Get usage instructions, class, and side effects for any medicine.</p>
                
                <form onSubmit={handleGetMedDetails} className="add-med-form" style={{ gridTemplateColumns: '1fr auto' }}>
                  <input 
                    type="text" 
                    placeholder="Enter medicine name (e.g. Napa, Seclo, Metformin)" 
                    value={medSearchQuery} 
                    onChange={e => setMedSearchQuery(e.target.value)} 
                    required 
                  />
                  <button type="submit" className="btn-primary" disabled={medInfoLoading}>
                    {medInfoLoading ? 'Searching...' : '🔍 Get Details'}
                  </button>
                </form>
              </section>

              {medInfoError && (
                <section className="card">
                  <p className="danger-text" style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>
                    ⚠️ {medInfoError}
                  </p>
                </section>
              )}

              {medInfoResult && (
                <section className="card">
                  <h3 style={{ borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '4px' }}>
                    Results for: {medInfoResult.name}
                  </h3>
                  <div className="med-details-view" style={{ marginTop: '20px' }}>
                    <p style={{ marginBottom: '12px' }}><strong>🏷️ Class:</strong> {medInfoResult.class}</p>
                    <p style={{ marginBottom: '12px' }}><strong>📝 Usage:</strong> {medInfoResult.usage}</p>
                    <p style={{ marginBottom: '12px' }}>
                      <strong>🍽️ Meal Instructions:</strong> 
                      <span className={`badge ${medInfoResult.mealInstructions === 'Before Meal' ? 'warning' : 'safe'}`} style={{ marginLeft: '8px' }}>
                        {medInfoResult.mealInstructions}
                      </span>
                    </p>
                    <p style={{ marginBottom: '12px' }}><strong>⚠️ Side Effects:</strong> {medInfoResult.sideEffects}</p>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'alternates' && (
            <div className="tab-view">
              <section className="card">
                <h3>🔄 Find Alternate Medicines</h3>
                <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>Search for a medicine to find other brands with the same generic composition.</p>
                
                <form onSubmit={handleGetAlternates} className="add-med-form" style={{ gridTemplateColumns: '1fr auto' }}>
                  <input 
                    type="text" 
                    placeholder="Enter medicine name (e.g. Napa, Seclo, Sergel)" 
                    value={medSearchQuery} 
                    onChange={e => setMedSearchQuery(e.target.value)} 
                    required 
                  />
                  <button type="submit" className="btn-primary" disabled={medInfoLoading}>
                    {medInfoLoading ? 'Searching...' : '🔍 Find Alternates'}
                  </button>
                </form>
              </section>

              {medInfoError && (
                <section className="card">
                  <p className="danger-text" style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>
                    ⚠️ {medInfoError}
                  </p>
                </section>
              )}

              {medInfoResult && (
                <section className="card">
                  <h3 style={{ borderBottom: '2px solid var(--success)', display: 'inline-block', paddingBottom: '4px' }}>
                    Alternates for: {medInfoResult.name}
                  </h3>
                  <p style={{ margin: '20px 0 16px', color: 'var(--text-muted)', fontSize: '14px' }}>The following brands have the same composition:</p>
                  <div className="alternate-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {medInfoResult.alternates.map(alt => (
                      <span key={alt} className="badge safe" style={{ padding: '8px 16px', fontSize: '14px' }}>
                        {alt}
                      </span>
                    ))}
                  </div>
                  <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--danger)', fontStyle: 'italic' }}>
                    * Always consult a doctor before switching brands.
                  </p>
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
