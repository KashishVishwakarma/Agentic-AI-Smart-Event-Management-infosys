// --- Backend Endpoint Binding ---
const API_BASE = "https://backend-event-3-toqe.onrender.com";

// --- State Variables ---
let authToken = localStorage.getItem('pulse_token') || null;
let isRegisterMode = false;
let currentSessionId = localStorage.getItem('pulse_sess') || ('session_' + Math.random().toString(36).slice(2, 9));
localStorage.setItem('pulse_sess', currentSessionId);

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  updateAuthUI();
  loadEvents();
});

// --- Smart API Request Handler ---
async function apiRequest(endpoint, options = {}) {
  options.headers = options.headers || {};
  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  // 1. Try with /api prefix
  let url = `${API_BASE}/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  let res = await fetch(url, options);

  // 2. If 404, gracefully fall back to direct endpoint
  if (res.status === 404) {
    url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    res = await fetch(url, options);
  }
  return res;
}

// --- Navigation ---
function navigate(view) {
  ['explore', 'chat', 'tickets'].forEach(v => {
    document.getElementById(`view-${v}`).classList.add('hidden');
    const btn = document.getElementById(`nav-${v}`);
    btn.className = "px-5 py-2 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5";
  });

  document.getElementById(`view-${view}`).classList.remove('hidden');
  document.getElementById(`nav-${view}`).className = "px-5 py-2 rounded-full text-xs font-semibold bg-white text-slate-900 shadow-sm transition flex items-center gap-1.5";

  if (view === 'tickets') loadMyTickets();
  lucide.createIcons();
}

// --- Events Explorer ---
async function loadEvents() {
  const container = document.getElementById('eventsContainer');
  container.innerHTML = `
    <div class="col-span-full py-16 text-center text-slate-400">
      <div class="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs font-medium">Retrieving scheduled events...</p>
    </div>
  `;

  try {
    const res = await apiRequest('/events');
    if (!res.ok) throw new Error('Failed to fetch events');
    const events = await res.json();

    if (!events || events.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <i data-lucide="calendar-x" class="w-6 h-6"></i>
          </div>
          <h3 class="font-bold text-slate-800 text-sm">No Events Scheduled Yet</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Upcoming events will populate here once added by organizers.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    container.innerHTML = events.map(e => `
      <div class="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">ID #${e.id}</span>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${e.status === 'SCHEDULED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
              ${e.status || 'Active'}
            </span>
          </div>
          <h3 class="font-bold text-base text-slate-900 leading-snug">${escapeHtml(e.title)}</h3>
          <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">${escapeHtml(e.description || 'No description provided.')}</p>
          
          <div class="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div class="flex items-center gap-2">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>${e.date || 'TBA'} at ${e.time || 'TBA'}</span>
            </div>
            <div class="flex items-center gap-2">
              <i data-lucide="users" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>Capacity: ${e.capacity || 100} seats</span>
            </div>
          </div>
        </div>

        <div class="pt-5 mt-4">
          <button onclick="bookSeat(${e.id})" class="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5">
            <span>Reserve Seat</span>
            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `).join('');

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center bg-rose-50 rounded-3xl border border-rose-100 p-8">
        <p class="text-xs font-semibold text-rose-600">Could not retrieve event roster. If the backend is waking up, click Refresh in 10 seconds.</p>
      </div>
    `;
  }
}

async function bookSeat(eventId) {
  if (!authToken) {
    showToast('Please sign in to reserve tickets', 'info');
    toggleAuthModal(true);
    return;
  }

  try {
    const res = await apiRequest('/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`Seat confirmed for Event #${eventId}!`, 'success');
    } else {
      showToast(data.detail || 'Reservation unsuccessful', 'error');
    }
  } catch (err) {
    showToast('Server communication error', 'error');
  }
}

// --- AI Concierge / Chat ---
async function handleSendChat(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

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
    if (!res.ok) throw new Error();
    const data = await res.json();
    appendAgentBubble(data);
  } catch (err) {
    document.getElementById(loadingId)?.remove();
    appendErrorBubble('Our assistant is currently experiencing high load. Please try again.');
  }
}

function quickPrompt(str) {
  document.getElementById('chatInput').value = str;
  handleSendChat(new Event('submit'));
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
  div.innerHTML = `<div class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div> Concierge is thinking...`;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
}

