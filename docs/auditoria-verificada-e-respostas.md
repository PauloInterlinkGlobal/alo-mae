# Auditoria verificada no código real + Respostas às 10 perguntas

**Data:** 2026-09-24
**Método:** verificação linha-a-linha no repositório (`arena/01a0d587-alo-mae` @ `2d2c353` + docs)
**Propósito:** corrigir a auditoria externa antes da 2ª etapa e da geração do prompt de alteração de código

---

## Parte 1 — Verificação das alegações da auditoria

### ✅ CONFIRMADAS (o auditor tinha razão)

| # | Alegação | Veredicto | Evidência |
|---|---|---|---|
| C1 | "O código não faz reconhecimento facial real" | **CONFIRMADA — ponto mais grave** | `lib/biometrics/engine.ts`: `generateSeedEmbeddingForStudent()` gera embeddings **sintéticos** (Xorshift32 + Box-Muller a partir do hash da matrícula — não há rede neural). O rótulo `algorithm: 'mobilefacenet-v1'` é apenas uma string. `extractBiometricFromSource()` usa **heurística de crominidade de pele** para achar a caixa do rosto e um descritor HOG artesanal de 128 dimensões (grelha 4×4 × 8 momentos). Comparar esse descritor contra embeddings *semeados* não identifica ninguém — é uma simulação sofisticada de pipeline completo. |
| C2 | Regras Firestore abertas (`\|\| true`) | **CONFIRMADA** | `firestore.rules` linhas 96–365: leitura pública em múltiplas coleções, escrita aberta em `accessLogs` (154–171), `students`, `notifications`, `conversations` (302+), `medicalGuides` (354). Inaceitável com dados biométricos de menores. |
| C3 | Duplicação `registerBiometricAccess` | **CONFIRMADA** | `lib/context.tsx:407` e `services/access-logs.service.ts:39`. O domínio oficial é `services/attendance-engine.service.ts` (`registerAttendanceBiometricEvent`), mas a duplicada ainda é usada pelo `terminal-simulado` e — pior — pela fila offline (ver D1 abaixo). |
| C4 | Horário hard-coded no motor de presença | **CONFIRMADA** | `attendance-engine.service.ts:47` — `currentHour >= 12 && currentMin >= 30` decide SAIDA_OFICIAL vs SAIDA_TEMPORARIA. Precisa de `attendanceSchedule` configurável (ponto 17 da auditoria procede). |
| C5 | Terminal depende de Firestore antes de registrar | **CONFIRMADA (parcial)** | `registerAttendanceBiometricEvent()` faz `getDoc(studentRef)` no início — quando ONLINE o registro depende de rede mesmo com aluno em cache local. Quebra o requisito offline-first no caminho principal. |
| C6 | Impressão digital é só ícone, sem sensor | **CONFIRMADA** | Não há integração com hardware nenhum; a decisão de hardware foi tomada no ADR 0001 (leitor externo USB, SecuGen Hamster Pro 20). |

### ❌ REFUTADAS / DESATUALIZADAS (auditoria equivocada — provavelmente auditou o simulador)

| # | Alegação | Realidade no código |
|---|---|---|
| R1 | "Tela tem select de aluno, foto do aluno em foco, botão Confirmar Entrada/Saída" | **Isso é `app/admin/terminal-simulado/page.tsx`** (ferramenta admin de testes). O terminal real (`app/aluno/terminal/page.tsx`) **não tem** select de aluno nem botão confirmar; o único `<select>` (linha 901) é de **turma no painel de configuração**. |
| R2 | "Reconhecimento simulado via `setTimeout`" | Os `setTimeout` (345/391/396) são o **agendador do loop de frames** (~4,5 FPS). O fluxo é contínuo e hands-free. A simulação existe no nível do **algoritmo** (C1), não no nível do fluxo. |
| R3 | "`type: 'entry' \| 'exit'` é insuficiente; faltam attendanceEvents + dailyAttendance + motor de estados" | **Já existe tudo**: `AttendanceEventType = ENTRADA \| SAIDA_TEMPORARIA \| RETORNO \| SAIDA_OFICIAL` (`lib/types.ts:337`), máquina de estados AUSENTE→PRESENTE→FORA_TEMPORARIAMENTE→SAIU_OFICIALMENTE, coleções `attendanceEvents` e `dailyAttendance`, comprovante (`receiptCode`), notificação ao encarregado e batch atômico — em `attendance-engine.service.ts`. A auditoria "propõe" exatamente o que já está implementado. |
| R4 | "Botão 'Ativar Câmera do Totem' precisa desaparecer" | Câmera **já ativa automaticamente** no mount (`page.tsx:196–198`). O botão existe só no simulador admin. |
| R5 | "`terminal_facial_01` hard-coded" | Hoje é `TerminalConfig` estruturada com `deviceId: 'terminal-01'`, `matchThreshold`, `cooldownSeconds`, `targetClassId` (localStorage por tablet). **Parcialmente procede**: falta migrar a config para `terminals/{deviceId}` no Firestore com push remoto. |
| R6 | "Terminal preso a dados fictícios `school_horizonte_luanda` / `turma_10a`" | São apenas **defaults** de `DEFAULT_TERMINAL_CONFIG` substituíveis via painel; mas os *fallbacks* dentro de `registerAttendanceBiometricEvent` ('turma_10a', foto Unsplash) são reais e devem ser removidos. |

