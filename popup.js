/**
 * Popup Script
 * Interface de configuração e controle da extensão
 * Compatível com Chrome, Edge e Firefox
 */

// ===============================
// Detecção de navegador
// ===============================

const isFirefox = typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined';
const hasSidePanel = typeof chrome.sidePanel !== 'undefined';
const hasSidebarAction = typeof chrome.sidebarAction !== 'undefined' || 
                          (typeof browser !== 'undefined' && typeof browser.sidebarAction !== 'undefined');

// ===============================
// Elementos DOM
// ===============================

const elements = {
  statusDot: null,
  statusText: null,
  platformInfo: null,
  btnOpenPanel: null,
  btnHelp: null,
  settingAutoTranslate: null,
  settingShowBadge: null
};

// ===============================
// Inicialização
// ===============================

document.addEventListener('DOMContentLoaded', async () => {
  // Captura elementos
  elements.statusDot = document.getElementById('status-dot');
  elements.statusText = document.getElementById('status-text');
  elements.platformInfo = document.getElementById('platform-info');
  elements.btnOpenPanel = document.getElementById('btn-open-panel');
  elements.btnHelp = document.getElementById('btn-help');
  elements.settingAutoTranslate = document.getElementById('setting-auto-translate');
  elements.settingShowBadge = document.getElementById('setting-show-badge');

  // Carrega configurações
  await loadSettings();

  // Verifica status
  await checkStatus();

  // Configura listeners
  setupListeners();
});

// ===============================
// Status
// ===============================

async function checkStatus() {
  try {
    // Obtém a aba ativa
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.url) {
      updateStatus(false, 'Nenhuma aba ativa');
      return;
    }

    // Verifica se é um site suportado
    const supportedSites = [
      'meet.google.com',
      'teams.microsoft.com',
      'zoom.us',
      'youtube.com'
    ];

    const url = new URL(tab.url);
    const isSupported = supportedSites.some(site => url.hostname.includes(site));

    if (isSupported) {
      updateStatus(true, 'Pronto para capturar');
      elements.platformInfo.textContent = `Plataforma: ${getPlatformName(url.hostname)}`;
    } else {
      updateStatus(false, 'Site não suportado');
      elements.platformInfo.textContent = 'Abra Google Meet, Teams, Zoom ou YouTube';
    }

  } catch (error) {
    console.error('[Popup] Erro ao verificar status:', error);
    updateStatus(false, 'Erro ao verificar');
  }
}

function updateStatus(active, message) {
  if (elements.statusDot) {
    elements.statusDot.className = `status-dot ${active ? 'active' : ''}`;
  }
  if (elements.statusText) {
    elements.statusText.textContent = message;
  }
}

function getPlatformName(hostname) {
  if (hostname.includes('meet.google.com')) return 'Google Meet';
  if (hostname.includes('teams.microsoft.com')) return 'Microsoft Teams';
  if (hostname.includes('zoom.us')) return 'Zoom';
  if (hostname.includes('youtube.com')) return 'YouTube';
  return 'Desconhecida';
}

// ===============================
// Configurações
// ===============================

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get('settings');
    const settings = result.settings || {
      autoTranslate: true,
      showBadge: true
    };

    if (elements.settingAutoTranslate) {
      elements.settingAutoTranslate.checked = settings.autoTranslate;
    }
    if (elements.settingShowBadge) {
      elements.settingShowBadge.checked = settings.showBadge;
    }

  } catch (error) {
    console.error('[Popup] Erro ao carregar configurações:', error);
  }
}

async function saveSettings() {
  try {
    const settings = {
      autoTranslate: elements.settingAutoTranslate?.checked ?? true,
      showBadge: elements.settingShowBadge?.checked ?? true,
      debounceDelay: 800
    };

    await chrome.storage.sync.set({ settings });
    console.log('[Popup] Configurações salvas:', settings);

  } catch (error) {
    console.error('[Popup] Erro ao salvar configurações:', error);
  }
}

// ===============================
// Listeners
// ===============================

function setupListeners() {
  // Botão abrir painel
  elements.btnOpenPanel?.addEventListener('click', async () => {
    try {
      if (hasSidePanel) {
        // Chrome/Edge: abre Side Panel
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.sidePanel.open({ tabId: tab.id });
          window.close();
        }
      } else if (hasSidebarAction) {
        // Firefox: abre Sidebar
        const sidebarAPI = isFirefox ? browser.sidebarAction : chrome.sidebarAction;
        await sidebarAPI.open();
        window.close();
      } else {
        alert('Painel lateral não disponível neste navegador.');
      }
    } catch (error) {
      console.error('[Popup] Erro ao abrir painel:', error);
      alert('Não foi possível abrir o painel. Tente abrir pela barra lateral do navegador.');
    }
  });

  // Botão ajuda
  elements.btnHelp?.addEventListener('click', () => {
    showHelp();
  });

  // Configurações
  elements.settingAutoTranslate?.addEventListener('change', saveSettings);
  elements.settingShowBadge?.addEventListener('change', saveSettings);
}

// ===============================
// Ajuda
// ===============================

function showHelp() {
  const helpText = `
📋 COMO USAR:

1️⃣ Abra uma reunião (Meet, Teams, Zoom) ou vídeo (YouTube)

2️⃣ Ative as legendas na plataforma:
   • Meet: Clique em "Ativar legendas" (CC)
   • Teams: Clique em "..." → "Ativar legendas"
   • Zoom: Clique em "CC" ou "Legendas"
   • YouTube: Clique no botão CC

3️⃣ Clique em "Abrir Painel de Tradução"

4️⃣ O VLibras traduzirá automaticamente as legendas para Libras!

💡 DICAS:
• Mantenha o painel lateral aberto durante a reunião
• As legendas são traduzidas com um pequeno delay
• Clique em legendas antigas no histórico para retraduzir

🌐 NAVEGADORES SUPORTADOS:
• Google Chrome, Microsoft Edge, Mozilla Firefox

🔗 Mais info: vlibras.gov.br
  `.trim();

  alert(helpText);
}
