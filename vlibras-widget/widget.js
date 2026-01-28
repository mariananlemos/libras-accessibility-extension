/**
 * VLibras Widget JavaScript
 * Controla o widget VLibras dentro do iframe sandboxed
 * Usa técnica de seleção de texto para acionar tradução (como no projeto STT+VLibras)
 */

// Estado do widget
const widgetState = {
  isReady: false,
  currentAvatar: 'icaro',
  lastText: ''
};

// Elementos DOM
const elements = {
  loadingOverlay: null,
  errorMessage: null,
  captionText: null,
  statusDot: null,
  statusText: null,
  avatarName: null
};

// Inicializa elementos quando DOM estiver pronto
function initElements() {
  elements.loadingOverlay = document.getElementById('loading-overlay');
  elements.errorMessage = document.getElementById('error-message');
  elements.captionText = document.getElementById('caption-text');
  elements.statusDot = document.getElementById('status-dot');
  elements.statusText = document.getElementById('status-text');
  elements.avatarName = document.getElementById('avatar-name');
}

// Inicializa o VLibras
function initializeVLibras() {
  console.log('[VLibras Widget] Inicializando VLibras...');
  
  try {
    if (typeof VLibras !== 'undefined') {
      // Cria o widget VLibras
      const widget = new VLibras.Widget('https://vlibras.gov.br/app');
      
      console.log('[VLibras Widget] Widget criado');
      
      // Monitora quando estiver pronto
      checkVLibrasReady();
    } else {
      console.error('[VLibras Widget] VLibras não está definido');
      showError();
    }
  } catch (error) {
    console.error('[VLibras Widget] Erro na inicialização:', error);
    showError();
  }
}

// Verifica se VLibras está pronto
function checkVLibrasReady() {
  let attempts = 0;
  const maxAttempts = 40; // 20 segundos

  const checkInterval = setInterval(() => {
    attempts++;
    
    // Verifica se há canvas ou iframe do Unity
    const vwWrapper = document.querySelector('[vw-plugin-wrapper]');
    const hasPlayer = vwWrapper && (
      vwWrapper.querySelector('canvas') || 
      vwWrapper.querySelector('iframe') ||
      vwWrapper.querySelector('[vp]') ||
      vwWrapper.children.length > 1
    );

    // Verifica se o plugin global existe
    const hasPlugin = typeof window.plugin !== 'undefined';

    console.log('[VLibras Widget] Verificando... attempt:', attempts, 'hasPlayer:', hasPlayer, 'hasPlugin:', hasPlugin);

    if (hasPlayer || hasPlugin) {
      clearInterval(checkInterval);
      onVLibrasReady();
    } else if (attempts >= maxAttempts) {
      clearInterval(checkInterval);
      // Assume que está pronto mesmo sem detectar
      console.log('[VLibras Widget] Timeout, assumindo pronto');
      onVLibrasReady();
    }
  }, 500);
}

// VLibras está pronto
function onVLibrasReady() {
  console.log('[VLibras Widget] Pronto!');
  widgetState.isReady = true;
  
  if (elements.loadingOverlay) {
    elements.loadingOverlay.classList.add('hidden');
  }
  if (elements.statusDot) {
    elements.statusDot.classList.remove('loading');
  }
  if (elements.statusText) {
    elements.statusText.textContent = 'Pronto';
  }

  // Notifica o parent
  notifyParent({ type: 'ready' });
}

// Mostra erro
function showError() {
  if (elements.loadingOverlay) {
    elements.loadingOverlay.classList.add('hidden');
  }
  if (elements.errorMessage) {
    elements.errorMessage.classList.add('visible');
  }
  if (elements.statusDot) {
    elements.statusDot.classList.remove('loading');
    elements.statusDot.classList.add('error');
  }
  if (elements.statusText) {
    elements.statusText.textContent = 'Erro';
  }

  notifyParent({ type: 'error', message: 'Falha ao carregar VLibras' });
}

