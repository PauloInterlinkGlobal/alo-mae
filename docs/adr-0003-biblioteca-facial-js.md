# ADR 0003 — Biblioteca facial JS: Human como pipeline do WebView

**Data:** 2026-09-24
**Status:** ✅ Aceito (refina a secção 2 do ADR 0002 — mantém todas as restantes decisões)
**Depende de:** ADR 0001 (digital), ADR 0002 (liveness passivo, config offline, fora-da-turma, quiosque), auditoria verificada (gaps P0/P1/P2)

---

## 1. Verificação das fontes da pesquisa

| Fonte citada | Veredicto |
|---|---|
| **[Human — vladmandic/human](https://github.com/vladmandic/human)** | ✅ **Confirmado e promovido a Plano A.** Código **MIT**, ~3,3k★, ativo (v3.3.6), TypeScript, roda em browser/WebView/node, backends WebGL/WASM/CPU/web-worker. Modelos **self-hostable** via `baseModelPath` → bundling nos assets do app = **offline total, zero download em runtime** |
| — Detecção no Human | **MediaPipe BlazeFace** (Apache-2.0, Google) — front 323 KB / back 527 KB |
| — Alinhamento | **MediaPipe FaceMesh** (Apache-2.0) 192×192, 1,5 MB |
| — Embedding padrão | `FaceRes` 224×224 (6,7 MB) — **licença dos pesos a auditar antes de uso** |
| — Embedding alternativo | **`BecauseofAI MobileFace` 112×112 (2,1 MB)** = MobileFaceNet TFJS — **MIT ✅ confirmado** ([repo fonte](https://github.com/becauseofAI/MobileFace)) |
| — Liveness/anti-spoof | Human **inclui** modelos `antispoof` (834 KB) e `liveness` (580 KB, 32×32), não habilitados por padrão — **procedência/licença a auditar**; tratar como experimental |
| [MediaPipe samples web](https://github.com/google-ai-edge/mediapipe-samples-web) | ✅ Concordo com o diagnóstico: MediaPipe detecta/localiza, **não identifica** — precisa de modelo de embedding |
| [InsightFace](https://github.com/deepinsight/insightface) | Já resolvido no ADR 0002: código MIT, **pesos não-comerciais** — fora do caminho principal |
| [CompreFace](https://github.com/exadel-inc/CompreFace) / [DeepFace](https://github.com/serengil/deepface) / [face_recognition](https://github.com/ageitgey/face_recognition) | ✅ Concordo: servidor/self-hosted (Python/REST) — **incompatíveis com o requisito offline no tablet**; rejeitados nesta fase |

**Regra mantida (ADR 0002):** auditar sempre a licença dos **pesos**, não só do código. Pipeline escolhido usa apenas pesos permissivos: BlazeFace + FaceMesh (Apache-2.0) + MobileFace/BecauseofAI (MIT).

## 2. Decisão

### Plano A — Human no WebView Capacitor (POC e MVP)

```text
CÂMERA (getUserMedia no WebView, loop existente ~4,5 FPS)
   ↓
HUMAN (JS/TS, modelos bundled em /public/models — offline)
   ├─ detect:    BlazeFace-front        (Apache-2.0)
   ├─ alignment: FaceMesh + landmarks   (Apache-2.0)
   ├─ liveness:  consistência multi-frame (existente)
   │             + POC: antispoof Human × MiniFASNet-ONNX
   └─ embedding: BecauseofAI MobileFace 112×112 (MIT)  ← substitui FaceRes
   ↓
match cosseno vs pool da turma (IndexedDB, cifrado)
   ↓
attendance-engine (existente) → fila offline → Firestore
```

Substitui a *montagem manual* prevista no ADR 0002 por uma **biblioteca mantida** com a mesma arquitetura de modelos — menos código próprio, demos FaceID/webcam prontas para o POC, e `human.match` para similaridade. O ADR 0002 permanece válido em tudo o resto (liveness passivo, config offline, quiosque, respostas A–D, regra de licenciamento).

### Planos de contingência (gatilhos por métrica, §4)

- **Plano B — trocar o modelo de embedding:** se a acurácia com crianças/iluminação for insuficiente, manter Human (detecção/landmarks) e trocar o embedding por MobileFaceNet/ArcFace com pesos permissivos via ONNX.
- **Plano C — runtime nativo:** se o WebView do tablet alvo (Android 8, potencialmente sem Play Services atualizado) não cumprir a latência, mover a inferência para plugin Capacitor + **ONNX Runtime Mobile com os mesmos pesos** — a UI e o domínio não mudam.

## 3. Respostas às 6 perguntas — **todas já decididas em rodadas anteriores**

| # | Pergunta | Decisão vigente (referência) |
|---|---|---|
| **P1** | Internet | **100% do reconhecimento local + sincronização quando houver Internet** — idêntico à recomendação do auditor (ADR 0002 §3-C; gap C5 da auditoria a corrigir) |
| **P2** | Dados biométricos | **A — só embeddings/templates cifrados, zero fotografias** (decisão fundadora; ADR 0001 §privacidade, ADR 0002 §2; frames descartados após extração) |
| **P3** | Quantos alunos | **Piloto: 1 escola, ~500 alunos, 20–30 por turma.** A arquitetura (pool por terminal ≤ ~30) não muda até ~2.000–5.000 alunos — o opt-in "escola inteira" carrega ~500 embeddings ≈ 256 KB, trivial (ADR 0002 §3-D) |
| **P4** | Dispositivo | **Tablets Android baratos 2–4 GB, Android 8.x** (Tecno/Infinix/Samsung entry — típicos no mercado angolano). Orçamento do pipeline: ~200–250 MB RAM, CPU/WASM. **POC obrigatoriamente no pior dispositivo da frota** |
| **P5** | Câmeras | **1 tablet por sala (default) + modo portaria** como configuração explícita `targetClassId: 'all'` (ADR 0002 §3-D; TerminalConfig já suporta) |
| **P6** | Sair e voltar | **4 eventos + máquina de estados — já implementado**: ENTRADA / SAIDA_TEMPORARIA / RETORNO / SAIDA_OFICIAL em `services/attendance-engine.service.ts` (saída temporária exige autorização — respostas A/D do ADR 0002) |

## 4. Critérios de go/no-go do POC facial (mensuráveis no tablet alvo)

| Métrica | Meta |
|---|---|
| Latência ponta-a-ponta (detecção→match→evento) | **< 3 s** |
| Reconhecimento legítimo (condições reais de sala, crianças) | **≥ 95%** |
| Rejeição de foto impressa / tela do celular | **≥ 95%** |
| RAM do pipeline | **< 250 MB** |
| Persistência de frames/rostos | **0** (verificação no storage do app) |
| Falso aceite entre alunos da mesma turma | **0** na amostra (gêmeos: teste dedicado) |

Se Plano A falhar em latência → Plano C; se falhar em acurácia → Plano B; se ambos falharem → reavaliar hardware (tablet com mais RAM) antes de qualquer compra em volume.

## 5. Privacidade de menores (endossado — já desenhado, agora consolidado)

O alerta do auditor procede e coincide com o que já está nos ADRs; ficam aqui os compromissos explícitos do ciclo de vida:

1. **Consentimento do encarregado** antes do cadastro biométrico (Lei n.º 22/11 — protecção de dados, Angola);
2. **Minimização:** 3 embeddings por aluno; sem imagens; sem dados biométricos fora do necessário por terminal;
3. **Proteção:** cifrados no dispositivo; Firestore restrito (fecha o gap C2); upload só do necessário para sincronização;
4. **Revogação/eliminação:** apagar perfil biométrico a qualquer momento por pedido do encarregado ou desligamento do aluno (propaga aos terminais na próxima sincronização);
5. **Auditoria:** todo acesso/cadastro/eliminação de biometria gera registro; eventos gravam `deviceId`, `configVersion`, `livenessScore`.

## 6. Próximo passo

POC Human no projeto (ramo separado): página de teste com `@vladmandic/human`, modelos bundled, enrolamento de 5 voluntários, execução das métricas da §4 no tablet alvo → resultado decide A/B/C e destrava o prompt de implementação definitiva.
