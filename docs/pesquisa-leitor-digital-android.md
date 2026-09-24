# Pesquisa — Leitor de impressão digital Android para o Alô Mãe

**Tema:** alternativas ao SecuGen Hamster Pro 20 — Android + USB OTG + identificação 1:N offline + SDK gratuito/open-source
**Data:** 2026-09-24
**Status:** pesquisa técnica pré-POC (nenhum código alterado)

---

## TL;DR — o que a pesquisa revelou

1. **Não precisamos de NENHUM motor 1:N pago.** Para uma turma de 20–30 alunos, o matching 1:N é literalmente um *loop* de matchings 1:1 (~27 comparações, poucos ms cada). Nem SecuSearch Pro 3, nem VeriFinger são necessários nesta fase.
2. **O FDx SDK Pro para Android da SecuGen é 100% gratuito** (captura + extração de minutiae + matching 1:1, com exemplos em Java). Custo de software: **US$ 0**.
3. Existe um motor 1:N **open-source que roda em Android**: **SourceAFIS** (Apache 2.0, Java), com ports Android prontos no JitPack — caso queiramos independência de fabricante.
4. O **Hamster Pro 20 continua sendo a recomendação de hardware** (~US$ 40–80, IP54, SDK Android gratuito, templates ISO 19794-2/ANSI 378).
5. Para **validar o fluxo com custo mínimo**, existe uma via ultra-barata: módulo **R307 (~US$ 10–25)** que faz matching 1:N *no próprio módulo* (até 1.000 templates) e fala serial USB com o Android via bibliotecas open-source. Útil só para POC de UX — não para produção.
6. Alternativas "certificadas" mais baratas que a SecuGen existem (**Mantra MFS100 ~US$ 26–46, Startek FM220U ~US$ 26–42**, ambas com SDK Android), mas com cadeia de suprimentos focada na Índia — risco de importação/suporte para Angola.

**Recomendação final:** manter **Hamster Pro 20 + FDx SDK Pro Android (grátis)** como linha de base de produção, com matching 1:N implementado como loop 1:1 do próprio SDK (ou SourceAFIS como fallback open-source). Comprar **1× Hamster Pro 20** e opcionalmente **1× R307** (~US$ 90 no total) para o POC.

---

## 1. Correção importante sobre o cenário SecuGen

A pesquisa confirmou e **afrouxou** a limitação que levantamos:

| Componente SecuGen | Plataforma | Preço | Nota |
|---|---|---|---|
| FDx SDK Pro **Android** | Android 3.1+ (ARM, USB host/OTG) | **Gratuito** | Captura + extração + **matching 1:1**; exemplos Java; sem suporte técnico incluído |
| FDx SDK Pro Windows/Linux | Win/Linux | Gratuito | 1:1 |
| **SecuSearch Pro 3** | **Windows 64-bit apenas** | Gratuito até **1.000 templates**; licença paga até 2 milhões | Motor 1:N — **não serve para o tablet**, como suspeitávamos |
| SecuGen WebAPI | Navegador | Grátis 60 dias | Alternativa browser, não atende offline |

