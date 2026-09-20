// --- Hardcoded Backend API Endpoint ---

const API_BASE = "https://agentic-ai-smart-event-management-infosys.onrender.com";

// --- State Variables ---
let authToken = localStorage.getItem('pulse_token') || null;
let currentUser = JSON.parse(localStorage.getItem('pulse_user') || 'null');
let isRegisterMode = false;
let allVenues = [];
let currentSessionId = localStorage.getItem('pulse_sess') || ('sess_' + Math.random().toString(36).slice(2, 9));
localStorage.setItem('pulse_sess', currentSessionId);

// --- App Bootstrap ---
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  updateAuthUI();
  loadEvents();
  loadVenues();
});

// --- Centralized API Request Handler (Exact 1:1 match for your /api routes) ---
async function apiRequest(endpoint, options = {}) {
  options.headers = options.headers || {};
  
  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  const cleanPath = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  const url = `${API_BASE}/api${cleanPath}`;

  try {
    const res = await fetch(url, options);
    return res;
  } catch (err) {
    console.error("Network error accessing:", url, err);
    throw err;
  }
}

// --- Navigation Tabs ---
function navigate(view) {
  ['explore', 'venues', 'chat', 'tickets'].forEach(v => {
    const pane = document.getElementById(`view-${v}`);
    if (pane) pane.classList.add('hidden');
    const btn = document.getElementById(`nav-${v}`);
    if (btn) btn.className = "px-4 py-2 rounded-full text-slate-600 hover:text-slate-900 transition flex items-center gap-1";
  });

  const activePane = document.getElementById(`view-${view}`);
  if (activePane) activePane.classList.remove('hidden');

  const activeBtn = document.getElementById(`nav-${view}`);
  if (activeBtn) activeBtn.className = "px-4 py-2 rounded-full bg-white text-slate-900 shadow-sm transition flex items-center gap-1";

  if (view === 'tickets') loadMyTickets();
  if (view === 'venues') loadVenues();
  if (view === 'explore') loadEvents();
  if (window.lucide) lucide.createIcons();
}

// --- Modal Control ---
function toggleModal(id, show) {
  const m = document.getElementById(id);
  if (m) m.classList.toggle('hidden', !show);
}

function openCreateModal(type) {
  if (!authToken) {
    showToast('Please sign in as Admin to manage events or venues', 'info');
    toggleModal('authModal', true);
    return;
  }

  if (type === 'venue') {
    toggleModal('venueModal', true);
  } else if (type === 'event') {
    populateVenueDropdown();
    toggleModal('eventModal', true);
  }
}

// --- Events Handler (GET /api/events, POST /api/events, POST /api/events/{id}/register) ---
async function loadEvents() {
  const container = document.getElementById('eventsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full py-16 text-center text-slate-400">
      <div class="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs font-medium">Loading events from database...</p>
    </div>
  `;

  try {
    const res = await apiRequest('/events');
    if (!res.ok) throw new Error();
    const events = await res.json();

    if (!events || events.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <i data-lucide="calendar-x" class="w-6 h-6"></i>
          </div>
          <h3 class="font-bold text-slate-800 text-sm">No Events Scheduled</h3>
          <p class="text-xs text-slate-500 mt-1 mb-4">Be the first to publish an event.</p>
          <button onclick="openCreateModal('event')" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Create Event</button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = events.map(e => `
      <div class="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">Event #${e.id}</span>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${e.status === 'SCHEDULED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
              ${e.status || 'SCHEDULED'}
            </span>
          </div>
          <h3 class="font-bold text-base text-slate-900 leading-snug">${escapeHtml(e.title)}</h3>
          <p class="text-xs text-slate-500 line-clamp-2">${escapeHtml(e.description || 'No description provided.')}</p>
          
          <div class="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div class="flex items-center gap-2">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>${e.date || 'TBA'} at ${e.time || 'TBA'}</span>
            </div>
            <div class="flex items-center gap-2">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>${e.venue_id ? `Venue #${e.venue_id}` : 'General Campus'}</span>
            </div>
            <div class="flex items-center gap-2">
              <i data-lucide="users" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>Capacity: ${e.capacity || 100} seats</span>
            </div>
          </div>
        </div>

        <div class="pt-5 mt-4">
          <button onclick="bookSeat(${e.id})" class="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5">
            <span>Book Seat</span>
            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center bg-rose-50 rounded-3xl border border-rose-100 p-8">
        <p class="text-xs font-semibold text-rose-600">Failed to load events. Render service might be spinning up—click Refresh in a moment.</p>
      </div>
    `;
  }
}

// POST /api/events (Admin Protected)
async function handleCreateEvent(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('eTitle').value.trim(),
    description: document.getElementById('eDesc').value.trim(),
    date: document.getElementById('eDate').value,
    time: document.getElementById('eTime').value,
    capacity: parseInt(document.getElementById('eCapacity').value, 10),
    venue_id: document.getElementById('eVenueSelect').value ? parseInt(document.getElementById('eVenueSelect').value, 10) : null
  };

  try {
    const res = await apiRequest('/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Event creation failed. Make sure you are logged in as an ADMIN.');
    showToast('Event published successfully!', 'success');
    toggleModal('eventModal', false);
    e.target.reset();
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// POST /api/events/{event_id}/register
async function bookSeat(eventId) {
  if (!authToken) {
    showToast('Please sign in to register for events', 'info');
    toggleModal('authModal', true);
    return;
  }

  try {
    const res = await apiRequest(`/events/${eventId}/register`, {
      method: 'POST'
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Registered successfully for Event #${eventId}!`, 'success');
    } else {
      showToast(data.detail || 'Registration failed', 'error');
    }
  } catch (err) {
    showToast('Server error while registering', 'error');
  }
}

