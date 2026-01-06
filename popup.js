document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('backendUrl');
  const btn = document.getElementById('saveBtn');

  chrome.storage.sync.get({ backendUrl: 'http://localhost:5000/upload' }, (items) => {
    input.value = items.backendUrl;
  });

  btn.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) return alert('Digite a URL do backend');
    chrome.storage.sync.set({ backendUrl: val }, () => {
      alert('URL salva');
    });
  });
});