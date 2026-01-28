/**
 * Content Script - Captura de Legendas
 * Captura legendas de plataformas de reunião e envia para o Side Panel
 */

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
      // Abre o Side Panel
      await chrome.runtime.sendMessage({ type: 'open_side_panel' });
    } catch (error) {
      console.log('[ContentScript] Clique para abrir Side Panel manualmente');
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
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  return true;
});