// --- Venues Handler (GET /api/venues, POST /api/venues) ---
async function loadVenues() {
  const container = document.getElementById('venuesContainer');
  try {
    const res = await apiRequest('/venues');
    if (!res.ok) throw new Error();
    allVenues = await res.json();

    if (!container) return;
    if (!allVenues || allVenues.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
          <p class="text-xs text-slate-500 mb-3">No venues registered in database.</p>
          <button onclick="openCreateModal('venue')" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Add Venue (Admin)</button>
        </div>
      `;
      return;
    }

    container.innerHTML = allVenues.map(v => `
      <div class="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">Venue #${v.id}</span>
            <span class="text-xs text-slate-500 font-medium">Capacity: ${v.capacity} seats</span>
          </div>
          <h3 class="font-bold text-base text-slate-900">${escapeHtml(v.name)}</h3>
          <p class="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
            <span>${escapeHtml(v.address || 'Campus Grounds')}</span>
          </p>
        </div>
      </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    if (container) container.innerHTML = `<div class="col-span-full text-center py-10 text-xs text-rose-500">Failed to load venues.</div>`;
  }
}

// POST /api/venues (Admin Protected)
async function handleCreateVenue(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('vName').value.trim(),
    address: document.getElementById('vAddress').value.trim(),
    capacity: parseInt(document.getElementById('vCapacity').value, 10)
  };

  try {
    const res = await apiRequest('/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create venue. Requires ADMIN role.');
    showToast('Venue registered successfully!', 'success');
    toggleModal('venueModal', false);
    e.target.reset();
    loadVenues();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function populateVenueDropdown() {
  const sel = document.getElementById('eVenueSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- No Venue --</option>';
  allVenues.forEach(v => {
    sel.innerHTML += `<option value="${v.id}">${v.name} (Cap: ${v.capacity})</option>`;
  });
}

// --- AI Chat Agent (POST /api/chat) ---
async function handleSendChat(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  if (!authToken) {
    showToast('Please sign in before chatting with the AI agent', 'info');
    toggleModal('authModal', true);
    return;
  }

  input.value = '';
  appendUserBubble(text);

  const loadingId = 'loader_' + Date.now();
  appendThinkingBubble(loadingId);

  try {
    const res = await apiRequest('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: currentSessionId })
    });

    document.getElementById(loadingId)?.remove();
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || 'Chat failed');
    }
    const data = await res.json();
    appendAgentBubble(data);
  } catch (err) {
    document.getElementById(loadingId)?.remove();
    appendErrorBubble(err.message || 'AI agent error. Verify you are logged in.');
  }
}

function quickPrompt(str) {
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = str;
    handleSendChat(new Event('submit'));
  }
}

function appendUserBubble(msg) {
  const stream = document.getElementById('chatStream');
  const div = document.createElement('div');
  div.className = "flex justify-end";
  div.innerHTML = `<div class="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 text-xs max-w-sm shadow-sm">${escapeHtml(msg)}</div>`;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
}

function appendThinkingBubble(id) {
  const stream = document.getElementById('chatStream');
  const div = document.createElement('div');
  div.id = id;
  div.className = "flex gap-2.5 items-center text-slate-400 text-xs italic";
  div.innerHTML = `<div class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div> AI Agent is reasoning...`;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
}