Fontes: [página oficial de SDKs](https://secugen.com/products/sdk/), [Request Free Software](https://secugen.com/request-free-software/), [SecuSearch Pro 3](https://secugen.com/products/secusearch/), [revenda com resumo de licenciamento](https://idvisionme.com/product/secugen-fingerprint-software/).

**Conclusão chave:** o FDx SDK Pro Android **já entrega matching 1:1 com score** (`MatchTemplates` do `JSGFPLib`). Para a turma 7A com 27 alunos:

```text
template capturado
      ↓
for cada aluno da turma (27):
      score = MatchTemplates(captura, template_do_aluno)
      ↓
melhor score > limiar  →  studentId identificado
```

Pior caso ~27 matchings — em hardware móvel isso é da ordem de **1–3 s** (a medir no POC). Se for lento demais, trocamos o loop por SourceAFIS ou otimizamos com pré-indexação. **Nenhum centavo de licenciamento.**

Detalhes técnicos confirmados do FDx SDK Pro Android:

- Gera templates em **ANSI INCITS 378, ISO/IEC 19794-2 e formato proprietário de 400 bytes (criptografado)** → podemos padronizar em ISO 19794-2, o mesmo formato que já planejamos para o perfil biométrico no Firebase.
- Requisitos: tablet ARM com **USB host** + cabo OTG; Android 3.1+ → **compatível com o tablet Android 8.x** e com `minSdkVersion 24` do nosso projeto.
- Exemplos oficiais em Java (incl. *Auto-On*, *Smart Capture*, matching com rotação 360°).

---

## 2. O motor 1:N open-source: SourceAFIS

O SourceAFIS é o único motor de impressão digital 1:N **open-source sério e utilizável** que encontrei:

| Item | Detalhe |
|---|---|
| Repositório (oficial, Java) | [robertvazan/sourceafis-java](https://github.com/robertvazan/sourceafis-java) |
| Licença | **Apache 2.0** (uso comercial livre, zero custo) |
| Modos | 1:1 (comparação) **e 1:N** (busca em lista de candidatos) |
| Entrada | **Imagem** da digital (grayscale) — extrai minutiae ele mesmo |
| Templates | Lê/escreve ISO 19794-2 e ANSI 378 via [FingerprintIO](https://github.com/robertvazan/fingerprintio) |
| Performance | Extração ~0,3–1 s em CPU móvel modesta; cada comparação ~milissegundos → 30 alunos = instantâneo |

Ports/forks Android relevantes:

- [**lmone/SourceAFIS-Android**](https://github.com/lmone/SourceAFIS-Android) — port para Android publicado no **JitPack** (`com.github.LintraMax:SourceAFIS-Android:v3.10.0`), já usado em app de produção. Confirmação de uso real em [resposta no Stack Overflow](https://stackoverflow.com/questions/57447241/android-sdk-for-fingerprint-matching-external-device).
- [**shawnsarwar/OpenANDID**](https://github.com/shawnsarwar/OpenANDID) — ferramenta FOSS de identificação biométrica para Android (saúde global): fork do SourceAFIS otimizado para Android + NBIS Bozorth3 (NIST). Prova de que o stack open-source completo em Android é viável.
- [**Simprints/libAFIS**](https://github.com/Simprints/libAFIS) — port do SourceAFIS para **C** (roda em qualquer dispositivo, Android incluído).

**Quando usar:** se quisermos que os templates sejam **portáveis entre fabricantes de leitor** (imagens capturadas por qualquer leitor viram templates ISO comparáveis pelo SourceAFIS), ou se o EULA da SecuGen nos incomodar em algum cenário. Trade-off: precisão inferior a motores comerciais em bases grandes — irrelevante para 20–30 templates.

**Observação de integração:** como o SourceAFIS consome *imagem* (e não template do fabricante), o plugin nativo precisaria expor também o *raw image* do FDx SDK (`GetImage`), além do template. O SDK SecuGen permite ambos.

---

## 3. Leitores comparados (Android + USB OTG)

| Leitor | Preço aprox. | Android oficial | Anti-spoof / certificação | 1:N | Observações |
|---|---|---|---|---|---|
| **SecuGen Hamster Pro 20 (HU20)** | **US$ 40–80** ([eBay US$ 27–87](https://www.ebay.com/p/2255999364), [Bayometric US$ 65–78](https://www.bayometric.com/secugen-hamster-pro-20-fingerprint-reader-scanner/), [Microless US$ 72](https://global.microless.com/product/secugen-hu20-hamster-pro-20-fingerprint-scanner-500-dpi-resolution-scratch-resistant-impact-resistant-corrosion-ressistant-electrostatic-shock-resistant-hu20/), Índia ₹3.200 ≈ US$ 38) | ✅ SDK gratuito | IP54; FIPS 201 (PIV) e Mobile ID FAP 20 (US) | loop 1:1 (SDK grátis) ou SourceAFIS | **Recomendado.** Documentação e exemplos Java; distribuição global |
| SecuGen Hamster Pro 10 | ~US$ 45–60 | ✅ SDK gratuito | igual família | idem | Janela menor — pior para crianças |
| **Mantra MFS100 v54** | **US$ 26–46** ([₹2.170–2.720](https://www.moglix.com/mantra-mfs-100-optical-biometric-fingerprint-scanner-with-otg-cable/mp/msn2vhjzaagjo3); [Alibaba US$ 32–46](https://www.accio.com/plp/fingerprint-scanner-mantra)) | ✅ SDK gratuito (Android+Windows), 500 DPI, ISO/ANSI | STQC/UIDAI (Índia); sem liveness ativo | loop 1:1 (SDK tem `MatchISO`) | Cadeia de suprimentos **Índia**; muito usado em Aadhaar; suporte fora da Índia é fraco |
| **Startek FM220U** | **US$ 26–42** ([₹2.150–3.300](https://www.entrywatchtechnologies.com/fingerprint-scanner.html), [eBay US$ 102](https://www.ebay.com/itm/135516922830)) | ✅ Android (+iOS), ID < 300 ms | **IP66**; L0/L1 (Índia) | loop 1:1 via SDK | Também Índia-centrado |
| **R307 / ZFM (módulo serial)** | **US$ 10–25** (AliExpress/marketplaces) | ⚠️ sem "SDK Android" — protocolo serial aberto | **nenhum** (sem anti-spoof, sem IP) | **1:N no próprio módulo** (até 1.000 templates, busca < 1 s @ 1:1000) | Ver seção 3.1 — opção de POC |
| Futronic FS80H | ~US$ 70 (₹5.800) | ✅ com drivers | LFD (anti-spoof) real | via SDK Futronic (SDK licenciado à parte) | Custo de SDK eleva o total |
| ZKTeco ZK4500 | ~US$ 45 ([eBay](https://www.ebay.com/itm/354041819268)) | ⚠️ SDK forte só em Windows | — | — | Descartado |
| HID Digital Persona U.are.U 4500 | US$ 60–90 | ⚠️ SDK Android HID **pago** | — | — | Descartado para Android |
| Integrated Biometrics (Columbo etc.) | US$ 150+ | ✅ | FBI PIV, liveness ótico | ✅ | Premium — overkill para nós |

### 3.1 A opção ultra-barata: R307 para POC

O R307 (família ZhianTec/ZFM, DSP AS606) é um módulo óptico 500 DPI com **matching 1:1 e 1:N embarcado no firmware**:

- Armazena até **1.000 templates na flash do módulo**; busca 1:N em < 1 s (1:1000); FAR < 0,001%, FRR < 1,0% (especificação do fabricante — sem certificação independente).
- Interface **UART TTL + USB (porta COM virtual, chip CH340/compatível)**. No Android, conversa-se por USB-serial com bibliotecas open-source:
  - [felHR85/UsbSerial](https://github.com/felHR85/UsbSerial) — usado em [integração R307+Android documentada](https://stackoverflow.com/questions/53029013/integrating-r307-fingerprint-scanner-with-android);
  - [mik3y/usb-serial-for-android](https://github.com/mik3y/usb-serial-for-android) — suporta CH340/CP210x/FTDI/PL2303.
- Protocolo aberto e bem documentado: [tutorial completo CIRCUITSTATE](https://www.circuitstate.com/tutorials/interfacing-r307-optical-fingerprint-scanner-with-arduino-boards-for-biometric-authentication/) (pinout, pacotes, níveis de segurança), bibliotecas Arduino de referência.

**Por que só POC:** templates ficam **na flash do módulo** (trocar o leitor = recadastrar tudo), não há rejeição de dedo falso, sem certificação, durabilidade mecânica desconhecida para quiosque escolar. Mas por ~US$ 15 permite testar **todo o fluxo de UX (criança → dedo → identificação → evento)** antes de comprar o Hamster Pro 20.

### 3.2 Comparação Hamster Pro 10 / 20 / 30 (linha SecuGen)

| Modelo | Preço aprox. | Janela | Perfil de uso |
|---|---|---|---|
| Hamster Pro 10 | ~US$ 45–60 | menor | terminal ultra-compacto (janela pequena dificulta crianças) |
| **Hamster Pro 20** | **US$ 40–80** | média | **terminal escolar — escolhido** |
| Hamster Pro 30 | ~US$ 90–120 | maior | mais tolerância a posicionamento |

---

## 4. Motores de matching comparados

| Motor | Plataforma | Custo | 1:N real? | Veredicto p/ Alô Mãe |
|---|---|---|---|---|
| **FDx SDK Pro Android (SecuGen)** | Android | **Grátis** (uso com leitor SecuGen) | loop 1:1 | ✅ **Plano A** — zero dependências extras |
| **SourceAFIS-Android** | Android (JVM) | **Grátis, Apache 2.0** | ✅ 1:N nativo | ✅ **Plano B / fallback open-source**; também dá portabilidade entre leitores |
| SecuSearch Pro 3 | **Só Windows 64-bit** | grátis ≤ 1.000 templates | ✅ | ❌ Não roda no tablet (confirmado na [página oficial](https://secugen.com/products/secusearch/)) |
| Neurotechnology VeriFinger SDK | Win/Linux/Android/iOS | **€ 339 (Standard) / € 859 (Extended)** + licença **por dispositivo** ([tabela oficial 2026](https://neurotechnology.com/prices-verifinger.html)) | ✅ | ❌ Melhor precisão do mercado, mas custo por tablet não se justifica para 30 alunos |
| Match do módulo R307 | firmware do módulo | grátis | ✅ embarcado | ✅ Só para POC barato |
| NBIS (NIST, Bozorth3) | desktop/C | domínio público | ✅ | ❌ Complexo; já empacotado no OpenANDID se algum dia precisarmos |

---

## 5. Projetos GitHub de exemplo (para o POC)

| Repositório | O que nos ensina |
|---|---|
| [SecuGen — FDx SDK Pro Android](https://secugen.com/products/sdk/) (download gratuito, com formulário) | Código Java oficial: `JSGFPLib`, Init/OpenDevice/GetImage/ExtractTemplate/MatchTemplates, Auto-On — **base direta do nosso plugin Capacitor** |
| [robertvazan/sourceafis-java](https://github.com/robertvazan/sourceafis-java) | Motor 1:N Apache 2.0 (272★, mantido) |
| [lmone/SourceAFIS-Android](https://github.com/lmone/SourceAFIS-Android) | Como empacotar SourceAFIS em Android via JitPack |
| [shawnsarwar/OpenANDID](https://github.com/shawnsarwar/OpenANDID) | App Android completo open-source: captura USB host + identificação 1:N (referência de arquitetura) |
| [robertvazan/fingerprintio](https://github.com/robertvazan/fingerprintio) | Parser/serializador de templates **ISO 19794-2/ANSI 378** — útil p/ validar e sincronizar templates no Firestore |
| [felHR85/UsbSerial](https://github.com/felHR85/UsbSerial) e [mik3y/usb-serial-for-android](https://github.com/mik3y/usb-serial-for-android) | USB-serial no Android — caminho do R307 (POC) |
| [CIRCUITSTATE R307 (docs + lib R30X)](https://www.circuitstate.com/tutorials/interfacing-r307-optical-fingerprint-scanner-with-arduino-boards-for-biometric-authentication/) | Protocolo serial do R307 completo |
| [Exemplo Mantra MFS100 (blog + código)](https://jainishprajapati.github.io/2018/07/mantra-mfs-100-biometric-android-example.html) e [plugin Flutter `mantra_mfs100`](https://pub.dev/packages/mantra_mfs100) (BSD-3) | Padrão de integração de leitor USB + `.jar` + `jniLibs` — o mesmo formato do plugin SecuGen |
| [Discussão real de integração SecuGen+Android](https://stackoverflow.com/questions/78551461/nullpointerexception-attempt-to-invoke-virtual-method-long-secugen-driver-smar) | Armadilhas de `UsbManager`/permissões USB em aparelhos variados (Xiaomi etc.) — crítico para nós |

---

## 6. Custos estimados por cenário

| Cenário | Hardware por terminal | Software | Total |
|---|---|---|---|
| **POC de fluxo** (validar UX na escola) | 1× R307 ~US$ 15 (cabo OTG incl.) | US$ 0 | **~US$ 15** |
| **Terminal escolar (produção)** | 1× Hamster Pro 20 ~US$ 70 | US$ 0 | **~US$ 70** |
| POC completo (comparativo A/B) | 1× R307 + 1× Hamster Pro 20 | US$ 0 | **~US$ 85–90** |
| (referência) Se um dia precisarmos de motor comercial | + VeriFinger Standard | € 339 + ~€ 16–25/licença/dispositivo | não recomendado agora |

Disponibilidade em Angola: nenhum dos fabricantes tem distribuidor local identificado. Canais realistas: importação via revendedores internacionais SecuGen (EUA/Europa/Dubai — ex.: [Bayometric](https://www.bayometric.com/secugen-hamster-pro-20-fingerprint-reader-scanner/), [Microless](https://global.microless.com/product/secugen-hu20-hamster-pro-20-fingerprint-scanner-500-dpi-resolution-scratch-resistant-impact-resistant-corrosion-ressistant-electrostatic-shock-resistant-hu20/), [IDVision Dubai](https://idvisionme.com/product/secugen-fingerprint-software/)) ou marketplaces (eBay/AliExpress). Mantra/Startek são fortemente Índia-centrados — priorizar SecuGen pela cadeia global de revendas.

---

## 7. Riscos e considerações

1. **Anti-spoofing:** o Hamster Pro 20 não tem liveness ativo dedicado (isso fica nos modelos Duo/Unity). Mitigação no nosso caso: **duplo fator no terminal** (reconhecimento facial + digital), supervisão do operador e registro de tentativas — coaduna com o fluxo já desenhado.
2. **EULA do SDK gratuito SecuGen:** uso permitido **somente com leitores SecuGen**; suporte técnico não incluso (pago à parte). Para nós isso é irrelevante (sempre teremos o leitor deles) — mas é o motivo de mantermos o SourceAFIS como plano B documentado.
3. **Android 8.x + Capacitor:** o FDx SDK pede Android 3.1+ com USB host — OK com `minSdk 24` do projeto. O fluxo de **permissão USB (`UsbManager.requestPermission`) só funciona em código nativo** → confirma a decisão de fazer o fingerprint como **plugin Capacitor nativo**, nunca via browser JS.
4. **Crianças e dedos pequenos:** janela de captura do HU20 (~13×18 mm) funciona, mas exigirá orientação visual no kiosk; o Pro 30 (janela maior) é o upgrade natural se o FRR empírico com crianças for alto.
5. **Privacidade (dados biométricos de menores):** manter a decisão já tomada — **armazenar somente template ISO 19794-2, nunca a imagem**, cifrado no dispositivo; imagem temporária descartada na extração. Lei n.º 22/11 (protecção de dados, Angola) + consentimento do encarregado de educação no cadastro.
6. **Latência do loop 1:N:** estimativa 1–3 s para 27 templates no tablet; medir no POC. Se falhar no critério (< 3 s), migrar o matching para SourceAFIS-Android (match por par em ms) sem mudar hardware.

---

## 8. Arquitetura recomendada (consolidada)

```text
Next.js (UI do terminal — já existe em components/terminal)
   │
   ▼
Capacitor ──▶ Plugin nativo Android (NOVO: capacitor-plugin-fingerprint)
   │                        │
   │                 FDx SDK Pro Android (grátis)
   │                 ├── Init / OpenDevice (JSGFPLib)
   │                 ├── GetImage() ──▶ SourceAFIS (plano B, opcional)
   │                 └── ExtractTemplate() → ISO 19794-2
   │                        │
   ▼                        ▼
lib/biometrics/      matching 1:N = loop 1:1 sobre
(facial, offline-    templates da turma (20–30)
sync, audio)              │
                          ▼
                  studentId + score
                          │
        verificar schoolId/classId (regra já existente)
                          ▼
        motor de presença (attendance-engine.service.ts)
                          ▼
   evento {studentId, method:"fingerprint", type, confidence,
           deviceId, timestamp, synced:false}
           → fila offline (lib/biometrics/offline-sync.ts) → Firestore
```

API JS proposta para o plugin (a definir na implementação):

```ts
FingerprintSecugen.isAvailable(): Promise<boolean>
FingerprintSecugen.enroll():   Promise<{ template: ArrayBuffer /* ISO 19794-2 */ }>
FingerprintSecugen.identify(templates: { studentId: string; template: ArrayBuffer }[]):
  Promise<{ studentId: string; score: number } | null>
FingerprintSecugen.cancel():   Promise<void>
// eventos: onFingerDetected, onCaptureProgress
```

---

## 9. Plano de POC proposto

1. **Comprar:** 1× Hamster Pro 20 (~US$ 70) e, opcionalmente, 1× R307 (~US$ 15) + cabo OTG.
2. **App Android mínimo (Java/Kotlin, sem Capacitor)** com o exemplo oficial SecuGen: cadastro de 3 dedos × 10 voluntários (incl. crianças), extração ISO 19794-2, loop 1:1. Medir: tempo de captura, tempo de match total, FRR/FAR empírico com dedos molhados/sujos/queda de luz.
3. **Decisão de motor:** comparar loop FDx 1:1 vs SourceAFIS-Android (score/latência). Escolher o que cumprir **< 3 s end-to-end** no tablet alvo.
4. **Wrapping em plugin Capacitor** (`FingerprintSecugen` API acima) + integração com `lib/biometrics` e `offline-sync`.
5. **Só depois** de o POC passar: comprar leitores para os demais terminais.

---

## 10. Próximos passos

| # | Ação | Responsável |
|---|---|---|
| 1 | Aprovar compra do POC (~US$ 70–90) | Gestão |
| 2 | Baixar FDx SDK Pro Android (formulário gratuito SecuGen) e rodar o app de exemplo no tablet Android 8 alvo | Dev |
| 3 | (Opcional) POC paralelo R307 + usb-serial para validar UX por menos dinheiro | Dev |
| 4 | Definir schema Firestore do template (ISO 19794-2 em base64, cifrado) coerente com `lib/biometrics/types.ts` | Dev |

---

### Fontes principais

- SecuGen: [SDKs](https://secugen.com/products/sdk/) · [Request Free Software](https://secugen.com/request-free-software/) · [SecuSearch Pro 3](https://secugen.com/products/secusearch/) · [Hamster Pro 20](https://secugen.com/products/hamster-pro-20/) · [manual FDx Android (PDF)](https://forum.getodk.org/uploads/short-url/f7S3hEfIpTv1KkS2uuAY3kGp1pZ.pdf)
- SourceAFIS: [sourceafis-java](https://github.com/robertvazan/sourceafis-java) · [SourceAFIS-Android (JitPack)](https://github.com/lmone/SourceAFIS-Android) · [OpenANDID](https://github.com/shawnsarwar/OpenANDID) · [libAFIS (C)](https://github.com/Simprints/libAFIS)
- R307: [CIRCUITSTATE tutorial](https://www.circuitstate.com/tutorials/interfacing-r307-optical-fingerprint-scanner-with-arduino-boards-for-biometric-authentication/) · [integração Android (SO)](https://stackoverflow.com/questions/53029013/integrating-r307-fingerprint-scanner-with-android) · [usb-serial-for-android](https://github.com/mik3y/usb-serial-for-android)
- Preços: [Bayometric HU20 US$ 65–78](https://www.bayometric.com/secugen-hamster-pro-20-fingerprint-reader-scanner/) · [eBay HU20](https://www.ebay.com/p/2255999364) · [Moglix MFS100 ₹2.720](https://www.moglix.com/mantra-mfs-100-optical-biometric-fingerprint-scanner-with-otg-cable/mp/msn2vhjzaagjo3) · [Startek revenda ₹2.570+](https://www.entrywatchtechnologies.com/fingerprint-scanner.html) · [VeriFinger oficial](https://neurotechnology.com/prices-verifinger.html)
