/**
 * Side Panel Script
 * Gerencia a exibição de legendas e integração com VLibras
 */

// ===============================
// Estado da aplicação
// ===============================

const state = {
  vlibrasReady: false,
  currentCaption: null,
  captionHistory: [],
  maxHistoryItems: 50,
  autoTranslate: true,
  lastTranslatedText: '',
  debounceTimer: null,
  debounceDelay: 800
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
  platformInfo: null
};

// ===============================
// Inicialização
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

  // Inicializa VLibras
  initVLibras();

  // Configura listeners
  setupListeners();

  // Carrega configurações
  loadSettings();

  // Verifica legendas existentes
  checkExistingCaption();
});

// ===============================
// VLibras
// ===============================

function initVLibras() {
  console.log('[SidePanel] Inicializando VLibras...');
  
  // Aguarda o script carregar
  if (typeof window.VLibras === 'undefined') {
    console.log('[SidePanel] Aguardando carregamento do VLibras...');
    setTimeout(initVLibras, 500);
    return;
  }

  try {
    // Inicializa o widget com opções
    new window.VLibras.Widget({
      rootPath: 'https://vlibras.gov.br/app',
      position: 'R',
      opacity: 1,
      avatar: 'icaro'
    });

    state.vlibrasReady = true;
    updateStatus('connected', 'VLibras pronto');
    console.log('[SidePanel] VLibras inicializado com sucesso');

    // Aguarda widget estar totalmente carregado
    setTimeout(() => {
      // Esconde o botão de acesso flutuante (já estamos no side panel)
      const accessButton = document.querySelector('[vw-access-button]');
      if (accessButton) {
        accessButton.style.display = 'none';
      }
    }, 2000);

  } catch (error) {
    console.error('[SidePanel] Erro ao inicializar VLibras:', error);
    updateStatus('error', 'Erro no VLibras');
  }
}

// ===============================
// Tradução
// ===============================

function translateText(text) {
  if (!text || text.trim().length < 2) {
    console.log('[SidePanel] Texto muito curto, ignorando');
    return;
  }

  if (!state.vlibrasReady) {
    console.log('[SidePanel] VLibras não está pronto');
    updateStatus('warning', 'VLibras carregando...');
    return;
  }

  // Evita traduzir o mesmo texto
  if (text === state.lastTranslatedText) {
    console.log('[SidePanel] Texto já traduzido, ignorando');
    return;
  }

  console.log('[SidePanel] Traduzindo:', text);
  state.lastTranslatedText = text;

  // Atualiza UI
  updateStatus('translating', 'Traduzindo...');

  // Cria elemento temporário com o texto para o VLibras detectar
  const captionEl = elements.currentCaption;
  
  // Remove placeholder se existir
  const placeholder = captionEl.querySelector('.caption-placeholder');
  if (placeholder) {
    placeholder.remove();
  }

  // Atualiza o texto
  captionEl.textContent = text;

  // Seleciona o texto para o VLibras detectar
  try {
    const range = document.createRange();
    range.selectNodeContents(captionEl);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // Simula clique no texto (VLibras monitora clicks em texto selecionado)
    setTimeout(() => {
      captionEl.click();
      
      // Dispara evento de seleção
      document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
      
      // Limpa seleção após um tempo
      setTimeout(() => {
        selection.removeAllRanges();
        updateStatus('connected', 'Tradução concluída');
      }, 1500);
    }, 100);

  } catch (error) {
    console.error('[SidePanel] Erro ao traduzir:', error);
    updateStatus('error', 'Erro na tradução');
  }
}

function translateWithDebounce(text) {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => {
    translateText(text);
  }, state.debounceDelay);
}

// ===============================
// Legendas
// ===============================

function displayCaption(captionData) {
  const { text, speaker, platform } = captionData;

  // Atualiza UI
  elements.speakerName.textContent = speaker || '';
  
  // Remove placeholder
  const placeholder = elements.currentCaption.querySelector('.caption-placeholder');
  if (placeholder) {
    placeholder.remove();
  }

  // Atualiza legenda atual
  elements.currentCaption.textContent = text;

  // Atualiza plataforma
  elements.platformInfo.textContent = `Plataforma: ${getPlatformName(platform)}`;

  // Adiciona ao histórico
  addToHistory({ text, speaker, timestamp: Date.now() });

  // Traduz automaticamente se habilitado
  if (state.autoTranslate) {
    translateWithDebounce(text);
  }
}

function addToHistory(captionData) {
  const { text, speaker, timestamp } = captionData;

  // Evita duplicatas
  if (state.captionHistory.length > 0) {
    const lastItem = state.captionHistory[state.captionHistory.length - 1];
    if (lastItem.text === text) return;
  }

  // Adiciona ao histórico
  state.captionHistory.push({ text, speaker, timestamp });

  // Limita tamanho
  if (state.captionHistory.length > state.maxHistoryItems) {
    state.captionHistory.shift();
  }

  // Renderiza histórico
  renderHistory();
}

function renderHistory() {
  if (!elements.captionHistory) return;

  // Limita exibição a últimos 20 itens
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
  elements.captionHistory.innerHTML = '';
  console.log('[SidePanel] Histórico limpo');
}

// ===============================
// Listeners
// ===============================

function setupListeners() {
  // Escuta mudanças no storage (legendas do content script)
  chrome.storage.session.onChanged.addListener((changes) => {
    if (changes.currentCaption) {
      const newCaption = changes.currentCaption.newValue;
      if (newCaption && newCaption.text) {
        console.log('[SidePanel] Nova legenda recebida:', newCaption.text);
        displayCaption(newCaption);
      }
    }
  });

  // Botão de tradução manual
  if (elements.btnTranslate) {
    elements.btnTranslate.addEventListener('click', () => {
      const text = elements.currentCaption.textContent;
      if (text && !text.includes('As legendas aparecerão')) {
        translateText(text);
      }
    });
  }

  // Botão limpar histórico
  if (elements.clearHistory) {
    elements.clearHistory.addEventListener('click', clearHistory);
  }

  // Clique no histórico para traduzir
  if (elements.captionHistory) {
    elements.captionHistory.addEventListener('click', (e) => {
      const historyItem = e.target.closest('.history-item');
      if (historyItem) {
        const text = historyItem.dataset.text;
        if (text) {
          elements.currentCaption.textContent = text;
          translateText(text);
        }
      }
    });
  }
}

// ===============================
// Utilitários
// ===============================

function updateStatus(status, message) {
  if (!elements.statusIndicator || !elements.statusText) return;

  elements.statusIndicator.className = `status-dot status-${status}`;
  elements.statusText.textContent = message;
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

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get('settings');
    if (result.settings) {
      state.autoTranslate = result.settings.autoTranslate ?? true;
      state.debounceDelay = result.settings.debounceDelay ?? 800;
    }
  } catch (error) {
    console.error('[SidePanel] Erro ao carregar configurações:', error);
  }
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