/**
 * Traduz texto para Libras
 * Usa a técnica de seleção de texto que funciona com o VLibras
 */
function translate(text) {
  if (!text || text.trim().length < 2) return;

  console.log('[VLibras Widget] Traduzindo:', text);
  widgetState.lastText = text;

  // Atualiza o elemento de texto
  if (elements.captionText) {
    elements.captionText.textContent = text;
    elements.captionText.classList.remove('placeholder');
  }

  // Tenta múltiplas abordagens para traduzir

  // 1. Tenta usar plugin.translate() diretamente
  if (window.plugin && typeof window.plugin.translate === 'function') {
    try {
      window.plugin.translate(text);
      console.log('[VLibras Widget] Traduzido via plugin.translate()');
      notifyParent({ type: 'translating', text: text });
      return;
    } catch (e) {
      console.warn('[VLibras Widget] plugin.translate() falhou:', e);
    }
  }

  // 2. Usa a técnica de seleção de texto (como no projeto STT+VLibras)
  traduzirViaSelecao(elements.captionText);
  
  notifyParent({ type: 'translating', text: text });
}

/**
 * Aciona o VLibras via seleção de texto
 * Esta técnica funciona porque o VLibras monitora seleções de texto na página
 */
function traduzirViaSelecao(el) {
  if (!el) return;

  try {
    // Clica no botão de acesso do VLibras para garantir que está aberto
    const accessBtn = document.querySelector('[vw-access-button]');
    if (accessBtn) {
      accessBtn.click();
    }

    // Aguarda um pouco e então seleciona o texto
    setTimeout(() => {
      // Cria uma seleção de texto no elemento
      const range = document.createRange();
      range.selectNodeContents(el);
      
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      // Dispara eventos para o VLibras detectar a seleção
      document.dispatchEvent(new Event('selectionchange'));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      el.dispatchEvent(new Event('keyup', { bubbles: true }));

      console.log('[VLibras Widget] Seleção de texto disparada');
    }, 300);

  } catch (e) {
    console.warn('[VLibras Widget] Erro ao acionar VLibras via seleção:', e);
  }
}

// Muda avatar
function changeAvatar(avatarName) {
  console.log('[VLibras Widget] Mudando avatar para:', avatarName);
  widgetState.currentAvatar = avatarName;
  
  const avatarNames = {
    'icaro': 'Ícaro',
    'hosana': 'Hosana', 
    'guga': 'Guga'
  };
  
  if (elements.avatarName) {
    elements.avatarName.textContent = avatarNames[avatarName] || avatarName;
  }

  try {
    if (window.plugin && typeof window.plugin.changeAvatar === 'function') {
      window.plugin.changeAvatar(avatarName);
    }
  } catch (error) {
    console.error('[VLibras Widget] Erro ao mudar avatar:', error);
  }
}

// Notifica o parent (content script)
function notifyParent(message) {
  try {
    window.parent.postMessage({
      source: 'vlibras-widget',
      ...message
    }, '*');
  } catch (error) {
    console.error('[VLibras Widget] Erro ao notificar parent:', error);
  }
}

// Escuta mensagens do parent
window.addEventListener('message', (event) => {
  const data = event.data;
  
  // Ignora mensagens do próprio widget
  if (!data || data.source === 'vlibras-widget') return;

  console.log('[VLibras Widget] Mensagem recebida:', data);

  switch (data.type) {
    case 'translate':
      translate(data.text);
      break;
    case 'changeAvatar':
      changeAvatar(data.avatar);
      break;
    case 'ping':
      notifyParent({ type: 'pong', ready: widgetState.isReady });
      break;
  }
});

// Inicialização quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initElements();
    // Aguarda o script do VLibras carregar
    setTimeout(initializeVLibras, 1000);
  });
} else {
  initElements();
  setTimeout(initializeVLibras, 1000);
}

console.log('[VLibras Widget] Script carregado');