### 🆕 BUG NOVO encontrado nesta verificação (não estava na auditoria)

**D1 — A fila offline contorna o motor de presença.** `lib/biometrics/offline-sync.ts:2` importa `registerBiometricAccess` de `services/access-logs.service.ts` (a duplicada). Ao voltar a Internet, `flushQueue()` grava **apenas `accessLogs`** — os eventos sincronizados offline **nunca criam `attendanceEvents`, nem `dailyAttendance`, nem atualizam o estado do aluno, nem notificam o encarregado**. Relatório diário e app do pai ficam cegos para qualquer dia com offline. **Correção obrigatória na fase 2:** a fila deve enfileirar o evento completo e a sincronização deve passar pelo mesmo `registerAttendanceBiometricEvent`.

**D2 — Vazamento de escopo do pool.** `page.tsx` (`activeStudentPool`): se o filtro de turma não retornar nada, faz fallback para **todos os alunos** (`filtered.length > 0 ? filtered : students`). Um terminal de sala pode acabar reconhecendo a escola inteira — viola a regra "terminal só conhece a própria turma" (ponto 8 da auditoria procede como correção).

---

## Parte 2 — Respostas às 10 perguntas

| # | Pergunta | Decisão |
|---|---|---|
| **1** | Hardware da digital | **B — Leitor USB OTG: SecuGen Hamster Pro 20** (formalizado no ADR 0001, `docs/adr-0001-fallback-biometrico-terminal.md`). FDx SDK Pro Android (gratuito); 1:N = loop 1:1 sobre os 20–30 templates da turma via plugin Capacitor nativo `FingerprintSecugen`. O sensor integrado do tablet fica **exclusivamente para autenticação do operador** (`BiometricPrompt`). Não é D — hardware já decidido. |
| **2** | Uso dos dois métodos | **A, com a digital sempre "armada"**: facial é o método principal; se a face não é identificada dentro da janela de tentativas, o terminal passa automaticamente ao estado "COLOQUE O DEDO". Se o leitor estiver presente, um dedo colocado **a qualquer momento** é processado imediatamente (event-driven, sem seletor de método na tela). |
| **3** | Aluno toca na tela? | **NÃO** — nem no facial (já é assim no terminal real), nem na digital (dedo no leitor externo; zero interação com a tela). Interação de toque existe só para o **operador** (config/cadastro, autenticado). |
| **4** | Face falhou → ? | **B** — janela de tentativas faciais (~8–10 s de frames com qualidade ≥ limiar) → transição **automática** para o estado "COLOQUE O DEDO" (sem toque). Enquanto isso, a digital permanece armada. |
| **5** | Aluno de outra turma | **A** — o terminal reconhece a identidade, **rejeita o acesso**, registra tentativa (`attendanceEvents` com `type: 'ACESSO_REJEITADO'` + motivo `FORA_DA_TURMA`, e log de auditoria), mostra mensagem genérica e NÃO registra presença. Se o aluno for de outra escola, mensagem ainda mais genérica ("não autorizado neste terminal"). **Correção D2 elimina o vazamento que hoje permitiria o cenário inverso.** |
| **6** | Quem autoriza saída temporária | **D — Professor OU instituição**, com o fluxo de solicitação do encarregado (opção C) como caminho de pedido: encarregado pede no app → professor/instituição aprova → nasce `exitAuthorizations/{id}` (studentId, classId, janela de validade, motivo, aprovador) → o terminal valida a autorização ao decidir `SAIDA_TEMPORARIA`; sem autorização válida → `ACESSO_REJEITADO` (motivo `SEM_AUTORIZACAO`) + notificação ao encarregado. |
| **7** | Offline | **SIM** — exatamente como formulado: reconhecimento local, evento local, fila, sincroniza quando a Internet volta. **Com a correção D1 obrigatória** (fila → mesmo motor de domínio) e usando IndexedDB (não localStorage, hoje) para a fila. |
| **8** | Embeddings, não fotos | **SIM** — decisão mantida e reforçada: nada de imagem facial ou da digital armazenada para matching; embeddings faciais + templates ISO 19794-2, **cifrados no dispositivo**, com envio ao Firebase apenas do necessário para sincronização entre dispositivos de cadastro/terminal. Coleção `biometricProfiles` com regras restritas (fecha C2). |
| **9** | Quem cadastra a biometria | **A — instituição**, executada por operador autenticado num **fluxo de cadastro dedicado** (variante C como modo de execução): secretária/admin abre o modo cadastro no terminal (desbloqueado com a própria biometria do operador via sensor integrado ou credenciais), captura facial multi-frame real + digitais. Professor não cadastra biometria por padrão. Re-cadastro anual por renovação de matrícula. |
| **10** | 1 terminal = 1 turma (20–30 alunos) | **SIM** — escopo por turma confirmado; o pool do terminal carrega somente os alunos autorizados daquela turma (embeddings + templates). A correção D2 elimina o fallback atual que vaza a escola inteira. Caso especial "portaria geral" (multi-turma) continua suportado como configuração explícita `targetClassId: 'all'`, nunca como fallback silencioso. |

