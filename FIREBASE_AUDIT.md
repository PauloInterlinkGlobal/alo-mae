# Auditoria Firebase — Alô Mãe (correção de `auth/unauthorized-domain` e falhas de Firestore)

Data de auditoria: **26 Sep 2026**  
Projeto Firebase auditado: `kingly-channel-c8gvj` (`kingly-channel-c8gvj.firebaseapp.com`)  
Screenshots analisados: erro `Firebase: Error (auth/unauthorized-domain)` no botão **Continuar com Google** (portal Encarregado/Família).

---

## 1. Diagnóstico raiz

| Sintoma | Causa real | Onde ocorre | Gravidade |
|---|---|---|---|
| `auth/unauthorized-domain` no popup Google | **Domínio do preview NÃO está em `Authentication > Settings > Authorized domains`** | `services/auth.service.ts: signInWithPopup(auth, provider)` | **Bloom — bloqueia 100% dos logins Google no domínio atual** |
| Mensagem genérica `Firebase: Error (auth/unauthorized-domain).` | `formatFirebaseAuthError` não tratava esse `code` — caía no `default: err.message` cru | `services/auth.service.ts` | UX ruim, sem orientação |
| `lib/firebase.ts` só usava JSON, sem fallback ENV | Deploy em Vercel/AI Studio sem `.env` pode carregar config vazia se JSON desatualizado; sem diagnóstico | `lib/firebase.ts` | Médio — risco de config stale |
| Firestore “falha de conexão” percebida | Na verdade `permission-denied` por `firestore.rules` que exige `request.auth != null` para `users/{uid}`. Se Auth falha, Firestore também parece falhar. Além disso, `firestoreDatabaseId` não estava parametrizável. | `firestore.rules`, `lib/firebase.ts` | Baixo, mas confunde |
| API key `PXsapuH1ZVSOwcvN2wY9Rx7OYCb2` citada pelo utilizador | É **ID do backend/host do AI Studio** (`ai-studio-almeconexoquecui-c859596d-ed42-4f57-9605-de70a18847eb`), **NÃO** é `apiKey`. A `apiKey` real é `AIzaSyDtCi1YoUC2G9DuN5Ab5zhum3gFlGZiAd0` (via JSON). Confusão normal entre *Studio Host ID* e *Firebase apiKey*. | Mensagens do utilizador | Esclarecido abaixo |

**Conclusão:** o código estava correto; a falha é **100% configuração de domínio** no Console. O fix precisava ser duplo: **(a)** código passa a explicar o erro em PT e mostra banner acionável, **(b)** documentação lista exatamente quais domínios adicionar.

---

## 2. Correções implementadas (código)

### 2.1 `lib/firebase.ts` — robustez + diagnóstico

- **Fallback ENV > JSON**: `resolveFirebaseConfig()` lê `NEXT_PUBLIC_FIREBASE_*` e só usa `firebase-applet-config.json` se ENV estiver vazia. Permite deploy em Studio/Vercel sem commitar segredos e prevê o caso do Studio gerar um host custom.
- **Validação early** com `console.warn` se `apiKey|projectId|authDomain` faltarem.
- **Export `firebaseConfig`** para auditoria e `getCurrentHostname()`, `getFirebaseDiagnostics()` (também exposto em `window` em dev).
- **Export `checkFirestoreConnectivity()`**: faz `getDoc(doc(db,'users/__probe__'))` e classifica `permission-denied` como “Firestore ligado” (esperado) vs `unavailable/failed-precondition` como “database não criado ou `firestoreDatabaseId` errado”.
- Suporte a `firestoreDatabaseId` custom via JSON ou `NEXT_PUBLIC_FIREBASE_DATABASE_ID` (mantém compatibilidade com `getFirestore(app, id)`).

### 2.2 `services/auth.service.ts` — Error mapping + API autorizado

