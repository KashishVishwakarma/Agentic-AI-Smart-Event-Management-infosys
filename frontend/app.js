// --- Application State ---
let API_BASE_URL = localStorage.getItem('API_BASE_URL') || 'https://smart-event-backend.onrender.com';
let token = localStorage.getItem('token') || null;
let isRegisterMode = false;
let sessionId = localStorage.getItem('session_id') || ('sess_' + Math.random().toString(36).substring(2, 9));
localStorage.setItem('session_id', sessionId);

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('apiEndpointInput').value = API_BASE_URL;
  lucide.createIcons();
  updateAuthUI();
  checkBackendHealth();
  loadEvents();
});

// --- Health Check ---
async function checkBackendHealth() {
  const statusEl = document.getElementById('statBackendStatus');
  try {
    const res = await fetch(`${API_BASE_URL}/`, { cache: 'no-store' });
    if (res.ok) {
      statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> Online (Ready)`;
      statusEl.className = 'text-sm font-semibold text-emerald-600 flex items-center gap-1.5';
    } else {
      throw new Error();
    }
  } catch (err) {
    statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> Sleeping / Starting up...`;
    statusEl.className = 'text-sm font-semibold text-amber-600 flex items-center gap-1.5';
  }
}

// --- Tab Switching ---
function switchTab(tabId) {
  document.getElementById('tabExplore').classList.add('hidden');
  document.getElementById('tabChat').classList.add('hidden');
  document.getElementById('tabMyEvents').classList.add('hidden');

  ['tabBtnExplore', 'tabBtnChat', 'tabBtnMyEvents'].forEach(id => {
    document.getElementById(id).className = 'pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2';
  });

  if (tabId === 'explore') {
    document.getElementById('tabExplore').classList.remove('hidden');
    document.getElementById('tabBtnExplore').className = 'pb-3 border-b-2 border-indigo-600 text-indigo-600 font-semibold flex items-center gap-2';
  } else if (tabId === 'chat') {
    document.getElementById('tabChat').classList.remove('hidden');
    document.getElementById('tabBtnChat').className = 'pb-3 border-b-2 border-indigo-600 text-indigo-600 font-semibold flex items-center gap-2';
  } else if (tabId === 'my-events') {
    document.getElementById('tabMyEvents').classList.remove('hidden');
    document.getElementById('tabBtnMyEvents').className = 'pb-3 border-b-2 border-indigo-600 text-indigo-600 font-semibold flex items-center gap-2';
    loadMyRegistrations();
  }
  lucide.createIcons();
}

// --- Event Listing ---
async function loadEvents() {
  const container = document.getElementById('eventsContainer');
  container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400">Loading events...</div>';

  try {
    const res = await fetch(`${API_BASE_URL}/api/events`);
    if (!res.ok) throw new Error();
    const events = await res.json();
    document.getElementById('statTotalEvents').textContent = events.length;

    if (events.length === 0) {
      container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400">No events currently scheduled.</div>';
      return;
    }

    container.innerHTML = events.map(event => `
      <div class="glass-card rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
        <div class="space-y-3">
          <div class="flex justify-between items-start">
            <span class="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">Event #${event.id}</span>
            <span class="text-xs px-2.5 py-1 rounded-lg ${event.status === 'SCHEDULED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'} font-medium">
              ${event.status}
            </span>
          </div>
          <h3 class="text-lg font-bold text-slate-800 line-clamp-1">${escapeHtml(event.title)}</h3>
          <p class="text-xs text-slate-500 line-clamp-2">${escapeHtml(event.description || 'No description provided.')}</p>
          <div class="pt-2 space-y-1.5 text-xs text-slate-600">
            <div class="flex items-center gap-2">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>${event.date} at ${event.time}</span>
            </div>
            <div class="flex items-center gap-2">
              <i data-lucide="users" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>Capacity: ${event.capacity} seats</span>
            </div>
          </div>
        </div>
        <div class="pt-5 mt-4 border-t border-slate-100">
          <button onclick="registerForEvent(${event.id})" class="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2">
            <span>Book Seat</span>
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-rose-500">Failed to load events.</div>`;
  }
}

// --- Book Event ---
async function registerForEvent(eventId) {
  if (!token) {
    openAuthModal();
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ event_id: eventId })
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Success: Registered for event #${eventId}`);
    } else {
      alert(`Notice: ${data.detail || 'Registration failed'}`);
    }
  } catch (err) {
    alert('Server unreachable.');
  }
}

// --- AI Agent Chat ---
async function handleSendChat(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  appendUserMessage(message);

  const bubbleId = 'load-' + Date.now();
  appendLoadingBubble(bubbleId);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ message: message, session_id: sessionId })
    });

    document.getElementById(bubbleId)?.remove();
    if (!res.ok) throw new Error();

    const agentData = await res.json();
    appendAgentResponse(agentData);
  } catch (err) {
    document.getElementById(bubbleId)?.remove();
    appendErrorMessage('Agent unavailable. Please ensure backend is awake.');
  }
}

