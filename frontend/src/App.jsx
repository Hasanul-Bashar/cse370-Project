import { useState, useEffect } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [medicines, setMedicines] = useState([]);
  
  // Auth State
  const [user, setUser] = useState(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMedForm, setNewMedForm] = useState({ name: '', dose: '', frequency: '', total_quantity: '' });

  useEffect(() => {
    if (user) {
      // Fetch medicines only if logged in
      fetch('http://localhost:5000/api/medicines')
        .then(res => res.json())
        .then(data => setMedicines(data))
        .catch(err => console.error("Error fetching medicines", err));
    }
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
        // Clear auth form
        setAuthForm({ name: '', email: '', password: '' });
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to connect to the server.");
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
        setIsModalOpen(false);
        setNewMedForm({ name: '', dose: '', frequency: '', total_quantity: '' });
        // Refresh medicines
        fetch('http://localhost:5000/api/medicines')
          .then(res => res.json())
          .then(data => setMedicines(data));
      } else {
        alert('Error saving medicine');
      }
    } catch (err) {
      alert("Failed to connect to server.");
    }
  };

  // If user is NOT logged in, show Auth Screen
  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#fff', backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(14, 165, 233, 0.15) 0%, transparent 50%), radial-gradient(circle at 85% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.9)', padding: '40px', borderRadius: '16px', width: '400px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <i className="ri-heart-pulse-fill" style={{ fontSize: '48px', color: '#0ea5e9', filter: 'drop-shadow(0 0 8px rgba(14, 165, 233, 0.6))' }}></i>
            <h2 style={{ color: '#0ea5e9', marginTop: '10px' }}>
              {isLoginView ? 'Welcome Back' : 'Create Account'}
            </h2>
          </div>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isLoginView && (
              <input 
                type="text" 
                placeholder="Full Name" 
                value={authForm.name}
                onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                required
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.5)', color: '#fff' }}
              />
            )}
            <input 
              type="email" 
              placeholder="Email" 
              value={authForm.email}
              onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
              required
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.5)', color: '#fff' }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={authForm.password}
              onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
              required
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.5)', color: '#fff' }}
            />
            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px', justifyContent: 'center' }}>
              {isLoginView ? 'Login' : 'Sign Up'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#94a3b8' }}>
            {isLoginView ? "Don't have an account? " : "Already have an account? "}
            <span style={{ color: '#0ea5e9', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setIsLoginView(!isLoginView)}>
              {isLoginView ? 'Sign up here' : 'Login here'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // If user IS logged in, show Full App
  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <i className="ri-heart-pulse-fill"></i>
          <span>MediTrack</span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <i className="ri-dashboard-line"></i> Dashboard
          </button>
          <button className={`nav-item ${activeTab === 'medicines' ? 'active' : ''}`} onClick={() => setActiveTab('medicines')}>
            <i className="ri-capsule-fill"></i> Medicines
          </button>
          <button className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
            <i className="ri-calendar-event-line"></i> Appointments
          </button>
          <button className={`nav-item ${activeTab === 'family' ? 'active' : ''}`} onClick={() => setActiveTab('family')}>
            <i className="ri-team-line"></i> Family
          </button>
          <button className={`nav-item ${activeTab === 'symptoms' ? 'active' : ''}`} onClick={() => setActiveTab('symptoms')}>
            <i className="ri-stethoscope-line"></i> Symptoms
          </button>
          <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            <i className="ri-file-chart-line"></i> Reports
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-profile" onClick={() => { if(window.confirm('Logout?')) setUser(null); }}>
            <img src={`https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}&background=2563eb&color=fff`} alt="User" />
            <div className="user-info">
              <h4>{user.name}</h4>
              <p>Log Out</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="search-bar">
            <i className="ri-search-line"></i>
            <input type="text" placeholder="Search medicines, appointments..." />
          </div>
          <div className="topbar-actions">
            <button className="icon-btn notification-btn">
              <i className="ri-notification-3-line"></i>
              <span className="badge">3</span>
            </button>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <i className="ri-add-line"></i> Add Medicine
            </button>
          </div>
        </header>

        <div className="views-container">
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="view">
              <div className="welcome-banner">
                <div className="welcome-text">
                  <h2>Good Morning, {user.name.split(' ')[0]}! 👋</h2>
                  <p>Here's your health summary for today. You have {medicines.length} active medicines and 1 upcoming appointment.</p>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="card schedule-card">
                  <div className="card-header">
                    <h3>Today's Schedule</h3>
                    <a href="#viewall" style={{color: '#0ea5e9'}}>View All</a>
                  </div>
                  <div className="schedule-list">
                    {medicines.length === 0 ? (
                      <p style={{color: '#94a3b8'}}>No medicines scheduled for today.</p>
                    ) : (
                      medicines.slice(0,3).map((med, idx) => (
                        <div key={idx} className="schedule-item status-pending">
                          <div className="time">08:00 AM</div>
                          <div className="details">
                            <h4>{med.medicineId?.name || "Medicine"} ({med.dose})</h4>
                            <p>1 Pill • {med.frequency}</p>
                          </div>
                          <button className="action-btn check" onClick={(e) => {
                            e.currentTarget.className="action-btn checked";
                            e.currentTarget.innerHTML="<i class='ri-check-double-line'></i>";
                          }}><i className="ri-check-line"></i></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="card alerts-card">
                  <div className="card-header">
                    <h3>Refill Alerts</h3>
                  </div>
                  <div className="alert-list">
                    {medicines.filter(m => m.remainingQuantity <= 5).map((med, idx) => (
                      <div key={idx} className="alert-item warning">
                        <div className="alert-icon"><i className="ri-error-warning-line"></i></div>
                        <div className="alert-text">
                          <h4>{med.medicineId?.name} Running Low</h4>
                          <p>Only {med.remainingQuantity} pills remaining</p>
                        </div>
                        <button className="btn btn-sm btn-outline">Refill</button>
                      </div>
                    ))}
                    {medicines.filter(m => m.remainingQuantity <= 5).length === 0 && (
                      <p style={{color: '#94a3b8'}}>No refill alerts!</p>
                    )}
                  </div>
                </div>

                <div className="stats-container">
                  <div className="stat-card blue">
                    <div className="stat-icon"><i className="ri-capsule-line"></i></div>
                    <div className="stat-info">
                      <h3>{medicines.length}</h3>
                      <p>Active Medicines</p>
                    </div>
                  </div>
                  <div className="stat-card purple">
                    <div className="stat-icon"><i className="ri-team-line"></i></div>
                    <div className="stat-info">
                      <h3>3</h3>
                      <p>Family Members</p>
                    </div>
                  </div>
                  <div className="stat-card green">
                    <div className="stat-icon"><i className="ri-heart-pulse-line"></i></div>
                    <div className="stat-info">
                      <h3>95%</h3>
                      <p>Adherence Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Medicines View */}
          {activeTab === 'medicines' && (
            <div className="view">
              <div className="view-header">
                <h2>Medicine Management</h2>
                <div className="view-actions">
                  <button className="btn btn-outline"><i className="ri-filter-3-line"></i> Filter</button>
                  <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><i className="ri-add-line"></i> Add New</button>
                </div>
              </div>
              
              <div className="medicines-grid">
                {medicines.length === 0 ? <p style={{color: '#94a3b8'}}>You haven't added any medicines yet.</p> : medicines.map((med, i) => (
                  <div key={i} className="medicine-card">
                    <div className="med-header">
                      <div className="med-icon"><i className="ri-capsule-fill"></i></div>
                      <span className="badge info">Medicine</span>
                    </div>
                    <h3 className="med-name">{med.medicineId?.name || "Unknown"} <span className="dosage">{med.dose}</span></h3>
                    <p className="med-instruction">{med.frequency}</p>
                    
                    <div className="med-progress">
                      <div className="progress-info">
                        <span>Stock Level</span>
                        <span className={med.remainingQuantity <= 5 ? "text-warning" : "text-success"}>
                          {med.remainingQuantity} / {med.totalQuantity} left
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className={`progress-fill ${med.remainingQuantity <= 5 ? "bg-warning" : "bg-success"}`} 
                          style={{width: `${Math.min(100, (med.remainingQuantity / med.totalQuantity) * 100)}%`}}>
                        </div>
                      </div>
                    </div>
                    
                    <div className="med-actions">
                      <button className="btn-icon"><i className="ri-information-line"></i></button>
                      <button className="btn-icon"><i className="ri-edit-line"></i></button>
                      <button className="btn-icon text-danger"><i className="ri-delete-bin-line"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointments View */}
          {activeTab === 'appointments' && (
            <div className="view">
              <div className="view-header">
                <h2>Appointments & Lab Tests</h2>
                <div className="view-actions">
                  <button className="btn btn-primary"><i className="ri-add-line"></i> Book</button>
                </div>
              </div>
              <div className="dashboard-grid">
                <div className="card">
                  <div className="card-header"><h3>Upcoming</h3></div>
                  <div className="appointment-list">
                    <div className="appointment-item">
                      <div className="date-box">
                        <span className="month">MAY</span>
                        <span className="day">15</span>
                      </div>
                      <div className="appointment-details">
                        <h4>Dr. Sarah Smith</h4>
                        <p>General Checkup • 10:00 AM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Family View */}
          {activeTab === 'family' && (
            <div className="view">
              <div className="view-header">
                <h2>Family Members</h2>
                <div className="view-actions">
                  <button className="btn btn-primary"><i className="ri-add-line"></i> Add</button>
                </div>
              </div>
              <div className="medicines-grid">
                <div className="medicine-card" style={{textAlign: 'center', padding: '32px'}}>
                  <img src="https://ui-avatars.com/api/?name=Jane+Doe&background=8b5cf6&color=fff" alt="Jane" style={{width: '80px', height: '80px', borderRadius: '50%', marginBottom: '16px'}} />
                  <h3 className="med-name" style={{justifyContent: 'center'}}>Jane Doe</h3>
                  <p className="med-instruction">Wife</p>
                  <button className="btn btn-outline" style={{width: '100%', marginTop: '24px', justifyContent: 'center'}}>View Tracking</button>
                </div>
              </div>
            </div>
          )}

          {/* Symptoms View */}
          {activeTab === 'symptoms' && (
            <div className="view">
              <div className="view-header">
                <h2>Symptom Checker</h2>
                <div className="view-actions">
                  <button className="btn btn-primary"><i className="ri-add-line"></i> Log</button>
                </div>
              </div>
              <div className="card">
                <div className="schedule-list">
                  <div className="schedule-item">
                    <div className="details">
                      <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                        <span className="badge warning" style={{position:'static'}}>Mild</span>
                        <span className="badge" style={{position:'static', background:'rgba(255,255,255,0.1)'}}>Headache</span>
                      </div>
                      <p>Recommendation: Drink water, rest. Take Paracetamol if pain persists.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reports View */}
          {activeTab === 'reports' && (
            <div className="view">
              <div className="view-header">
                <h2>Weekly Reports</h2>
              </div>
              <div className="card">
                <div className="card-header"><h3>Adherence Rate</h3></div>
                <h1 style={{color: '#10b981', textAlign: 'center', fontSize: '64px'}}>95%</h1>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Add Medicine Modal */}
      {isModalOpen && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Medicine</h2>
              <button className="close-modal" onClick={() => setIsModalOpen(false)}><i className="ri-close-line"></i></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddMedicine}>
                <div className="form-group">
                  <label>Medicine Name</label>
                  <input type="text" value={newMedForm.name} onChange={e => setNewMedForm({...newMedForm, name: e.target.value})} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Dosage</label>
                    <input type="text" value={newMedForm.dose} onChange={e => setNewMedForm({...newMedForm, dose: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Total Quantity</label>
                    <input type="number" value={newMedForm.total_quantity} onChange={e => setNewMedForm({...newMedForm, total_quantity: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Frequency</label>
                  <select value={newMedForm.frequency} onChange={e => setNewMedForm({...newMedForm, frequency: e.target.value})}>
                    <option value="">Select...</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="As needed">As needed</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