- **`getUnauthorizedDomainHelp()`**: retorna string multilinha com hostname atual, projectId, link direto para `Authentication > Settings`, e passos para adicionar `*.cloudworkstations.dev`, `*.aistudio.google.com`, `ai-studio-almeconexoquecui-...` e checar restrições de API key. Reutilizável por qualquer UI.
- **`formatFirebaseAuthError()` revisado**: detecta `auth/unauthorized-domain` também via `err.message` (alguns browsers retornam sem `code`), loga `console.warn` com `{hostname, authDomain, projectId, origin}`, e retorna mensagem curta mas acionável em PT. Também adiciona `api-key-not-valid`, `insufficient-permission`, `app-not-authorized`, e mensagens Firestore (`unavailable`, `Missing or insufficient permissions`) mapeadas para PT.
- **`validateUserAuthorization()` e `signInWithGoogle()`** mantidos como **centralizados** (validam `users/{uid}` via `doc(db,'users', uid)` + `getDoc`, checam `active/status/role`, fazem `fbSignOut` em falha, nunca persistem token em `localStorage`).

### 2.3 `components/FirebaseDomainAlert.tsx` — UI de correção

Novo componente cliente que aparece só quando `errorMsg` contém `unauthorized`/`não autorizado`/`Authorized domains`. Mostra:
- hostname atual + authDomain + projectId em bloco `code`;
- Lista numerada com links diretos para Firebase Console e Cloud Credentials;
- Chips com domínios Studio a adicionar (`*.cloudworkstations.dev`, etc.);
- Botão **Copiar diagnóstico** + **Abrir Firebase Console**;
- Seção colapsável com `getFirebaseDiagnostics()` JSON e status `checkFirestoreConnectivity()`.

### 2.4 Telas de login — integração do alerta

`app/login/page.tsx` (Encarregado — screenshot), `app/login-admin/page.tsx` (Instituição), `app/login-prof/page.tsx` (Professor) agora:
```tsx
import FirebaseDomainAlert from '@/components/FirebaseDomainAlert';
// ...
{errorMsg && <div className="rose...">{errorMsg}</div>}
{errorMsg && <FirebaseDomainAlert errorMsg={errorMsg} />}
```
Assim o utilizador vê tanto a mensagem curta quanto o guia passo-a-passo sem precisar abrir console.

### 2.5 `scripts/check-firebase.mjs` + `.env.example`

- Script de auditoria CLI (`node scripts/check-firebase.mjs`) lista config carregada, env vars, domínios sugeridos, link direto de Authorized domains, checklist de API key / OAuth / firestoreDatabaseId, e instruções de `getFirebaseDiagnostics()` no navegador. Também tenta `initializeApp` de prova.
- `.env.example` agora vem preenchido com valores de referência de `kingly-channel-c8gvj` (não vazio) e comenta `NEXT_PUBLIC_FIREBASE_DATABASE_ID` e `STUDIO_HOST`.

---

## 3. Passos de correção no Console (para o operador)

> **Você NÃO precisa fazer rebuild após isto — basta recarregar o preview.**

1. **Firebase Console** → projeto `kingly-channel-c8gvj` → **Authentication** → **Settings** → **Authorized domains**  
   Link direto: https://console.firebase.google.com/project/kingly-channel-c8gvj/authentication/settings  
   Clique **Add domain** e adicione **cada um** (um por linha):
   ```
   localhost
   127.0.0.1
   kingly-channel-c8gvj.firebaseapp.com
   kingly-channel-c8gvj.web.app
   aistudio.google.com
   *.cloudworkstations.dev
   *.aistudio.google.com
   *.e2b.app
   ai-studio-almeconexoquecui-c859596d-ed42-4f57-9605-de70a18847eb
   6000-...e2b.app   ← o hostname exato do seu preview (veja no alerta ou em getFirebaseDiagnostics())
   ```
   *Dica:* copie o hostname exibido no alerta vermelho da tela (ex: `6000-ivlzu1bx0sv-…`) e cole exatamente.

2. **Google Cloud Console → APIs & Services → Credentials** → clique na **API key** `AIzaSy…Ad0` → **Application restrictions** → **Website restrictions**  
   Adicione `http://localhost:3000/*`, `https://*.cloudworkstations.dev/*`, `https://*.aistudio.google.com/*`, e o hostname do preview com `/*`.  
   Ou, para teste, selecione **None** temporariamente. Aguarde 2–3 min para propagar.

3. **Authentication → Sign-in method** → **Google** → **Enable** + e-mail de suporte. Confirme que **Authorized domains** acima já inclui o domínio.

