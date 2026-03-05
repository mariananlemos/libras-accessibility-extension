/**
 * Background Service Worker / Script
 * Gerencia Side Panel e comunicação entre Content Script e Side Panel
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
// Configuração inicial
// ===============================

// Chrome/Edge: Configura Side Panel
if (hasSidePanel) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[Background] Erro ao configurar Side Panel:', error));
}

// ===============================
// Listeners de mensagens
// ===============================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Mensagem recebida:', message.type);

  (async () => {
    try {
      switch (message.type) {
        case 'open_side_panel':
          // Abre o Side Panel/Sidebar programaticamente
          if (hasSidePanel && sender.tab?.id) {
            await chrome.sidePanel.open({ tabId: sender.tab.id });
            sendResponse({ success: true });
          } else if (hasSidebarAction) {
            // Firefox: abre a sidebar
            const sidebarAPI = isFirefox ? browser.sidebarAction : chrome.sidebarAction;
            await sidebarAPI.open();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Side panel not supported' });
          }
          break;

        case 'caption_update':
          // Armazena a legenda para o Side Panel
          await chrome.storage.session.set({
            currentCaption: {
              text: message.text,
              speaker: message.speaker || 'Desconhecido',
              timestamp: Date.now(),
              platform: message.platform || 'unknown'
            }
          });
          sendResponse({ success: true });
          break;

        case 'get_status':
          // Retorna status da extensão
          const data = await chrome.storage.session.get(['currentCaption', 'isActive']);
          sendResponse({ success: true, data });
          break;

        case 'set_active':
          // Define se a captura está ativa
          await chrome.storage.session.set({ isActive: message.active });
          sendResponse({ success: true });
          break;

        default:
          console.log('[Background] Tipo de mensagem desconhecido:', message.type);
      }
    } catch (error) {
      console.error('[Background] Erro ao processar mensagem:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Retorna true para indicar resposta assíncrona
  return true;
});

// ===============================
// Habilita Side Panel apenas em sites de reunião (Chrome/Edge)
// ===============================

const MEETING_SITES = [
  'meet.google.com',
  'teams.microsoft.com',
  'zoom.us',
  'youtube.com'
];

if (hasSidePanel) {
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) return;

    try {
      const url = new URL(tab.url);
      const isEnabled = MEETING_SITES.some(site => url.hostname.includes(site));

      await chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel/sidepanel.html',
        enabled: isEnabled
      });

      console.log(`[Background] Side Panel ${isEnabled ? 'habilitado' : 'desabilitado'} para:`, url.hostname);
    } catch (error) {
      // Ignora erros de URLs inválidas (chrome://, about://, etc.)
    }
  });
}

// ===============================
// Instalação e atualização
// ===============================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Background] Extensão instalada');
    
    // Configurações padrão
    chrome.storage.sync.set({
      settings: {
        autoTranslate: true,
        debounceDelay: 800,
        vlibrasPosition: 'R',
        vlibrasAvatar: 'icaro'
      }
    });
  } else if (details.reason === 'update') {
    console.log('[Background] Extensão atualizada para versão:', chrome.runtime.getManifest().version);
  }
});

// ===============================
// Atalhos de teclado (opcional)
// ===============================

chrome.commands?.onCommand?.addListener(async (command) => {
  if (command === 'toggle-side-panel') {
    if (hasSidePanel) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
    } else if (hasSidebarAction) {
      const sidebarAPI = isFirefox ? browser.sidebarAction : chrome.sidebarAction;
      await sidebarAPI.toggle();
    }
  }
});