---

## Parte 3 — Gaps reais priorizados (o que a fase 2 deve implementar)

### P0 — bloqueiam produção
1. **Motor facial real**: substituir HOG/heurística por modelo on-device offline — detector **BlazeFace/MediaPipe** + embedding **MobileFaceNet** (TF.js/WASM com modelos *bundled*, sem download em runtime). Enrolamento real multi-frame no fluxo de cadastro (P2-3).
2. **Unificar domínio + corrigir fila offline (D1)**: fila offline enfileira evento completo e sincroniza via `registerAttendanceBiometricEvent`; eliminar `registerBiometricAccess` de `context.tsx` e `access-logs.service.ts` (ou reduzir a wrappers do engine); migrar fila para IndexedDB.
3. **Fechar regras Firestore (C2)**: remover `|| true`; `biometricProfiles` restrita por role/schoolId; `accessLogs` create só para terminal autenticado; ler/escrever por `schoolId`/`classId`/`role`.
4. **Local-first no engine (C5)**: `registerAttendanceBiometricEvent` recebe os dados do aluno do cache local da turma (sem `getDoc` no caminho offline); escrita via batch + fila.

### P1 — necessários para o conceito
5. **Liveness real** com landmarks do detector (piscar/movimento), substituindo as heurísticas de proporção.
6. **Corrigir vazamento de escopo (D2)** e remover fallbacks fictícios ('turma_10a', foto Unsplash).
7. **`attendanceSchedule` configurável** (por instituição/turma; resolve o conflito 12:00–13:00 manhã/tarde) substituindo o 12:30 hard-coded.
8. **`terminals/{deviceId}` no Firestore** (schoolId, classId, roomId, shift, enabled, biometricModes, lastConfigSyncAt) com bootstrap no tablet + push de config; localStorage vira cache offline.
9. **Plugin Capacitor nativo `FingerprintSecugen`** + interface `FingerprintIdentifyProvider` com stub browser (permite desenvolver a UI "COLOQUE O DEDO" antes do hardware chegar).

### P2 — completam a experiência
10. **Fluxo de cadastro biométrico dedicado** (operador autenticado; captura facial real + 2–3 digitais por aluno; só template/embedding, cifrado).
11. **`exitAuthorizations`** + integração com o estado `FORA_TEMPORARIAMENTE` (pergunta 6).
12. **`ACESSO_REJEITADO`** (motivos: `FORA_DA_TURMA`, `SEM_AUTORIZACAO`, `LIVENESS_FAIL`) com notificação e auditoria.
13. Separar a composição da UI em `components/terminal/*` (a auditoria sugere bem: `TerminalCamera`, `TerminalFingerprint`, `TerminalRecognitionStatus`, `TerminalResult`, `TerminalOfflineStatus`) — o `page.tsx` fica orquestrador.

### O que NÃO fazer
- **Não reconstruir** o terminal do zero: a máquina de estados, comprovantes, notificações, cooldown, áudio/voz, fila e config já existem e estão corretos em arquitetura.
- **Não manter** `app/admin/terminal-simulado` como fonte de verdade — é ferramenta de dev; após unificar o domínio, deve apontar para o mesmo engine.
- **Não usar** `BiometricPrompt` para identificação de aluno (ADR 0001).

---

## Parte 4 — Subsídio para o prompt da 2ª etapa (Google AI Studio)

Fatos verificados a incluir no prompt (substituem as alegações incorretas da auditoria):

1. O arquivo a modificar é `app/aluno/terminal/page.tsx` (988 linhas) — **preservar**: config panel, cooldown, áudio, confetti, máquina de estados, fila offline, comprovante.
2. **Substituir** em `lib/biometrics/engine.ts`: `extractBiometricFromSource` (heurística → detector+embedding real) e `generateSeedEmbeddingForStudent` (semeado → enrolamento real); manter as assinaturas públicas para não quebrar `AlunosTab` e `mock-data` durante a transição.
3. **Corrigir** `lib/biometrics/offline-sync.ts` para usar o engine de presença (D1) e IndexedDB.
4. **Corrigir** `activeStudentPool` (D2) — fallback para lista vazia deve desabilitar o reconhecimento, nunca expandir o escopo.
5. **Fechar** `firestore.rules` (`|| true` nas linhas ~96–365) e criar `biometricProfiles`, `terminals`, `exitAuthorizations` com regras por role/schoolId.
6. **Configurar** `attendanceSchedule` por instituição e ler no engine.

Critério de aceite da fase 2: aluno real cadastrado é reconhecido offline com câmera; evento nasce em `attendanceEvents` mesmo sincronizado depois; aluno de outra turma é rejeitado com tentativa registrada; nenhuma regra `|| true` restante.
