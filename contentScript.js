(async function() {
  // --- configurações ---
  const LEGENDAS_CHECK_INTERVAL = 800; // ms para verificar novas legendas
  const TIMEOUT_LEGENDAS = 3000; // ms ; se nada encontrado, ativa fallback
  const AUDIO_CHUNK_MS = 2000; // 2s por blob
  const DEFAULT_BACKEND = 'http://localhost:5000/upload';

  // --- utilidades storage ---
  async function getBackendUrl() {
    return new Promise(resolve => {
      chrome.storage.sync.get({ backendUrl: DEFAULT_BACKEND }, (items) => {
        resolve(items.backendUrl);
      });
    });
  }

  // --- injeta VLibras (se necessário) ---
  function injectVlibras() {
    if (window.VLibras && window.VLibras.Widget) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
      s.onload = () => {
        try { new window.VLibras.Widget('https://vlibras.gov.br/app'); } catch(e) {}
        // aguarda um pouco para widget se estabilizar
        setTimeout(resolve, 600);
      };
      s.onerror = () => reject(new Error('Falha ao carregar VLibras'));
      document.head.appendChild(s);
    });
  }

  // --- cria div oculta para VLibras ler texto (mesma técnica do PoC) ---
  function sendToVlibras(texto) {
    if (!texto || texto.trim().length === 0) return;
    const div = document.createElement('div');
    div.setAttribute('vw-access-button', 'false');
    div.setAttribute('vw-text', texto);
    div.style.display = 'none';
    document.body.appendChild(div);
    console.log('[EXT] enviado ao VLibras:', texto);
  }

  // --- função para enviar audio blob ao backend ---
  async function sendAudioBlobToBackend(blob) {
    const backend = await getBackendUrl();
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'chunk.webm');

      const resp = await fetch(backend, { method: 'POST', body: fd });
      if (!resp.ok) {
        console.error('[EXT] backend retornou erro', resp.statusText);
        return null;
      }
      const json = await resp.json();
      const texto = json.texto || json.text || json.result || null;
      return texto;
    } catch (err) {
      console.error('[EXT] erro enviando audio ao backend', err);
      return null;
    }
  }

  // --- DETECÇÃO DE LEGENDAS (variantes por plataforma) ---
  // Vamos buscar por elementos comuns de legenda (Google Meet, Teams, YouTube)
  function findCaptionElement() {
    // 1) Google Meet: .QvAawe (pode variar) — vamos procurar por elementos com role="region" e aria-live
    const candidates = Array.from(document.querySelectorAll('[aria-live], [role="log"], [role="region"], span, div'));
    // procura por elemento com texto recente e visível
    for (const el of candidates) {
      try {
        if (!el.offsetParent) continue; // invisível
        const txt = (el.innerText || el.textContent || '').trim();
        if (txt.length > 0 && txt.length < 500) {
          // heurística: conter várias palavras e pouco elemento filho
          return el;
        }
      } catch (e) { /* ignore */ }
    }
    return null;
  }

  // Observador alternativo para Google Meet específico (mais seguro)
  function observeMeetCaptions(onNew) {
    // Google Meet coloca legendas em <div role="region" aria-live="polite">, mas varia por versão
    const check = () => {
      const el = document.querySelector('[aria-live="polite"], [aria-live="assertive"]');
      if (el && el.innerText.trim()) {
        onNew(el.innerText.trim());
      }
    };
    return setInterval(check, LEGENDAS_CHECK_INTERVAL);
  }

  // Generic polling for caption changes
  function startPollingCaptions(onNew) {
    let last = '';
    const interval = setInterval(() => {
      const el = findCaptionElement();
      if (!el) return;
      const txt = el.innerText.trim();
      if (txt && txt !== last) {
        last = txt;
        onNew(txt);
      }
    }, LEGENDAS_CHECK_INTERVAL);
    return interval;
  }

  // --- Fallback: captura de áudio via getDisplayMedia (pede ao usuário compartilhar a aba ou janela)
  async function startAudioCaptureFallback(onText) {
    try {
      // pede ao usuário compartilhar a aba (ou tela) com áudio
      const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false });
      // mediaRecorder no contexto do content script
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.addEventListener('dataavailable', async (e) => {
        if (e.data && e.data.size > 1000) {
          const texto = await sendAudioBlobToBackend(e.data);
          if (texto) onText(texto);
        }
      });
      recorder.start(AUDIO_CHUNK_MS); // envia a cada N ms
      // para quando a stream terminar (usuário clicando no stop do compartilhamento)
      stream.getTracks().forEach(track => track.addEventListener('ended', () => {
        recorder.stop();
      }));
      return recorder;
    } catch (err) {
      console.error('[EXT] falha ao iniciar captura de áudio (fallback):', err);
      return null;
    }
  }

  // --- Lógica principal: tenta legenda; se não achar em X ms, ativa fallback áudio ---
  try {
    await injectVlibras();
  } catch (err) {
    console.warn('[EXT] VLibras não carregou:', err);
  }

  // UI mínima: cria um pequeno badge para status
  function createBadge() {
    if (document.getElementById('libras-ext-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'libras-ext-badge';
    badge.style.position = 'fixed';
    badge.style.right = '12px';
    badge.style.bottom = '12px';
    badge.style.zIndex = 2147483647;
    badge.style.background = 'rgba(255,255,255,0.95)';
    badge.style.padding = '8px';
    badge.style.borderRadius = '8px';
    badge.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
    badge.style.fontFamily = 'Arial, sans-serif';
    badge.innerHTML = `<div style="font-weight:bold;margin-bottom:6px;">Libras Ext</div>
                       <div id="libras-ext-status">Procurando legenda...</div>
                       <div style="margin-top:6px;"><button id="libras-ext-toggle">Ativar Fallback Áudio</button></div>`;
    document.body.appendChild(badge);

    document.getElementById('libras-ext-toggle').addEventListener('click', async () => {
      // iniciar fallback manual
      const rec = await startAudioCaptureFallback(async (texto) => {
        // mostra e envia ao VLibras
        document.getElementById('libras-ext-status').innerText = 'Último (audio): ' + texto.slice(0, 60);
        sendToVlibras(texto);
      });
      if (rec) document.getElementById('libras-ext-status').innerText = 'Fallback áudio ligado';
    });
  }

  createBadge();

  // primeiro tenta capturar legendas por X ms
  let captionInterval = null;
  let observed = false;
  const onNewCaption = (txt) => {
    observed = true;
    // exibe status e envia ao VLibras
    const el = document.getElementById('libras-ext-status');
    if (el) el.innerText = 'Último (legenda): ' + txt.slice(0, 80);
    sendToVlibras(txt);
  };

  captionInterval = startPollingCaptions(onNewCaption);

  // se depois de TIMEOUT_LEGENDAS nada encontrado, ativa fallback sugerindo ao usuário
  setTimeout(() => {
    if (!observed) {
      const el = document.getElementById('libras-ext-status');
      if (el) el.innerText = 'Legenda não detectada – ative fallback áudio';
      // não ativa automaticamente para não pedir getDisplayMedia sem consentimento
    } else {
      const el = document.getElementById('libras-ext-status');
      if (el) el.innerText = 'Legenda detectada — tradução automática ativa';
    }
  }, TIMEOUT_LEGENDAS);
})();