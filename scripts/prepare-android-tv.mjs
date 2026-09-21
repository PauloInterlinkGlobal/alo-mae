import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('🚀 [prepare-android-tv] Iniciando sincronização e preparação Android...');

// 1. Executar sincronização do Capacitor
console.log('🔄 Executando npx cap sync android...');
try {
  execSync('npx cap sync android', { stdio: 'inherit' });
  console.log('✅ Capacitor sincronizado com sucesso.');
} catch (error) {
  console.error('❌ Falha ao sincronizar Capacitor:', error);
  process.exit(1);
}

// 2. Ajustar AndroidManifest.xml para suporte híbrido (Mobile + Android TV / Leanback)
const manifestPath = resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml');

if (existsSync(manifestPath)) {
  let manifest = readFileSync(manifestPath, 'utf8');

  let modified = false;

  // Garantir que touchscreen não é obrigatório para compatibilidade TV / Kiosk
  if (!manifest.includes('android.hardware.touchscreen')) {
    manifest = manifest.replace(
      '</manifest>',
      '    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n</manifest>'
    );
    modified = true;
  }

  // Garantir leanback opcional
  if (!manifest.includes('android.software.leanback')) {
    manifest = manifest.replace(
      '</manifest>',
      '    <uses-feature android:name="android.software.leanback" android:required="false" />\n</manifest>'
    );
    modified = true;
  }

  if (modified) {
    writeFileSync(manifestPath, manifest, 'utf8');
    console.log('✅ AndroidManifest.xml ajustado com features Leanback opcionais.');
  } else {
    console.log('ℹ️ AndroidManifest.xml já contém as diretivas de compatibilidade.');
  }
} else {
  console.warn('⚠️ AndroidManifest.xml não encontrado no caminho esperado.');
}

console.log('🎉 [prepare-android-tv] Preparação concluída.');
