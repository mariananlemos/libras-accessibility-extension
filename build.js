/**
 * Build Script - Gera versões da extensão para cada navegador
 * 
 * Uso:
 *   node build.js chrome    → Prepara para Chrome (padrão)
 *   node build.js edge      → Prepara para Edge  
 *   node build.js firefox   → Prepara para Firefox
 *   node build.js all       → Gera pacotes para todos os navegadores
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const SRC_DIR = __dirname;

// Arquivos que fazem parte da extensão
const EXTENSION_FILES = [
  'background.js',
  'contentScript.js',
  'popup.html',
  'popup.js',
  'styles.css',
  'sidepanel/sidepanel.html',
  'sidepanel/sidepanel.js',
  'sidepanel/sidepanel.css',
  'vlibras-widget/widget.html',
  'vlibras-widget/widget.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

function copyFileSync(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function buildForBrowser(browser) {
  const outputDir = path.join(DIST_DIR, browser);

  // Limpa diretório de saída
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // Copia todos os arquivos da extensão
  for (const file of EXTENSION_FILES) {
    const srcFile = path.join(SRC_DIR, file);
    const destFile = path.join(outputDir, file);

    if (fs.existsSync(srcFile)) {
      copyFileSync(srcFile, destFile);
    } else {
      console.warn(`  ⚠️  Arquivo não encontrado: ${file}`);
    }
  }

  // Copia o manifest correto
  if (browser === 'firefox') {
    const firefoxManifest = path.join(SRC_DIR, 'manifest-firefox.json');
    if (fs.existsSync(firefoxManifest)) {
      copyFileSync(firefoxManifest, path.join(outputDir, 'manifest.json'));
    } else {
      console.error('  ❌ manifest-firefox.json não encontrado!');
      return false;
    }
  } else {
    // Chrome e Edge usam o mesmo manifest
    copyFileSync(path.join(SRC_DIR, 'manifest.json'), path.join(outputDir, 'manifest.json'));
  }

  console.log(`  ✅ Build para ${browser} gerado em: dist/${browser}/`);
  return true;
}

// ===============================
// Main
// ===============================

const target = process.argv[2] || 'all';

console.log('🔧 Build da extensão Tradutor Libras\n');

switch (target) {
  case 'chrome':
    buildForBrowser('chrome');
    break;
  case 'edge':
    buildForBrowser('edge');
    break;
  case 'firefox':
    buildForBrowser('firefox');
    break;
  case 'all':
    console.log('Gerando builds para todos os navegadores...\n');
    buildForBrowser('chrome');
    buildForBrowser('edge');
    buildForBrowser('firefox');
    break;
  default:
    console.log('Uso: node build.js [chrome|edge|firefox|all]');
    process.exit(1);
}

console.log('\n📋 Próximos passos:');
if (target === 'firefox' || target === 'all') {
  console.log('  Firefox: Abra about:debugging → "Este Firefox" → "Carregar extensão temporária" → selecione dist/firefox/manifest.json');
}
if (target === 'chrome' || target === 'all') {
  console.log('  Chrome:  Abra chrome://extensions → "Modo desenvolvedor" → "Carregar sem compactação" → selecione dist/chrome/');
}
if (target === 'edge' || target === 'all') {
  console.log('  Edge:    Abra edge://extensions → "Modo desenvolvedor" → "Carregar sem compactação" → selecione dist/edge/');
}
