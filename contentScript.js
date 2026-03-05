/**
 * Content Script - Captura de Legendas + VLibras Widget
 * Captura legendas de plataformas de reunião e traduz para Libras usando o VLibras
 * 
 * IMPORTANTE: Usa iframe para contornar CSP do Google Meet
 */

// ===============================
// Configurações do VLibras
// ===============================

const VLIBRAS_CONFIG = {
  avatars: ['icaro', 'hosana', 'guga'],
  defaultAvatar: 'icaro'
};

// ===============================
// VLibras Widget Manager (via iframe)
// ===============================

class VLibrasManager {
  constructor() {
    this.isLoaded = false;
    this.isReady = false;
    this.isTranslating = false;
    this.container = null;
    this.iframe = null;
    this.currentText = '';
    this.currentAvatar = VLIBRAS_CONFIG.defaultAvatar;
  }

  // Injeta o container do VLibras com iframe na página
  async injectContainer() {
    if (this.container) return;

    // URL do widget da extensão
    const widgetUrl = chrome.runtime.getURL('vlibras-widget/widget.html');

    // Cria o container principal do VLibras
    this.container = document.createElement('div');
    this.container.id = 'vlibras-meet-container';
    this.container.innerHTML = `
      <div id="vlibras-player-wrapper">
        <div id="vlibras-header">
          <span class="vlibras-title">🤟 Tradutor Libras</span>
          <div class="vlibras-controls">
            <button id="vlibras-minimize" title="Minimizar">−</button>
            <button id="vlibras-close" title="Fechar">×</button>
          </div>
        </div>
        <div id="vlibras-player-area">
          <iframe 
            id="vlibras-iframe"
            src="${widgetUrl}"
            title="VLibras Widget"
            allow="autoplay"
          ></iframe>
        </div>
        <div id="vlibras-caption-display">
          <span id="vlibras-current-text">Aguardando legendas...</span>
        </div>
        <div id="vlibras-footer">
          <button id="vlibras-translate-btn" class="vlibras-btn" disabled>
            🤟 Traduzir
          </button>
          <select id="vlibras-avatar-select">
            <option value="icaro">Ícaro</option>
            <option value="hosana">Hosana</option>
            <option value="guga">Guga</option>
          </select>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.iframe = this.container.querySelector('#vlibras-iframe');
    this.injectStyles();
    this.setupEventListeners();
    this.setupIframeCommunication();
    
    console.log('[VLibras] Container com iframe injetado');
  }

  // Estilos do widget VLibras
  injectStyles() {
    const style = document.createElement('style');
    style.id = 'vlibras-meet-styles';
    style.textContent = `
      #vlibras-meet-container {
        position: fixed;
        bottom: 100px;
        right: 20px;
        z-index: 999999;
        font-family: 'Google Sans', 'Roboto', sans-serif;
      }

      #vlibras-player-wrapper {
        background: linear-gradient(145deg, #ffffff, #f0f0f0);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1);
        overflow: hidden;
        width: 320px;
        transition: all 0.3s ease;
      }