function appendUserMessage(text) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'flex justify-end gap-3';
  div.innerHTML = `<div class="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-lg text-sm shadow-sm">${escapeHtml(text)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendLoadingBubble(id) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.id = id;
  div.className = 'flex gap-3 max-w-lg';
  div.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0"><i data-lucide="bot" class="w-4 h-4"></i></div>
    <div class="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-slate-200 text-xs text-slate-400 flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-violet-400 animate-ping"></span> Thinking & executing tools...
    </div>`;
  container.appendChild(div);
  lucide.createIcons();
  container.scrollTop = container.scrollHeight;
}

function appendAgentResponse(data) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'flex gap-3 max-w-2xl';

  let toolBadges = '';
  if (data.tools_used && data.tools_used.length > 0) {
    toolBadges = `
      <div class="pt-2 flex flex-wrap gap-1.5 border-t border-slate-100 mt-2">
        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Tools Run:</span>
        ${data.tools_used.map(t => `<span class="px-2 py-0.5 rounded text-[11px] font-mono bg-violet-50 text-violet-700 border border-violet-100">${t}</span>`).join('')}
      </div>`;
  }

  div.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0"><i data-lucide="bot" class="w-4 h-4"></i></div>
    <div class="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-slate-200 text-sm space-y-2">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wide">Intent: ${data.detected_intent || 'GENERAL'}</span>
      </div>
      <div class="text-slate-800 whitespace-pre-line">${escapeHtml(data.reply)}</div>
      ${toolBadges}
    </div>`;
  container.appendChild(div);
  lucide.createIcons();
  container.scrollTop = container.scrollHeight;
}

function appendErrorMessage(msg) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'flex gap-3 max-w-lg';
  div.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"><i data-lucide="alert-circle" class="w-4 h-4"></i></div>
    <div class="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-rose-200 text-xs text-rose-600">${msg}</div>`;
  container.appendChild(div);
  lucide.createIcons();
  container.scrollTop = container.scrollHeight;
}

function clearChat() {
  document.getElementById('chatMessages').innerHTML = '<div class="text-center py-4 text-xs text-slate-400">Chat cleared.</div>';
}

// --- Auth Handling ---
function updateAuthUI() {
  const nav = document.getElementById('authNavContainer');
  if (token) {
    nav.innerHTML = `<button onclick="handleLogout()" class="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition">Sign Out</button>`;
  } else {
    nav.innerHTML = `<button onclick="openAuthModal()" class="text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition">Sign In</button>`;
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  try {
    if (isRegisterMode) {
      const name = document.getElementById('authName').value;
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: 'USER' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      alert('Registered! Please login.');
      toggleAuthMode();
    } else {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid credentials');
      token = data.access_token;
      localStorage.setItem('token', token);
      closeAuthModal();
      updateAuthUI();
      alert('Logged in successfully!');
    }
  } catch (err) {
    alert(err.message);
  }
}

function handleLogout() {
  token = null;
  localStorage.removeItem('token');
  updateAuthUI();
  alert('Logged out.');
}

// --- Registrations ---
async function loadMyRegistrations() {
  const container = document.getElementById('myRegistrationsContainer');
  if (!token) {
    container.innerHTML = '<div class="text-center py-12 bg-white rounded-2xl border border-slate-200"><p class="text-slate-500 text-sm">Please sign in to view bookings.</p></div>';
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/registrations/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">No active bookings found.</div>';
      return;
    }
    container.innerHTML = data.map(reg => `
      <div class="glass-card rounded-xl p-4 flex justify-between items-center shadow-sm border border-slate-200">
        <div>
          <h4 class="font-bold text-slate-800 text-sm">Event ID #${reg.event_id}</h4>
          <p class="text-xs text-slate-400">Status: <span class="text-emerald-600 font-semibold">${reg.status}</span></p>
        </div>
        <button onclick="cancelRegistration(${reg.event_id})" class="text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition">Cancel Ticket</button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="text-center py-8 text-rose-500">Failed to load bookings.</div>';
  }
}

async function cancelRegistration(eventId) {
  if (!confirm('Cancel this registration?')) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/registrations/${eventId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      alert('Cancelled.');
      loadMyRegistrations();
    }
  } catch (err) {
    alert('Server error.');
  }
}

// --- Modals & Helpers ---
function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }
function openConfigModal() { document.getElementById('configModal').classList.remove('hidden'); }
function closeConfigModal() { document.getElementById('configModal').classList.add('hidden'); }

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  document.getElementById('nameFieldContainer').classList.toggle('hidden', !isRegisterMode);
  document.getElementById('authModalTitle').textContent = isRegisterMode ? 'Register' : 'Sign In';
  document.getElementById('authSubmitBtn').textContent = isRegisterMode ? 'Sign Up' : 'Sign In';
  document.getElementById('authToggleText').textContent = isRegisterMode ? 'Already registered?' : "Need an account?";
  document.getElementById('authToggleBtn').textContent = isRegisterMode ? 'Login' : 'Register';
}

function saveApiEndpoint() {
  const val = document.getElementById('apiEndpointInput').value.trim();
  if (val) {
    API_BASE_URL = val.replace(/\/+$/, '');
    localStorage.setItem('API_BASE_URL', API_BASE_URL);
    closeConfigModal();
    checkBackendHealth();
    loadEvents();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
