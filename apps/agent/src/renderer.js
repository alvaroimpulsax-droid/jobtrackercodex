const statusEl = document.getElementById('status');
const apiUrlInput = document.getElementById('apiUrl');
const autoStartInput = document.getElementById('autoStart');
const updateStatusEl = document.getElementById('updateStatus');

async function refreshStatus() {
  const status = await window.agentAPI.getStatus();
  apiUrlInput.value = status.apiUrl || 'http://localhost:4000';
  autoStartInput.checked = !!status.autoStart;
  statusEl.textContent = status.accessToken
    ? `Conectado · Tracking ${status.tracking ? 'activo' : 'parado'}`
    : 'No autenticado';
}

document.getElementById('saveApi').addEventListener('click', async () => {
  await window.agentAPI.setApiUrl(apiUrlInput.value);
  await refreshStatus();
});

autoStartInput.addEventListener('change', async (e) => {
  await window.agentAPI.setAutoStart(e.target.checked);
  await refreshStatus();
});

document.getElementById('checkUpdates').addEventListener('click', async () => {
  await window.agentAPI.checkUpdates();
});

window.agentAPI.onUpdateStatus((message) => {
  updateStatusEl.textContent = message;
});

document.getElementById('login').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const tenantId = document.getElementById('tenantId').value;
  try {
    await window.agentAPI.login({ email, password, tenantId: tenantId || undefined });
    await refreshStatus();
  } catch (err) {
    statusEl.textContent = err.message || 'Error de login';
  }
});

document.getElementById('start').addEventListener('click', async () => {
  try {
    await window.agentAPI.startTracking();
    await refreshStatus();
  } catch (err) {
    statusEl.textContent = err.message || 'Error al iniciar';
  }
});

document.getElementById('stop').addEventListener('click', async () => {
  try {
    await window.agentAPI.stopTracking();
    await refreshStatus();
  } catch (err) {
    statusEl.textContent = err.message || 'Error al parar';
  }
});

document.getElementById('logout').addEventListener('click', async () => {
  await window.agentAPI.logout();
  await refreshStatus();
});

refreshStatus();
