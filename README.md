# 🤟 Tradutor Libras - Extensão para Reuniões Online

Extensão Chrome que traduz legendas de reuniões online (Google Meet, Microsoft Teams, Zoom) para **Libras** (Língua Brasileira de Sinais) usando o **VLibras**.

![Version](https://img.shields.io/badge/version-2.1-blue)
![Chrome](https://img.shields.io/badge/Chrome-116+-green)

## ✨ Funcionalidades

- **Avatar 3D integrado**: O personagem VLibras aparece diretamente na página da reunião
- **Captura automática de legendas**: Detecta legendas do Google Meet, Teams, Zoom e YouTube
- **Tradução em tempo real**: Traduz texto para Libras usando a API oficial do VLibras
- **Três avatares disponíveis**: Ícaro, Hosana e Guga
- **Widget flutuante**: Pode ser minimizado, movido e redimensionado
- **Histórico de legendas**: Mantém registro das últimas legendas
- **Tradução automática** (opcional): Traduz automaticamente cada nova legenda

## 🚀 Instalação

1. Clone ou baixe este repositório
2. Acesse `chrome://extensions/` no Chrome
3. Ative o **Modo do desenvolvedor**
4. Clique em **Carregar sem compactação**
5. Selecione a pasta da extensão

## 📖 Como Usar

1. **Entre em uma reunião** (Google Meet, Teams ou Zoom)
2. **Ative as legendas** na plataforma de reunião
3. O **widget VLibras** aparecerá automaticamente no canto inferior direito
4. As legendas serão exibidas e você pode clicar em **"Traduzir"** para ver a tradução em Libras
5. Use o **painel lateral** (clique no ícone da extensão) para ver o histórico de legendas

## 🛠️ Tecnologias Utilizadas

- **VLibras API**: API oficial do governo brasileiro para tradução em Libras
  - Tradutor: `https://traducao2.vlibras.gov.br/translate`
  - Dicionário: `https://dicionario2.vlibras.gov.br/`
  - Plugin: `https://vlibras.gov.br/app/vlibras-plugin.js`
- **Chrome Extension Manifest V3**
- **Vanilla JavaScript** (sem frameworks)

## 📁 Estrutura do Projeto

```
extensao-libras/
├── manifest.json          # Configuração da extensão
├── contentScript.js       # Script principal (captura legendas + VLibras)
├── background.js          # Service worker
├── popup.html/js          # Popup da extensão
├── styles.css             # Estilos globais
├── sidepanel/             # Painel lateral
│   ├── sidepanel.html
│   ├── sidepanel.css
│   └── sidepanel.js
└── icons/                 # Ícones da extensão
```

## 🔗 Links Úteis

- [VLibras - Site Oficial](https://vlibras.gov.br)
- [VLibras no GitHub](https://github.com/spbgovbr-vlibras)
- [VLibras API Translator](https://github.com/spbgovbr-vlibras/vlibras-translator-api)

## 📄 Licença

Este projeto utiliza a API do VLibras, que é um software livre do Governo Brasileiro licenciado sob LGPLv3.

---

**Desenvolvido para promover acessibilidade em reuniões online** 🤝