      #vlibras-player-wrapper.minimized {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        cursor: pointer;
      }

      #vlibras-player-wrapper.minimized #vlibras-header,
      #vlibras-player-wrapper.minimized #vlibras-player-area,
      #vlibras-player-wrapper.minimized #vlibras-caption-display,
      #vlibras-player-wrapper.minimized #vlibras-footer {
        display: none;
      }

      #vlibras-player-wrapper.minimized::after {
        content: '🤟';
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        font-size: 28px;
      }

      #vlibras-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, #0078D4 0%, #005A9E 100%);
        color: white;
      }

      .vlibras-title {
        font-weight: 600;
        font-size: 14px;
      }

      .vlibras-controls button {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        margin-left: 6px;
        font-size: 16px;
        line-height: 1;
        transition: background 0.2s;
      }

      .vlibras-controls button:hover {
        background: rgba(255,255,255,0.3);
      }

      #vlibras-player-area {
        height: 300px;
        background: #e8e8e8;
        position: relative;
        overflow: hidden;
      }

      #vlibras-iframe {
        width: 100%;
        height: 100%;
        border: none;
      }

      #vlibras-caption-display {
        padding: 12px 16px;
        background: #f5f5f5;
        border-top: 1px solid #e0e0e0;
        min-height: 40px;
        max-height: 80px;
        overflow-y: auto;
      }

      #vlibras-current-text {
        font-size: 13px;
        color: #333;
        line-height: 1.4;
      }

      #vlibras-footer {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        background: white;
        border-top: 1px solid #e0e0e0;
      }

      .vlibras-btn {
        flex: 1;
        padding: 10px 16px;
        background: linear-gradient(135deg, #0078D4 0%, #005A9E 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 13px;
      }

      .vlibras-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,120,212,0.4);
      }

      .vlibras-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .vlibras-btn.translating {
        background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
      }

      #vlibras-avatar-select {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 13px;
        background: white;
        cursor: pointer;
      }

      /* Responsividade para telas menores */
      @media (max-width: 400px) {
        #vlibras-meet-container {
          right: 10px;
          bottom: 80px;
        }
        #vlibras-player-wrapper {
          width: 280px;
        }
        #vlibras-player-area {
          height: 250px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Configura comunicação com o iframe via postMessage
  setupIframeCommunication() {
    window.addEventListener('message', (event) => {
      // Verifica se é do nosso iframe
      if (!event.data || event.data.source !== 'vlibras-widget') return;

      console.log('[VLibras] Mensagem do iframe:', event.data);

      switch (event.data.type) {
        case 'ready':
          this.isReady = true;
          this.isLoaded = true;
          console.log('[VLibras] Widget iframe pronto!');
          break;
        case 'error':
          console.error('[VLibras] Erro no iframe:', event.data.message);
          break;
        case 'translating':
          console.log('[VLibras] Traduzindo:', event.data.text);
          break;
        case 'pong':
          console.log('[VLibras] Pong recebido, ready:', event.data.ready);
          break;
      }
    });

    // Envia ping para verificar se está pronto
    setTimeout(() => {
      this.sendToIframe({ type: 'ping' });
    }, 2000);
  }

  // Envia mensagem para o iframe
  sendToIframe(message) {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    }
  }

  // Configura event listeners
  setupEventListeners() {
    const wrapper = this.container.querySelector('#vlibras-player-wrapper');
    const minimizeBtn = this.container.querySelector('#vlibras-minimize');
    const closeBtn = this.container.querySelector('#vlibras-close');
    const translateBtn = this.container.querySelector('#vlibras-translate-btn');
    const avatarSelect = this.container.querySelector('#vlibras-avatar-select');

    minimizeBtn.addEventListener('click', () => {
      wrapper.classList.toggle('minimized');
    });

    wrapper.addEventListener('click', (e) => {
      if (wrapper.classList.contains('minimized') && e.target === wrapper) {
        wrapper.classList.remove('minimized');
      }
    });

    closeBtn.addEventListener('click', () => {
      this.container.style.display = 'none';
    });

    translateBtn.addEventListener('click', () => {
      if (this.currentText) {
        this.translate(this.currentText);
      }
    });

    avatarSelect.addEventListener('change', (e) => {
      this.changeAvatar(e.target.value);
    });
  }

  // Inicializa completamente
  async initialize() {
    try {
      await this.injectContainer();
      console.log('[VLibras] Inicialização completa');
    } catch (error) {
      console.error('[VLibras] Erro na inicialização:', error);
    }
  }

  // Atualiza o texto da legenda no display
  updateCaption(text, speaker = '') {
    if (!this.container) return;
    
    const captionEl = this.container.querySelector('#vlibras-current-text');
    const translateBtn = this.container.querySelector('#vlibras-translate-btn');
    
    if (captionEl) {
      const displayText = speaker ? `${speaker}: ${text}` : text;
      captionEl.textContent = displayText;
      this.currentText = text;
    }

    if (translateBtn) {
      translateBtn.disabled = !text || text.length < 2;
    }
  }

  // Traduz texto para Libras
  async translate(text) {
    if (!text || this.isTranslating) return;

    this.isTranslating = true;
    const translateBtn = this.container.querySelector('#vlibras-translate-btn');
    
    if (translateBtn) {
      translateBtn.textContent = '⏳ Traduzindo...';
      translateBtn.classList.add('translating');
    }

    try {
      // Envia texto para o iframe traduzir
      this.sendToIframe({ type: 'translate', text: text });
      console.log('[VLibras] Enviando para tradução:', text);
    } catch (error) {
      console.error('[VLibras] Erro na tradução:', error);
    } finally {
      // Restaura botão após 2 segundos
      setTimeout(() => {
        this.isTranslating = false;
        if (translateBtn) {
          translateBtn.textContent = '🤟 Traduzir';
          translateBtn.classList.remove('translating');
        }
      }, 2000);
    }
  }

  // Muda o avatar
  changeAvatar(avatarName) {
    this.currentAvatar = avatarName;
    this.sendToIframe({ type: 'changeAvatar', avatar: avatarName });
    console.log('[VLibras] Avatar alterado para:', avatarName);
  }

  // Mostra/esconde container
  toggle() {
    if (this.container) {
      this.container.style.display = 
        this.container.style.display === 'none' ? 'block' : 'none';
    }
  }

  // Mostra o container
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }
}