function appendAgentBubble(data) {
  const stream = document.getElementById('chatStream');
  const div = document.createElement('div');
  div.className = "flex gap-3 max-w-md";

  div.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
      <i data-lucide="bot" class="w-4 h-4"></i>
    </div>
    <div class="bg-white border border-slate-200/80 rounded-2xl rounded-tl-none p-4 text-xs text-slate-700 shadow-sm leading-relaxed space-y-2">
      <div class="whitespace-pre-line">${escapeHtml(data.reply)}</div>
    </div>
  `;
  stream.appendChild(div);
  if (window.lucide) lucide.createIcons();
  stream.scrollTop = stream.scrollHeight;
}

function appendErrorBubble(msg) {
  const stream = document.getElementById('chatStream');
  const div = document.createElement('div');
  div.className = "text-xs text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100";
  div.textContent = msg;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
}

function clearChat() {
  const stream = document.getElementById('chatStream');
  if (stream) stream.innerHTML = `<div class="text-center py-4 text-xs text-slate-400">Conversation reset.</div>`;
}

// --- My Passes / Registrations (GET /api/registrations/me, DELETE /api/events/{id}/register) ---
async function loadMyTickets() {
  const container = document.getElementById('ticketsContainer');
  if (!authToken) {
    container.innerHTML = `
      <div class="text-center py-14 bg-white rounded-3xl border border-slate-200/80 p-6">
        <h3 class="font-bold text-slate-800 text-sm">Sign in to view your tickets</h3>
        <p class="text-xs text-slate-500 mt-1 mb-4">Authentication is required to view your registrations.</p>
        <button onclick="toggleModal('authModal', true)" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Sign In</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="text-center py-12 text-xs text-slate-400">Loading your registrations...</div>`;

  try {
    const res = await apiRequest('/registrations/me');
    if (!res.ok) throw new Error();
    const tickets = await res.json();

    if (!tickets || tickets.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 bg-white rounded-3xl border border-slate-200/80 p-6">
          <p class="text-xs text-slate-500">You do not have any registered events yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tickets.map(t => `
      <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
        <div>
          <span class="font-bold text-slate-900 text-sm">Registration for Event #${t.event_id}</span>
          <span class="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">${t.status || 'CONFIRMED'}</span>
        </div>
        <button onclick="cancelTicket(${t.event_id})" class="text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition font-medium">
          Cancel Ticket
        </button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="text-center py-8 text-xs text-rose-500">Failed to load registrations.</div>`;
  }
}

async function cancelTicket(eventId) {
  if (!confirm(`Are you sure you want to cancel your registration for Event #${eventId}?`)) return;
  try {
    const res = await apiRequest(`/events/${eventId}/register`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('Registration successfully cancelled', 'info');
      loadMyTickets();
    } else {
      showToast(data.detail || 'Cancellation failed', 'error');
    }
  } catch (err) {
    showToast('Network error while canceling', 'error');
  }
}

// --- Authentication (POST /api/auth/register, POST /api/auth/login, GET /api/auth/me) ---
function updateAuthUI() {
  const slot = document.getElementById('navAuthSlot');
  if (authToken) {
    slot.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold text-slate-600 hidden sm:inline">${currentUser ? currentUser.email : 'Signed In'}</span>
        <button onclick="logout()" class="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition">
          Sign Out
        </button>
      </div>
    `;
  } else {
    slot.innerHTML = `
      <button onclick="toggleModal('authModal', true)" class="px-5 py-2.5 rounded-full text-xs font-bold bg-slate-900 hover:bg-indigo-600 text-white shadow-sm transition">
        Sign In
      </button>
    `;
  }
}

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  document.getElementById('nameInputGroup').classList.toggle('hidden', !isRegisterMode);
  document.getElementById('authTitle').textContent = isRegisterMode ? 'Create Account' : 'Welcome Back';
  document.getElementById('authSubtitle').textContent = isRegisterMode ? 'Sign up to register for events' : 'Sign in using your account or admin credentials';
  document.getElementById('authSubmitBtn').textContent = isRegisterMode ? 'Register' : 'Sign In';
  document.getElementById('authSwitchText').textContent = isRegisterMode ? 'Already have an account?' : "Don't have an account?";
  document.getElementById('authSwitchBtn').textContent = isRegisterMode ? 'Sign In' : 'Create Account';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  try {
    if (isRegisterMode) {
      const name = document.getElementById('authName').value.trim();
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: 'USER' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      showToast('Registration successful! Please sign in.', 'success');
      toggleAuthMode();
    } else {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid email or password');
      authToken = data.access_token;
      localStorage.setItem('pulse_token', authToken);

      // Fetch user profile
      try {
        const meRes = await apiRequest('/auth/me');
        if (meRes.ok) {
          currentUser = await meRes.json();
          localStorage.setItem('pulse_user', JSON.stringify(currentUser));
        }
      } catch (err) {}

      toggleModal('authModal', false);
      updateAuthUI();
      showToast('Signed in successfully!', 'success');
      loadMyTickets();
    }
  } catch (err) {
    showToast(err.message || 'Failed to communicate with backend', 'error');
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('pulse_token');
  localStorage.removeItem('pulse_user');
  updateAuthUI();
  navigate('explore');
  showToast('Signed out', 'info');
}

// --- Notifications / Toast ---
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `px-4 py-3 rounded-2xl text-xs font-semibold shadow-lg pointer-events-auto border transition duration-200 animate-in fade-in slide-in-from-bottom-2 ${
    type === 'success' ? 'bg-slate-900 text-white border-slate-800' :
    type === 'error' ? 'bg-rose-600 text-white border-rose-700' :
    'bg-white text-slate-800 border-slate-200'
  }`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
