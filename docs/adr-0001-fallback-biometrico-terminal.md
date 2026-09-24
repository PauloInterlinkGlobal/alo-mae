# ADR 0001 — Fallback biométrico do terminal: leitor externo de impressão digital

**Data:** 2026-09-24
**Status:** ✅ Aceito
**Relacionado:** `docs/pesquisa-leitor-digital-android.md`, `app/aluno/terminal/`, `lib/biometrics/`, `services/attendance-engine.service.ts`

---

## Contexto

O terminal Alô Mãe usa **reconhecimento facial como método primário** de identificação do aluno. Quando a face não é identificada (luz, altura, oclusão, gêmeos, óculos, capuz), precisamos de um **fallback biométrico que identifique automaticamente qual dos 20–30 alunos da turma colocou o dedo** — sem tocar na tela, sem select de aluno, sem botão de confirmar.

Foi levantada a questão de usar o **sensor de impressão digital integrado do tablet** como fallback. Isso **não é tecnicamente viável** para identificação:

| Requisito do Alô Mãe | Sensor integrado + `BiometricPrompt` |
|---|---|
| Cadastrar a digital de N alunos na app | ❌ Enrolamento de biometria é feito só nas Configurações do sistema, gerenciado pelo SO |
| App receber template/impressão para comparar | ❌ A API nunca expõe dados biométricos ao app |
| Descobrir **qual** aluno colocou o dedo (1:N) | ❌ O resultado é binário (autenticou/não autenticou) contra a biometria enrolada no dispositivo; não há "identidade" de retorno |
| Gerenciar cadastro por turma/ano letivo | ❌ Biometria enrolada fica no hardware seguro (TEE), não sincroniza nem se apaga por aluno |

O `BiometricManager` apenas informa se há biometria enrolada/ disponível, e o `BiometricPrompt` dispara a autenticação pela interface do sistema — foi desenhado para **autenticação do usuário/dispositivo**, não para identificação 1:N de aplicação.

**Conclusão:** a opção B (sensor integrado) exigiria alterar o requisito central ("aluno coloca o dedo e o sistema descobre quem é"). Rejeitada para identificação.

## Decisão

**Opção 1 — Leitor externo de impressão digital USB/OTG** para o fallback de identificação:

```text
FACE (câmera frontal, automática)
   │ falha
   ▼
DEDO no leitor externo (USB OTG)
   │
   ▼
FDx SDK Pro Android (gratuito) — captura + template ISO 19794-2
   │
   ▼
matching 1:N local = loop de 1:1 sobre os 20–30 templates da turma
   │
   ▼
studentId + score → validar schoolId/classId → motor de presença
```

Definições que acompanham esta decisão:

1. **Hardware de referência:** SecuGen Hamster Pro 20 (~US$ 40–80, IP54, SDK Android oficial). Plano B open-source: SourceAFIS-Android (Apache 2.0). Ver pesquisa completa em `docs/pesquisa-leitor-digital-android.md`.
2. **Software:** FDx SDK Pro para Android — gratuito; identificação 1:N implementada como loop 1:1 (27 comparações, alvo < 3 s end-to-end).
3. **Integração:** plugin Capacitor nativo Android (`FingerprintSecugen`), nunca via JavaScript do browser. A permissão USB (`UsbManager`) só existe em código nativo.
4. **Privacidade:** somente template ISO 19794-2, cifrado, armazenado no dispositivo; imagem da digital descartada após extração; nada de imagem/template em texto plano no Firebase.
5. **Offline-first:** identificação 100% local; evento entra na fila (`lib/biometrics/offline-sync.ts`) até haver Internet.

## Papel redefinido do sensor integrado do tablet

O sensor integrado **não é descartado — muda de função**: passa a autenticar o **operador/professor/administrador** em ações privilegiadas do terminal (desbloquear modo cadastro, abrir configurações, autorizar saída temporária manual, exportar registros). Para isso o `BiometricPrompt` é a ferramenta correta, pois esse é exatamente o seu propósito: autenticação do usuário do dispositivo.

```text
SENSOR INTEGRADO  →  autentica o OPERADOR (1:1 implícito do SO)   ✅
LEITOR EXTERNO    →  identifica o ALUNO   (1:N pela aplicação)    ✅
```

## Consequências e trade-offs

| Item | Impacto |
|---|---|
| Custo por terminal | + ~US$ 70 (leitor) + cabo OTG |
| Porta USB do tablet | Ocupada pelo leitor (considerar carregamento POGO/pin ou hub com energia) |
| Segurança física | Leitor preso com trava/cabo antifurto ao suporte do kiosk |
| Ausência/avaria do leitor | Degradação graciosa: terminal segue com facial; verificação manual assistida pelo operador autenticado (fora do kiosk, no app do professor) — mantém a tela limpa |
| Anti-spoofing | Sem liveness ativo no HU20; mitigado pelo duplo fator (facial + digital), supervisão do operador e registro de tentativas |
| Risco de compra | Mitigado pelo POC (1 unidade, ~US$ 70–90) antes de equipar a frota — critério de aceite: match < 3 s end-to-end no tablet alvo |

## O que fica desbloqueado / ordem de implementação

1. **Agora (sem hardware):** interface de abstração `FingerprintIdentifyProvider` em `lib/biometrics/` (com stub para navegador/desktop) + estados de UI "COLOQUE O DEDO" no terminal — o código da tela pode evoluir contra o stub.
2. **Plugin nativo Capacitor** (`FingerprintSecugen`: `isAvailable/enroll/identify/cancel`) — código pronto para compilar, testável quando o leitor chegar.
3. **POC com hardware** (1× Hamster Pro 20) → medir latência e FRR/FAR com crianças → ajustar limiar de score.
4. **Só depois do POC passar:** compra dos demais leitores.

⚠️ `app/aluno/terminal/page.tsx` só é alterado após o passo 1 estar definido — a decisão deste ADR destrava exatamente isso.