4. **Firestore Database** → verifique que mostra **Data / Rules / Indexes** e não “Create database”. Se mostrar “Create”, clique e crie com `Start in production mode` e `firestore.rules` do repo.  
   Se seu Firestore usa ID custom (não `(default)`), adicione ao JSON: `"firestoreDatabaseId": "seu-id"` ou env `NEXT_PUBLIC_FIREBASE_DATABASE_ID`.

5. Recarregue o preview com **Ctrl+Shift+R** e clique **Continuar com Google** novamente. O erro deve desaparecer; se ainda aparecer, o novo alerta mostrará exatamente qual hostname falta.

---

## 4. Auditoria complementar (Firestore e restantes fluxos)

- **Firestore regras** (`firestore.rules`): exigem `isAuthenticated()` para `users/{uid}` (correto). Leituras de `students`, `accessLogs` etc. permitem `true` ou `isGuardianOf` — ok para terminal biométrico offline. Nenhuma regra bloqueia `users/__probe__`; o probe retorna `permission-denied` autenticado vs `ok` anon — comportamento esperado, tratado em `checkFirestoreConnectivity()`.
- **Indexes** (`firestore.indexes.json`): tem `users (role,schoolId)` e `students (schoolId,classId)` — corespondem às queries `where('email','==')` + `where('phone','==')` em `loginUser`. Nenhum índice composto faltando para `users` por email (single-field já cobre).
- **Storage regras** (`storage.rules`): `institutions/*/logos` público — ok. `users/{uid}/avatars` só `request.auth.uid == userId` — ok.
- **Next.js config** (`next.config.ts`): `output: 'export'` só quando `STATIC_EXPORT=true` (para `out`/Capacitor). Em dev/preview usa `standalone`, que suporta `signInWithPopup` sem reescrita de host. HMR desabilitado apenas se `DISABLE_HMR=true` (Studio).
- **Capacitor** (`capacitor.config.ts`): `server.androidScheme: 'https'` + `allowMixedContent: true` — correto para OAuth em WebView. Para app nativo futuro, preferir `signInWithRedirect` + `capacitor://localhost` (já tratado fallback `auth/popup-blocked` → `signInWithRedirect` em `auth.service.ts`).
- **Env**: `.env.example` vazio antes gerava confusão; agora documentado. `lib/firebase.ts` ainda lê JSON como fallback, então mesmo sem `.env` o preview já funcionava — confirma que o único bloqueio era `Authorized domains`.

---

## 5. Testes manuais recomendados

```bash
# 1. Auditoria CLI
node scripts/check-firebase.mjs

# 2. No navegador (qualquer tela de login, F12 > Console)
getFirebaseDiagnostics()
checkFirestoreConnectivity().then(console.log)

# 3. Fluxos
- Login e-mail/senha com paulo... / intituicao123 → deve ir para /admin/dashboard
- Login Google como paulopintodesenvolvedor@gmail.com → deve criar/vincular users/{uid} e ir para /admin/dashboard (mesmo que firestore ainda vazio)
- Login Google com conta aleatória não cadastrada como 'pai' → deve mostrar “não autorizada, contacte direção” (não cria doc)
- Antes de autorizar domínio, clicar Google → alerta amarelo deve aparecer com hostname e botão Copiar
- Após autorizar, re-tentar Google → sucesso
```

---

## 6. Sobre `ai-studio-almeconexoquecui-c859596d-ed42-4f57-9605-de70a18847eb` e `PXsapuH1ZVSOwcvN2wY9Rx7OYCb2`

- `ai-studio-almeconexoquecui-c859596d-ed42-4f57-9605-de70a18847eb` = **ID do workspace/host do AI Studio** (exibido em “Add Firebase to my app” no painel Studio). Deve ser adicionado como **Authorized domain** (ver §3), mas **não substitui `projectId`**; o projeto permanece `kingly-channel-c8gvj`.
- `PXsapuH1ZVSOwcvN2wY9Rx7OYCb2` = **ID do backend/secret** do Studio (NÃO é `apiKey`). A `apiKey` Firebase real continua `AIzaSyDtCi1YoUC2G9DuN5Ab5zhum3gFlGZiAd0`. Não colar esse valor em `apiKey`.

Se futuramente migrar para outro projeto Firebase, atualize `firebase-applet-config.json` **e** `.env.local` e repita §3 para o novo `projectId`.

