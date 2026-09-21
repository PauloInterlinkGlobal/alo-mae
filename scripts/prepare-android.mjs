#!/usr/bin/env node
/**
 * Prepara o projeto Android (Capacitor) para o build no CI.
 * Destino: telemóveis e tablets Android.
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const webDir = path.join(root, 'out');
const androidDir = path.join(root, 'android');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root });
}

function fail(msg) {
  console.error(`\n[prepare-android] ERRO: ${msg}`);
  process.exit(1);
}

// 1. Verificar build web estático
if (!existsSync(path.join(webDir, 'index.html'))) {
  fail('A pasta "out" não foi encontrada. Execute "npm run build" antes (next.config.ts usa output: "export").');
}

// 2. Criar plataforma Android se necessário
if (!existsSync(androidDir)) {
  console.log('[prepare-android] Pasta "android" não existe. A criar plataforma...');
  run('npx cap add android');
} else {
  console.log('[prepare-android] Pasta "android" já existe.');
}

// 3. Sincronizar assets web + plugins
run('npx cap sync android');

console.log('\n[prepare-android] Projeto Android pronto para o Gradle.');
