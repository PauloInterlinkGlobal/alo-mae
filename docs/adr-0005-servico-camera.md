# ADR 0005 — Serviço de câmara: stream contínuo × captura de fotos

**Data:** 2026-09-25
**Status:** ✅ Aceito
**Depende de:** ADR 0003 (pipeline facial), cadeia de fallback de câmara (`lib/biometrics/camera.ts`)

---

## 1. Distinção fundamental (confirmada com a documentação Capacitor 8)

| Necessidade | Tecnologia |
|---|---|
| 📹 Reconhecimento facial contínuo (terminal) | `getUserMedia` no Web/WebView; **plugin nativo CameraX** na Fase Android |
| 📸 Foto única (fallback do terminal, enrolamento, foto de perfil) | `<input capture="user">` (web, funciona em iframe); `@capacitor/camera takePhoto()` na Fase Android |
| ❌ Simular vídeo com `takePhoto()` a cada frame | **Nunca** — arquitetura errada (latência, UX, sem liveness contínuo) |

## 2. Verificação do `@capacitor/camera` (docs oficiais, v8)

- `takePhoto()` (desde 8.1.0) → `MediaResult`; `chooseFromGallery()`; `getPhoto()` legado.
- **No Web:** `takePhoto` usa o modal PWA Elements (que roda **getUserMedia** → sofre o MESMO bloqueio de iframe do preview) e, sem PWA elements, cai para um **picker `<input>`** — equivalente funcional ao nosso `captureStillViaInput` já em produção.
- **Conclusão:** instalar `@capacitor/camera` + `@ionic/pwa-elements` **agora** não acrescentaria nada (web igual ao que temos; nativo sem runtime). **Adiado para a Fase Android**, quando o stub `native-still` do `camera-service.ts` liga o `takePhoto()`.

## 3. Decisão: abstração `CameraProvider` (implementada)

`lib/biometrics/camera-service.ts`:

```text
LiveCameraProvider  (stream contínuo)      StillCameraProvider (foto única)
├── native-live  (stub → Fase Android)     ├── native-still (stub → takePhoto)
└── web-live     (getUserMedia)   ✅       └── web-still   (<input capture>) ✅

resolveLiveProvider() / resolveStillProvider()
→ escolhem nativo se disponível, web como fallback
```

- Terminal e POC já consomem os resolvers (sem chamadas diretas a `getUserMedia`/`input`).
- **Fase Android:** implementar `native-live` (plugin Capacitor próprio com CameraX para preview contínuo no WebView) e ligar `native-still` ao `@capacitor/camera`. Nada mais muda — as UIs e o pipeline facial não conhecem o provedor.

## 4. Estado das fases da auditoria

| Fase | Estado |
|---|---|
| 1 — Navegador (permissões, clique, diagnóstico) | ✅ Feita (commits `9ad6a52`, `0338c13`, `7b93a8f`, `f2a156a`) |
| 2 — Android (CameraService nativo) | 🔜 Interface pronta (`camera-service.ts`); implementar com hardware em mãos |
| 3 — Biometria real (modelo local, liveness, matching) | ✅ POC feito (`/poc-facial`, Human/MobileFace MIT); ligação ao terminal real é o próximo passo |
