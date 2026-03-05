# 🤟 Tradutor Libras - Extensão de Acessibilidade

Extensão de navegador que traduz legendas de reuniões online para Libras usando o VLibras com avatar 3D integrado.

![Status](https://img.shields.io/badge/status-in%20development-yellow)

## Sobre

Captura legendas de plataformas de videoconferência (Google Meet, Microsoft Teams, Zoom) e vídeos (YouTube) e traduz automaticamente para Língua Brasileira de Sinais (Libras) usando o VLibras.

## Navegadores Suportados

| Navegador | Status | Versão Mínima |
|-----------|--------|---------------|
| Google Chrome | ✅ Suportado | 116+ |
| Microsoft Edge | ✅ Suportado | 116+ |
| Mozilla Firefox | ✅ Suportado | 115+ |

## Instalação (Modo Desenvolvedor)

### Opção 1: Carregar diretamente (desenvolvimento rápido)

#### Google Chrome
1. Abra `chrome://extensions/`
2. Ative o **Modo desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta raiz da extensão

#### Microsoft Edge
1. Abra `edge://extensions/`
2. Ative o **Modo desenvolvedor** (barra lateral esquerda)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta raiz da extensão

#### Mozilla Firefox
1. Abra `about:debugging#/runtime/this-firefox`
2. Clique em **Carregar extensão temporária...**
3. Selecione o arquivo `manifest-firefox.json` na pasta da extensão

### Opção 2: Usar o build script (recomendado)

```bash
# Gerar builds para todos os navegadores
node build.js all

# Ou para um navegador específico
node build.js chrome
node build.js edge
node build.js firefox
```

Os builds são gerados na pasta `dist/` com o manifest correto para cada navegador.

## Plataformas Suportadas

- **Google Meet** - Captura legendas automáticas
- **Microsoft Teams** - Captura legendas/transcrição
- **Zoom** - Captura legendas da reunião  
- **YouTube** - Captura legendas de vídeos

## Como Usar

1. Abra uma reunião ou vídeo em uma plataforma suportada
2. Ative as legendas na plataforma (botão CC)
3. Clique no ícone da extensão e em "Abrir Painel de Tradução"
4. O VLibras traduzirá automaticamente as legendas para Libras

## Diferenças entre Navegadores

| Recurso | Chrome/Edge | Firefox |
|---------|-------------|---------|
| Painel lateral | Side Panel (nativo) | Sidebar Action |
| Background | Service Worker | Background Script |
| Manifest | manifest.json | manifest-firefox.json |

## Estrutura do Projeto

```
├── manifest.json              # Manifest para Chrome/Edge
├── manifest-firefox.json      # Manifest para Firefox
├── background.js              # Service Worker / Background Script
├── contentScript.js           # Script injetado nas páginas
├── popup.html / popup.js      # Popup da extensão
├── styles.css                 # Estilos do content script
├── build.js                   # Script de build multi-navegador
├── icons/                     # Ícones da extensão
├── sidepanel/                 # Painel lateral
│   ├── sidepanel.html
│   ├── sidepanel.js
│   └── sidepanel.css
└── vlibras-widget/            # Widget VLibras (iframe)
    ├── widget.html
    └── widget.js
```

---

Desenvolvido com ❤️ para acessibilidade | Powered by [VLibras](https://www.vlibras.gov.br/)
