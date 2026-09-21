#!/usr/bin/env node
/**
 * Prepara o projeto Android (Capacitor) para o build no CI.
 * Destino: telemóveis e tablets Android.
 *
 * Passos:
 *  1. Garante que o build web estático existe em ./out
 *  2. Cria a plataforma Android se ./android não existir
 *  3. Valida/repara o settings.gradle (projeto ':capacitor-cordova-android-plugins')
 *  4. Sincroniza assets e plugins (cap sync)
 *  5. Verifica que os ficheiros gerados pelo Capacitor existem
 */
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const webDir = path.join(root, 'out');
const androidDir = path.join(root, 'android');
const settingsPath = path.join(androidDir, 'settings.gradle');

const CORDOVA_PROJECT = ':capacitor-cordova-android-plugins';
const CORDOVA_INCLUDE =
  `include '${CORDOVA_PROJECT}'\n` +
  `project('${CORDOVA_PROJECT}').projectDir = new File('./capacitor-cordova-android-plugins/')\n`;
const APPLY_LINE = "apply from: 'capacitor.settings.gradle'";

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root });
}

function fail(msg) {
  console.error(`\n[prepare-android] ERRO: ${msg}`);
  process.exit(1);
}

function addPlatform() {
  run('npx cap add android');
}

// 1. Verificar build web
if (!existsSync(path.join(webDir, 'index.html'))) {
  fail('A pasta "out" não foi encontrada. Execute "npm run build" antes (next.config.ts usa output: "export").');
}

// 2. Criar plataforma Android se necessário
if (!existsSync(androidDir)) {
  console.log('[prepare-android] Pasta "android" não existe. A criar plataforma...');
  addPlatform();
} else {
  console.log('[prepare-android] Pasta "android" já existe.');
}

// 3. Validar / reparar settings.gradle
if (!existsSync(settingsPath)) {
  console.log('[prepare-android] android/settings.gradle não existe. A recriar a plataforma...');
  rmSync(androidDir, { recursive: true, force: true });
  addPlatform();
}

let settings = readFileSync(settingsPath, 'utf8');
let patched = false;

if (!settings.includes(CORDOVA_PROJECT)) {
  console.log(`[prepare-android] settings.gradle não declara ${CORDOVA_PROJECT}. A corrigir...`);
  if (settings.includes(APPLY_LINE)) {
    settings = settings.replace(APPLY_LINE, `${CORDOVA_INCLUDE}\n${APPLY_LINE}`);
  } else {
    settings = `${settings.trimEnd()}\n\n${CORDOVA_INCLUDE}\n${APPLY_LINE}\n`;
  }
  patched = true;
} else if (!settings.includes(APPLY_LINE)) {
  console.log('[prepare-android] settings.gradle não aplica capacitor.settings.gradle. A corrigir...');
  settings = `${settings.trimEnd()}\n\n${APPLY_LINE}\n`;
  patched = true;
}

if (patched) {
  writeFileSync(settingsPath, settings);
  console.log('[prepare-android] settings.gradle atualizado.');
}

// 4. Sincronizar assets + plugins (gera capacitor.settings.gradle e capacitor-cordova-android-plugins/)
run('npx cap sync android');

// 5. Verificar ficheiros gerados
const required = [
  path.join(androidDir, 'capacitor.settings.gradle'),
  path.join(androidDir, 'capacitor-cordova-android-plugins', 'build.gradle'),
  path.join(androidDir, 'app', 'src', 'main', 'assets', 'public', 'index.html'),
];

for (const file of required) {
  if (!existsSync(file)) {
    fail(`Ficheiro esperado não foi gerado pelo Capacitor: ${path.relative(root, file)}`);
  }
}

console.log('\n[prepare-android] Projeto Android pronto para o Gradle.');
