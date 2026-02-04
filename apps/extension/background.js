async function sendActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.url) return;
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) return;

    const payload = {
      url: tab.url,
      title: tab.title || '',
      timestamp: Date.now(),
    };

    await fetch('http://127.0.0.1:17330/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore when agent is not running
  }
}

chrome.tabs.onActivated.addListener(() => sendActiveTab());
chrome.tabs.onUpdated.addListener(() => sendActiveTab());
setInterval(sendActiveTab, 15000);