// Instância global do VLibras Manager
const vlibrasManager = new VLibrasManager();

// ===============================
// CaptionObserver - Classe otimizada
// ===============================

class CaptionObserver {
  constructor(options = {}) {
    this.onCaption = options.onCaption || (() => {});
    this.debounceDelay = options.debounceDelay || 100;
    this.finalizeDelay = options.finalizeDelay || 1500;
    
    this.observer = null;
    this.currentContainer = null;
    this.elementLastText = new WeakMap();
    this.finalizationTimers = new Map();
    this.captionIdCounter = 0;
    this.checkInterval = null;
  }

  // Seletores atualizados (2025/2026)
  static SELECTORS = {
    // Google Meet
    meet: {
      container: [
        '[role="region"].vNKgIf.UDinHf',
        '[role="region"][aria-label="Captions"]',
        '[role="region"][aria-label="Legendas"]',
        '[role="region"][aria-label="Subtítulos"]',
        '[jsname="dsdcsc"]',
        '.a4cQT'
      ],
      entry: '.nMcdL',
      text: '.ygicle.VbkSUe',
      textAlt: '.ygicle',
      speaker: '.NWpY1d',
      speakerAlt: '.adE6rb'
    },
    // Microsoft Teams
    teams: {
      container: [
        '[data-tid="closed-captions-text"]',
        '.ts-captions-container',
        '.closed-captions-container'
      ],
      entry: '.caption-item',
      text: '.caption-text',
      speaker: '.caption-speaker'
    },
    // Zoom
    zoom: {
      container: [
        '.transcript-message',
        '[class*="transcript"]',
        '.closed-caption-container'
      ],
      entry: '.transcript-line',
      text: '.closed-caption-text',
      speaker: null
    },
    // YouTube
    youtube: {
      container: [
        '.ytp-caption-window-container'
      ],
      entry: '.captions-text',
      text: '.ytp-caption-segment',
      speaker: null
    }
  };

  // Detecta plataforma
  static detectPlatform() {
    const url = window.location.href;
    if (url.includes('meet.google.com')) return 'meet';
    if (url.includes('teams.microsoft.com')) return 'teams';
    if (url.includes('zoom.us')) return 'zoom';
    if (url.includes('youtube.com')) return 'youtube';
    return 'unknown';
  }

