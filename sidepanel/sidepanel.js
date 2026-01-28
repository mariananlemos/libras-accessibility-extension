/**
 * Side Panel Script
 * Gerencia a exibicao de legendas e integracao com VLibras via iframe
 */

// ===============================
// Estado da aplicacao
// ===============================

const state = {
  currentCaption: null,
  captionHistory: [],
  maxHistoryItems: 50,
  lastTranslatedText: ''
};

// ===============================
// Elementos DOM
// ===============================

const elements = {
  statusIndicator: null,
  statusText: null,
  currentCaption: null,
  speakerName: null,
  captionHistory: null,
  clearHistory: null,
  btnTranslate: null,
  platformInfo: null,
  vlibrasFrame: null,
  vlibrasOverlay: null
};

// ===============================
// Inicializacao
// ===============================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[SidePanel] Inicializando...');
  
  // Captura elementos DOM
  elements.statusIndicator = document.getElementById('status-indicator');
  elements.statusText = document.getElementById('status-text');
  elements.currentCaption = document.getElementById('current-caption');
  elements.speakerName = document.getElementById('speaker-name');
  elements.captionHistory = document.getElementById('caption-history');
  elements.clearHistory = document.getElementById('clear-history');
  elements.btnTranslate = document.getElementById('btn-translate');
  elements.platformInfo = document.getElementById('platform-info');
  elements.vlibrasFrame = document.getElementById('vlibras-frame');
  elements.vlibrasOverlay = document.getElementById('vlibras-overlay');

  // Configura listeners
  setupListeners();

  // Verifica legendas existentes
  checkExistingCaption();

  updateStatus('connected', 'Pronto - aguardando legendas');
  console.log('[SidePanel] Inicializado com sucesso');
});

// ===============================
// Traducao via VLibras
// ===============================

function translateText(text) {
  if (!text || text.trim().length < 2) {
    console.log('[SidePanel] Texto muito curto, ignorando');
    return;
  }

  console.log('[SidePanel] Preparando traducao:', text);
  state.lastTranslatedText = text;

  // Abre o VLibras em nova aba com o texto
  // O VLibras web permite traducao direta
  const vlibrasUrl = `https://www.vlibras.gov.br/`;
  
  // Copia o texto para a area de transferencia para o usuario colar no VLibras
  navigator.clipboard.writeText(text).then(() => {
    updateStatus('translating', 'Texto copiado! Cole no VLibras');
    
    // Abre o VLibras
    window.open(vlibrasUrl, '_blank');
    
    setTimeout(() => {
      updateStatus('connected', 'Pronto');
    }, 3000);
  }).catch(err => {
    console.error('[SidePanel] Erro ao copiar:', err);
    // Fallback: abre VLibras mesmo assim
    window.open(vlibrasUrl, '_blank');
  });
}

// ===============================
// Legendas
// ===============================

function displayCaption(captionData) {
  const { text, speaker, platform } = captionData;

  // Atualiza UI
  if (elements.speakerName) {
    elements.speakerName.textContent = speaker || '';
  }
  
  // Remove placeholder
  const placeholder = elements.currentCaption?.querySelector('.caption-placeholder');
  if (placeholder) {
    placeholder.remove();
  }

  // Atualiza legenda atual
  if (elements.currentCaption) {
    elements.currentCaption.textContent = text;
  }

  // Atualiza plataforma
  if (elements.platformInfo) {
    elements.platformInfo.textContent = `Plataforma: ${getPlatformName(platform)}`;
  }

  // Adiciona ao historico
  addToHistory({ text, speaker, timestamp: Date.now() });

  updateStatus('connected', 'Legenda recebida');
}

function addToHistory(captionData) {
  const { text, speaker, timestamp } = captionData;

  // Evita duplicatas
  if (state.captionHistory.length > 0) {
    const lastItem = state.captionHistory[state.captionHistory.length - 1];
    if (lastItem.text === text) return;
  }

  // Adiciona ao historico
  state.captionHistory.push({ text, speaker, timestamp });

  // Limita tamanho
  if (state.captionHistory.length > state.maxHistoryItems) {
    state.captionHistory.shift();
  }

  // Renderiza historico
  renderHistory();
}

function renderHistory() {
  if (!elements.captionHistory) return;

  // Limita exibicao a ultimos 20 itens
  const displayItems = state.captionHistory.slice(-20);

  elements.captionHistory.innerHTML = displayItems.map(item => {
    const time = new Date(item.timestamp).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `
      <div class="history-item" data-text="${escapeHtml(item.text)}">
        <span class="history-time">${time}</span>
        <span class="history-speaker">${escapeHtml(item.speaker || '')}</span>
        <span class="history-text">${escapeHtml(item.text)}</span>
      </div>
    `;
  }).join('');

  // Scroll para o final
  elements.captionHistory.scrollTop = elements.captionHistory.scrollHeight;
}

function clearHistory() {
  state.captionHistory = [];
  if (elements.captionHistory) {
    elements.captionHistory.innerHTML = '';
  }
  console.log('[SidePanel] Historico limpo');
}

// ===============================
// Listeners
// ===============================

function setupListeners() {
  // Escuta mudancas no storage (legendas do content script)
  chrome.storage.session.onChanged.addListener((changes) => {
    if (changes.currentCaption) {
      const newCaption = changes.currentCaption.newValue;
      if (newCaption && newCaption.text) {
        console.log('[SidePanel] Nova legenda recebida:', newCaption.text);
        displayCaption(newCaption);
      }
    }
  });

  // Botao de traducao manual
  if (elements.btnTranslate) {
    elements.btnTranslate.addEventListener('click', () => {
      const text = elements.currentCaption?.textContent;
      if (text && !text.includes('As legendas aparecerao')) {
        translateText(text);
      } else {
        alert('Nenhuma legenda para traduzir. Ative as legendas na sua reuniao primeiro.');
      }
    });
  }

  // Botao limpar historico
  if (elements.clearHistory) {
    elements.clearHistory.addEventListener('click', clearHistory);
  }

  // Clique no historico para selecionar
  if (elements.captionHistory) {
    elements.captionHistory.addEventListener('click', (e) => {
      const historyItem = e.target.closest('.history-item');
      if (historyItem) {
        const text = historyItem.dataset.text;
        if (text && elements.currentCaption) {
          elements.currentCaption.textContent = text;
        }
      }
    });
  }
}

// ===============================
// Utilitarios
// ===============================

function updateStatus(status, message) {
  if (elements.statusIndicator) {
    elements.statusIndicator.className = `status-dot status-${status}`;
  }
  if (elements.statusText) {
    elements.statusText.textContent = message;
  }
}

function getPlatformName(platform) {
  const names = {
    'meet': 'Google Meet',
    'teams': 'Microsoft Teams',
    'zoom': 'Zoom',
    'youtube': 'YouTube',
    'unknown': 'Desconhecida'
  };
  return names[platform] || platform || 'Desconhecida';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function checkExistingCaption() {
  try {
    const result = await chrome.storage.session.get('currentCaption');
    if (result.currentCaption) {
      displayCaption(result.currentCaption);
    }
  } catch (error) {
    console.error('[SidePanel] Erro ao verificar legenda existente:', error);
  }
}

// ===============================
// Exporta para debug (opcional)
// ===============================

window.LibrasPanel = {
  state,
  translateText,
  clearHistory
};
