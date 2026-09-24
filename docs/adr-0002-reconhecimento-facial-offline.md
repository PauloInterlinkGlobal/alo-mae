# ADR 0002 — Reconhecimento facial offline e regras finais do terminal

**Data:** 2026-09-24
**Status:** ✅ Aceito
**Depende de:** ADR 0001 (leitor externo de digital), `docs/auditoria-verificada-e-respostas.md` (gaps P0/P1/P2)
**Relacionado:** `lib/biometrics/`, `services/attendance-engine.service.ts`, `app/aluno/terminal/page.tsx`

---

## 1. Verificação das fontes citadas pelo desenho proposto

| Alegação | Veredicto |
|---|---|
| O repo já usa Capacitor Android + Firebase + `@capacitor/network` | ✅ Confirmado (`package.json`: `@capacitor/android 8.5.0`, `@capacitor/network 8.0.1`, `firebase 12.18.0`) — não há que reescrever a base |
| [datalake-lens](https://github.com/lalitofficial/datalake-lens) — reconhecimento offline + liveness + attendance | ✅ Existe e é a prova de conceito do nosso cenário |
| Ecossistema NHAI (ex. [moneytosms/offlineid](https://github.com/moneytosms/offlineid)) | ✅ Pipeline equivalente ao nosso: detector leve + liveness passivo ×2 + MobileFaceNet INT8 (~9 MB total, CPU-only ONNX, Android 8+/3 GB, ~51 ms) — **cenário 4 GB é plausível** |
| [Silent-Face-Anti-Spoofing / MiniFASNet](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing) | ✅ **Apache-2.0, incluindo os modelos** (confirmado em [análise independente](https://sefiks.com/2024/06/08/face-anti-spoofing-for-facial-recognition-in-python/) e [export ONNX de 600 KB ~98%](https://github.com/facenox/face-antispoof-onnx)) — liveness passivo viável e licenciável |
| ⚠️ InsightFace: evitar os pesos pré-treinados | ✅ **Confirmado e reforçado**: [página oficial](https://www.insightface.ai/) — código MIT, mas **modelos pré-treinados apenas para pesquisa não-comercial**. Nota: o repo `offlineid` acima afirma "all MIT/Apache" ao citar InsightFace/SCRFD — **afirmação pouco confiável**; reforça a exigência de auditoria de licença **por modelo (pesos, não só código)** |

**Regra de ouro adoptada (vale para facial e digital):** nenhum modelo entra no pipeline sem verificação da licença dos **pesos**; candidatos permitidos apenas com MIT/Apache-2.0.

## 2. Stack facial decidido

```text
CÂMERA (WebView via getUserMedia; nativa só se o POC exigir)
   ↓  ~4,5–10 FPS (loop atual de 220 ms está OK)
DETECÇÃO: MediaPipe BlazeFace / Face Detection (Apache-2.0)
   ↓  box + 6 landmarks + qualidade
ALINHAMENTO: transformada de similaridade 5-pontos
   ↓
LIVENESS PASSIVO: MiniFASNet ×2 (linhagem Silent-Face, Apache-2.0,
   ~0,6–4 MB ONNX) + consistência temporal multi-frame
   ↓
EMBEDDING: MobileFaceNet (112×112, INT8 ~4–5 MB)
   ⚠️ apenas pesos com licença permissiva, treinados independentemente
   (auditar cada candidato; LFW ≥ 99%, saida 128/192-d)
   ↓
MATCHING: cosseno contra pool LOCAL da turma (20–30 × K templates)
   K=3 templates/aluno (frontal, ±10–15°, expressão normal)
   match = melhor score entre K templates; limiar + margem de rejeição
   ↓
CONFIRMAÇÃO: 3–5 frames estáveis com voto consistente (94→96→95%)
   ↓  (cooldown de 15 s já existente evita duplicações)
studentId → attendance-engine (já implementado) → fila offline → Firestore
```

Decisões de engenharia:

- **Runtime primeiro em JS/WebView** (TF.js/WASM ou tflite via plugin, modelos *bundled* nos assets — nada de download em runtime, offline total). **Upgrade path:** plugin nativo ONNX/TFLite se o POC não cumprir o orçamento de latência (< 3 s ponta-a-ponta). Risco conhecido: WebView em Android 8 sem Play Services pode ser antigo — o POC mede isto primeiro.
- **Enrolamento multi-amostra** (§4 do desenho: aceito integralmente): 3–5 amostras por aluno, embeddings armazenados, **frames descartados** após extração.
- **Armazenamento local:** fila + cache de biometria em **IndexedDB** (abstração `LocalStore`); SQLite (`@capacitor-community/sqlite`) é opcional futuro — IndexedDB no WebView Capacitor é suficiente para fila e ~100 templates. (Fecha o gap do localStorage atual.)
- **ENTRADA_ATRASADA** (§19): **aceito, mas como campo e não como tipo de evento** — o estado canónico mantém 4 tipos; `scheduleSlot: 'ENTRADA_REGULAR' | 'ENTRADA_ATRASADA'` + `minutesLate` derivados do `attendanceSchedule`; `dailyAttendance` ganha indicador de atraso para relatórios. Evita inflar a máquina de estados.
- **`dailyAttendance.status`** (§21): mantemos o `currentState` existente (AUSENTE/PRESENTE/FORA_TEMPORARIAMENTE/SAIU_OFICIALMENTE) + flags derivados (`wasLate`, `hadAuthorizedExit`) — não duplicar vocabulário.

## 3. Respostas às 4 questões finais

### A. Saída temporária → **Opção 4 (combinação)** *(reconfirmação da resposta anterior)*

- **Professor OU instituição** autoriza; **encarregado pode solicitar** no app → professor/instituição aprova.
- Nasce `exitAuthorizations/{id}`: studentId, classId, motivo, janela de validade (início/fim), aprovador (uid + role), estado.
- O terminal **não** aceita motivo digitado pelo aluno; sem autorização válida → `ACESSO_REJEITADO` (motivo `SEM_AUTORIZACAO`) + notificação ao encarregado.
- Autorização também pode nascer diretamente no app do professor (sala) ou da secretaria.

### B. Liveness passivo → **SIM**

- Sem desafios ativos ("piscar/virar") no fluxo normal — destruiria o requisito "aluno não toca em nada".
- Implementação: MiniFASNet ×2 (passivo, Apache-2.0) **+** consistência temporal entre frames (fotografia impressa/tela tem resposta estatística diferente). `livenessScore` gravado em cada evento.
- Falha de liveness **não** é loop infinito: log `ACESSO_REJEITADO/LIVENESS_FAIL`, terminal direciona à digital (fallback natural do ADR 0001) e mensagem "dirija-se à secretaria". Desafio ativo só como procedimento de exceção operado por funcionário, nunca no fluxo do aluno.

### C. Configuração offline → **SIM, com guardrails**

- `ONLINE → sincroniza; OFFLINE → usa a última configuração válida; ONLINE → re-sincroniza` — confirmado.
- Guardrails obrigatórios:
  1. `configVersion` + `lastConfigSyncAt` visíveis no ecrã de estado do terminal e **gravados em cada evento** (auditoria);
  2. banner âmbar "configuração desatualizada há X h" se staleness > 72 h — o terminal **continua a funcionar**;
  3. alterações de horário/turno só valem a partir da sincronização — **nunca reclassificam retroativamente** eventos já registados;
  4. mudanças de vinculação (turma/dispositivo) exigem re-pareamento (§ abaixo), não são push silencioso.

### D. Aluno noutra sala → **SIM, com uma correção de coerência obrigatória**

O desenho proposto é **internamente contraditório**: o pipeline (§10) tem o ramo "aluno pertence a esta turma? NÃO → negar" — que exige o terminal **reconhecer** alunos de outras turmas — mas o §3 (corretamente) manda carregar **só os 20–30 da turma**. Sem os embeddings dos outros alunos, "reconhecer e rejeitar" é impossível por construção. Resolução:

| Modo do terminal | Pool local | Aluno de outra turma |
|---|---|---|
| **Sala (default)** | só a turma | **desconhecido** — não há match, cai para a digital (mesmo escopo), depois mensagem "dirija-se à secretaria". **Nada é registrado** (não sabemos quem é) |
| **Portaria** (`targetClassId: 'all'`, já existe na config) | escola inteira | reconhecimento é **legítimo** — registra evento para a turma do aluno |
| **Sala com detecção opt-in** (`identificationScope: 'school'` + `expectedClassId`) | escola inteira, cifrada | **reconhece → rejeita → registra `ACESSO_REJEITADO/FORA_DA_TURMA`** |

- O opt-in existe porque ~500 embeddings ≈ 256 KB (custo computacional trivial) — a razão do escopo-turma é **governança/privacidade**, não memória. A instituição decide o trade-off por terminal; tablets de sala ficam em modo default.
- **Correção do diagrama:** o ramo "negar por fora-da-turma" só existe nos modos portaria-opt-in; no modo sala o ramo é "sem match → digital → secretaria".

## 4. Vinculação de dispositivo e quiosque (§16–17: aceito)

- `terminals/{deviceId}` no Firestore: schoolId, classId, roomId, shift, enabled, biometricModes, identificationScope, lastConfigSyncAt + **código de pareamento de uso único** (gerado no admin, lido/confirmado no tablet com operador autenticado).
- Eventos gravam `deviceId`; a validação server-side (rules/functions) rejeita eventos de dispositivos não pareados ou com turma divergente da vinculação.
- Modo quiosque: fullscreen (já existe) + *screen pinning*/lock-task Android no wrapper Capacitor + sem navegação para o resto do app; saída do quiosque exige autenticação do operador (**sensor integrado do tablet**, conforme ADR 0001).

## 5. Horários (§18–19: aceito)

`schoolSettings/attendanceSchedule` por turno com `entryStart/entryEnd`, `lateUntil`, `officialExitStart/officialExitEnd`, tolerâncias — substitui o `12:30` hard-coded (gap C4). O conflito 12:00–13:00 (saída manhã × entrada tarde) resolve-se pelo **estado do aluno** + turno da turma, que a configuração torna explícito.

## 6. O que o prompt da fase de implementação NÃO deve refazer

Já existe e está correto (preservar): máquina de estados e 4 tipos de evento; `attendanceEvents`/`dailyAttendance`; comprovante `receiptCode`; notificações ao encarregado; cooldown 15 s; áudio/voz pt; config de terminal com threshold/cooldown/turma; loop de câmera hands-free ~4,5 FPS; fullscreen. A corrigir (já listado): algoritmo facial sintético (C1), fila offline que contorna o engine (D1), regras `|| true` (C2), `getDoc` no caminho offline (C5), vazamento de pool (D2), horário fixo (C4).

**Critério de aceite do módulo facial:** aluno cadastrado é reconhecido offline (< 3 s ponta-a-ponta) com liveness passivo; fotografia impressa do aluno é rejeitada; aluno de outra turma não gera presença em modo sala; evento sincroniza após reconexão via engine (não via caminho antigo); nenhum frame/rosto persistido em disco.