  // Debounce helper
  debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Encontra container ativo baseado na plataforma
  findCaptionContainer() {
    const platform = CaptionObserver.detectPlatform();
    const selectors = CaptionObserver.SELECTORS[platform] || CaptionObserver.SELECTORS.meet;
    
    for (const selector of selectors.container) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('[CaptionObserver] Container encontrado:', selector);
        return { element, platform, selectors };
      }
    }
    return null;
  }

  // Processa entrada de legenda
  processCaption(entry, selectors, platform) {
    // Busca o nome do falante
    let speaker = 'Desconhecido';
    if (selectors.speaker) {
      const speakerEl = entry.querySelector(selectors.speaker) || 
                        (selectors.speakerAlt ? entry.querySelector(selectors.speakerAlt) : null);
      if (speakerEl) {
        speaker = speakerEl.textContent?.trim() || 'Desconhecido';
      }
    }

    // Busca o texto
    const textEl = entry.querySelector(selectors.text) || 
                   (selectors.textAlt ? entry.querySelector(selectors.textAlt) : null);
    
    if (!textEl) return;

    const text = textEl.textContent?.trim();
    if (!text || text.length < 2) return;

    // Verifica duplicação usando WeakMap
    const lastText = this.elementLastText.get(entry);
    if (lastText === text) return;

    this.elementLastText.set(entry, text);

    // Callback com dados da legenda
    this.onCaption({ 
      speaker, 
      text, 
      timestamp: Date.now(),
      platform 
    });
  }

  // Inicia observação
  start() {
    console.log('[CaptionObserver] Iniciando observação...');
    
    // Verifica periodicamente por containers
    this.checkInterval = setInterval(() => {
      const result = this.findCaptionContainer();
      if (result && result.element !== this.currentContainer) {
        this.observeContainer(result);
      }
    }, 2000);

    // Tenta imediatamente
    const result = this.findCaptionContainer();
    if (result) {
      this.observeContainer(result);
    }

    return () => this.stop();
  }

  // Observa container específico
  observeContainer({ element, platform, selectors }) {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.currentContainer = element;
    console.log('[CaptionObserver] Observando container para:', platform);

    const debouncedExtract = this.debounce(() => {
      const entries = element.querySelectorAll(selectors.entry);
      
      // Se não encontrar entries específicos, tenta extrair texto diretamente
      if (entries.length === 0) {
        const textEls = element.querySelectorAll(selectors.text) || 
                        (selectors.textAlt ? element.querySelectorAll(selectors.textAlt) : []);
        textEls.forEach(textEl => {
          const text = textEl.textContent?.trim();
          if (text && text.length >= 2) {
            const lastText = this.elementLastText.get(textEl);
            if (lastText !== text) {
              this.elementLastText.set(textEl, text);
              this.onCaption({
                speaker: 'Desconhecido',
                text,
                timestamp: Date.now(),
                platform
              });
            }
          }
        });
      } else {
        entries.forEach(entry => this.processCaption(entry, selectors, platform));
      }
    }, this.debounceDelay);

    this.observer = new MutationObserver(() => debouncedExtract());

    this.observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false // Performance: não observar atributos
    });

    // Processa legendas existentes
    debouncedExtract();
  }

  // Para observação
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('[CaptionObserver] Observação parada');
  }
}

// ===============================
// Comunicação com Background/Side Panel
// ===============================

async function sendCaptionToSidePanel(captionData) {
  try {
    await chrome.runtime.sendMessage({
      type: 'caption_update',
      text: captionData.text,
      speaker: captionData.speaker,
      platform: captionData.platform,
      timestamp: captionData.timestamp
    });
    console.log('[ContentScript] Legenda enviada:', captionData.text.substring(0, 50) + '...');
  } catch (error) {
    // Pode falhar se side panel não estiver aberto - isso é ok
    if (!error.message?.includes('Receiving end does not exist')) {
      console.error('[ContentScript] Erro ao enviar legenda:', error);
    }
  }
  
  // Atualiza também o widget VLibras na página
  vlibrasManager.updateCaption(captionData.text, captionData.speaker);
}

// ===============================
// Badge de Status
// ===============================