function appendAgentBubble(data) {
  const stream = document.getElementById('chatStream');
  const div = document.createElement('div');
  div.className = "flex gap-3 max-w-md";
  
  let tools = '';
  if (data.tools_used && data.tools_used.length) {
    tools = `<div class="pt-2 border-t border-slate-100 flex gap-1 items-center flex-wrap">
      <span class="text-[10px] uppercase font-bold text-slate-400">Action:</span>
      ${data.tools_used.map(t => `<span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-mono">${t}</span>`).join('')}
    </div>`;
  }

  div.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
      <i data-lucide="bot" class="w-4 h-4"></i>
    </div>
    <div class="bg-white border border-slate-200/80 rounded-2xl rounded-tl-none p-4 text-xs text-slate-700 shadow-sm leading-relaxed space-y-2">
      <div class="whitespace-pre-line">${escapeHtml(data.reply)}</div>
      ${tools}
    </div>
  `;
  stream.appendChild(div);
  lucide.createIcons();
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
  document.getElementById('chatStream').innerHTML = `<div class="text-center py-4 text-xs text-slate-400">Conversation reset.</div>`;
}

// --- My Tickets Tab ---
async function loadMyTickets() {
  const container = document.getElementById('ticketsContainer');
  if (!authToken) {
    container.innerHTML = `
      <div class="text-center py-14 bg-white rounded-3xl border border-slate-200/80 p-6">
        <h3 class="font-bold text-slate-800 text-sm">Sign in to view your tickets</h3>
        <p class="text-xs text-slate-500 mt-1 mb-4">You must be logged in to inspect your reservations.</p>
        <button onclick="toggleAuthModal(true)" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Sign In</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="text-center py-12 text-xs text-slate-400">Loading your tickets...</div>`;

  try {
    const res = await apiRequest('/registrations/my');
    if (!res.ok) throw new Error();
    const tickets = await res.json();

    if (!tickets || tickets.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 bg-white rounded-3xl border border-slate-200/80 p-6">
          <p class="text-xs text-slate-500">You do not have any confirmed tickets yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tickets.map(t => `
      <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
        <div>
          <span class="font-bold text-slate-900 text-sm">Pass for Event #${t.event_id}</span>
          <span class="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">${t.status}</span>
        </div>
        <button onclick="cancelTicket(${t.event_id})" class="text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition font-medium">
          Cancel Pass
        </button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="text-center py-8 text-xs text-rose-500">Could not load ticket records.</div>`;
  }
}

async function cancelTicket(eventId) {
  if (!confirm('Are you sure you want to release this ticket?')) return;
  try {
    const res = await apiRequest(`/registrations/${eventId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Ticket cancelled', 'info');
      loadMyTickets();
    } else {
      showToast('Failed to cancel ticket', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

// --- Authentication ---
function updateAuthUI() {
  const slot = document.getElementById('navAuthSlot');
  if (authToken) {
    slot.innerHTML = `
      <button onclick="logout()" class="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition">
        Sign Out
      </button>
    `;
  } else {
    slot.innerHTML = `
      <button onclick="toggleAuthModal(true)" class="px-5 py-2.5 rounded-full text-xs font-bold bg-slate-900 hover:bg-indigo-600 text-white shadow-sm transition">
        Sign In
      </button>
    `;
  }
}

function toggleAuthModal(show) {
  document.getElementById('authModal').classList.toggle('hidden', !show);
}

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  document.getElementById('nameInputGroup').classList.toggle('hidden', !isRegisterMode);
  document.getElementById('authTitle').textContent = isRegisterMode ? 'Create Account' : 'Welcome Back';
  document.getElementById('authSubtitle').textContent = isRegisterMode ? 'Sign up to register for events' : 'Enter your details to access your passes';
  document.getElementById('authSubmitBtn').textContent = isRegisterMode ? 'Register' : 'Sign In';
  document.getElementById('authSwitchText').textContent = isRegisterMode ? 'Already have an account?' : "Don't have an account?";
  document.getElementById('authSwitchBtn').textContent = isRegisterMode ? 'Sign In' : 'Create Account';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  try {
    if (isRegisterMode) {
      const name = document.getElementById('authName').value;
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: 'USER' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      showToast('Account created! Please sign in.', 'success');
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
      toggleAuthModal(false);
      updateAuthUI();
      showToast('Signed in successfully', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logout() {
  authToken = null;
  localStorage.removeItem('pulse_token');
  updateAuthUI();
  navigate('explore');
  showToast('Signed out', 'info');
}

// --- Helpers ---
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `px-4 py-3 rounded-2xl text-xs font-semibold shadow-lg pointer-events-auto border transition duration-200 animate-in fade-in slide-in-from-bottom-2 ${
    type === 'success' ? 'bg-slate-900 text-white border-slate-800' :
    type === 'error' ? 'bg-rose-600 text-white border-rose-700' :
    'bg-white text-slate-800 border-slate-200'
  }`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