function createStatusBadge() {
  // Remove badge existente se houver
  const existingBadge = document.getElementById('libras-ext-badge');
  if (existingBadge) {
    existingBadge.remove();
  }

  const badge = document.createElement('div');
  badge.id = 'libras-ext-badge';
  badge.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #0078D4 0%, #005A9E 100%);
      color: white;
      padding: 8px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 2px 10px rgba(0,120,212,0.4);
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: transform 0.2s, box-shadow 0.2s;
    ">
      <span style="font-size: 16px;">🤟</span>
      <span>Libras</span>
      <span id="libras-status-dot" style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4CAF50;
        animation: pulse 2s infinite;
      "></span>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      #libras-ext-badge:hover > div {
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(0,120,212,0.5);
      }
    </style>
  `;
  
  badge.onclick = async () => {
    try {
      // Abre o Side Panel / Sidebar
      await chrome.runtime.sendMessage({ type: 'open_side_panel' });
    } catch (error) {
      console.log('[ContentScript] Erro ao abrir painel lateral:', error.message);
    }
  };

  document.body.appendChild(badge);
  console.log('[ContentScript] Badge de status criado');
}

function updateBadgeStatus(isCapturing) {
  const statusDot = document.getElementById('libras-status-dot');
  if (statusDot) {
    statusDot.style.background = isCapturing ? '#4CAF50' : '#FFC107';
  }
}

// ===============================
// Inicialização Principal
// ===============================

let captionObserver = null;
let lastCaptionText = '';
let captionDebounceTimer = null;
const CAPTION_DEBOUNCE = 800; // ms

function handleCaption(captionData) {
  // Debounce para evitar spam de legendas parciais
  clearTimeout(captionDebounceTimer);
  
  captionDebounceTimer = setTimeout(() => {
    // Evita duplicatas
    if (captionData.text === lastCaptionText) return;
    lastCaptionText = captionData.text;
    
    sendCaptionToSidePanel(captionData);
    updateBadgeStatus(true);
  }, CAPTION_DEBOUNCE);
}

async function init() {
  console.log('[ContentScript] Iniciando extensão Tradutor Libras...');

  const platform = CaptionObserver.detectPlatform();
  console.log('[ContentScript] Plataforma detectada:', platform);

  if (platform === 'unknown') {
    console.log('[ContentScript] Plataforma não suportada, encerrando');
    return;
  }

  // Inicializa o VLibras Widget na página
  await vlibrasManager.initialize();

  // Cria badge de status
  createStatusBadge();

  // Inicia observador de legendas
  captionObserver = new CaptionObserver({
    onCaption: handleCaption,
    debounceDelay: 100
  });

  captionObserver.start();

  console.log('[ContentScript] Extensão inicializada com sucesso!');
  console.log('[ContentScript] Aguardando legendas... Ative as legendas na sua reunião.');
}

// ===============================
// Lifecycle
// ===============================

// Aguarda DOM estar pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Limpeza ao descarregar
window.addEventListener('unload', () => {
  if (captionObserver) {
    captionObserver.stop();
  }
});

// Pausa quando aba não está visível (economia de recursos)
document.addEventListener('visibilitychange', () => {
  if (!captionObserver) return;
  
  if (document.hidden) {
    console.log('[ContentScript] Aba oculta, pausando observação');
    captionObserver.stop();
  } else {
    console.log('[ContentScript] Aba visível, retomando observação');
    captionObserver.start();
  }
});

// ===============================
// Mensagens do Background
// ===============================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'get_platform':
      sendResponse({ platform: CaptionObserver.detectPlatform() });
      break;
      
    case 'toggle_capture':
      if (message.enabled && !captionObserver) {
        captionObserver = new CaptionObserver({ onCaption: handleCaption });
        captionObserver.start();
      } else if (!message.enabled && captionObserver) {
        captionObserver.stop();
        captionObserver = null;
      }
      sendResponse({ success: true });
      break;
    
    case 'toggle_vlibras':
      vlibrasManager.toggle();
      sendResponse({ success: true });
      break;
    
    case 'translate_text':
      if (message.text) {
        vlibrasManager.translate(message.text);
        sendResponse({ success: true });
      } else {
        sendResponse({ error: 'No text provided' });
      }
      break;
    
    case 'change_avatar':
      if (message.avatar) {
        vlibrasManager.changeAvatar(message.avatar);
        sendResponse({ success: true });
      }
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  return true;
});
