# ADR 0004 — Autenticação e RBAC: verificação da auditoria e consolidação

**Data:** 2026-09-24
**Status:** ✅ Aceito
**Relacionado:** `services/auth.service.ts`, `functions/src/auth.ts`, `firestore.rules` (bloco `users`), `components/RouteGuard.tsx`, `app/login*`, `components/admin/gestao/PaisTab.tsx`

---

## 1. Verificação da auditoria — alegação central REFUTADA para este branch

| Alegação do auditor | Realidade verificada no código |
|---|---|
| "`auth.service.ts` ainda infere `pai`/`professor`/`instituicao` pelo conteúdo do e-mail. Isso deve desaparecer." | ❌ **FALSA neste branch.** Não existe inferência por e-mail. `loginUser(identifier, password, portalRole)` faz **RBAC estrito por portal** com o comentário explícito *"Never infers user role from email string!"*; as três mensagens de erro propostas pelo auditor já existem literalmente ("Esta conta não possui permissão para acessar o portal do professor." etc.), com `signOut` automático em caso de mismatch. |
| Criar `/login`, `/login-prof`, `/login-admin` | ✅ **Já existem** (`app/login/`, `app/login-prof/`, `app/login-admin/`), todos chamam `loginUser` com o `portalRole` correto, e o `RouteGuard` mapeia roles → porta de login correta. |
| "3 portas de entrada, mas não 3 sistemas de autenticação" | ✅ **Já é assim** — um único Firebase Auth, três portais validando role. |
| Instituição cria encarregado/professor com senha temporária; `mustChangePassword`; nunca guardar senha no Firestore | ✅ **Já implementado**: `createManagedUser` (instância Auth secundária para o admin não ser deslogado, `mustChangePassword: true`, senha só no Auth, auditoria), `updateUserPassword` limpa a flag, `PaisTab.tsx` usa. |
| `functions/src/auth.ts` "já caminha para esse modelo" | ✅ Confirmado e melhor do que descrito: `enrollStudent`/`enrollTeacher` exigem **claims** (`request.auth.token.role === 'instituicao'`), criam utilizador via Admin SDK, escrevem `users/{uid}` e **definem Custom Claims**; existe até `provisionTerminalDevice` com custom token `role: 'terminal'` — o papel de terminal que o auditor pediu para preservar já está lá. |
| Estrutura `users/{uid}` (schoolIds, studentIds, mustChangePassword, createdBy...) | ✅ Já é o schema em uso. |
| Regras: "auditar `firestore.rules`" | ⚠️ O bloco `users/{userId}` já é razoável: leitura por owner/instituição/professor; update pelo próprio **imutabiliza** `role`, `schoolIds`, `studentIds`, `createdBy`. O problema das regras está nas **outras coleções** (`|| true` — gap C2 já registado). |

**Conclusão:** o mega-prompt do auditor especifica, em grande parte, **o que já está implementado**. Enviá-lo como está faria a IA "reimplementar" o que existe — exatamente o risco que ele próprio quer evitar. O valor está nas correções abaixo.

## 2. Problemas REAIS encontrados nesta verificação (que a auditoria não viu)

### 🔴 P0-1 — Backdoor de tomada de conta em `loginUser` (CRÍTICO)

No catch de `auth/user-not-found` **e** `auth/invalid-credential`, o código procura o e-mail no Firestore e, se existir documento, **cria a conta no Firebase Auth usando a senha que o visitante digitou** e faz login ("development / demo helper"). Consequências:

- Qualquer pessoa que saiba o e-mail de um utilizador sem conta Auth provisionada **apropria-se da conta digitando qualquer senha**;
- E-mails vindos de seeds/imports do Firestore ficam "reserváveis" por atacantes;
- O gatilho inclui `auth/invalid-credential` (senha errada de conta existente) — lógica duplicada e perigosa.

**Decisão:** remover completamente. Provisionamento de contas só via Cloud Functions (Admin SDK). Se preciso de seed em dev: CF dedicada ou emulador, nunca caminho de produção.

### 🔴 P0-2 — E-mail falso `${role}_${telefone}@escola.alomae.ao` em `createManagedUser`

`createManagedUser` gera login sintético a partir do telefone quando não há e-mail — **exatamente o anti-padrão que o auditor alertou na §10** (ele não sabia que o código já o fazia). Além de recuperação de conta frágil, `enrollStudent` (CF) exige `parent.email` real, ou seja, **há dois padrões inconsistentes** nos dois caminhos de criação.

**Decisão:** e-mail real é o identificador de credencial (v1). O telefone é campo de contacto + resolução de identidade. Pai sem e-mail: a instituição cadastra um e-mail que o encarregado controla (criado na hora com assistência) ou usa o fluxo assistido de redefinição (P0-3) — sem e-mails sintéticos. **Fase 2:** identificador por telefone via **Cloud Function** (índice com hash do número normalizado + App Check + rate-limiting) — nunca query client-side.

### 🔴 P0-3 — `reissueCredentials` está funcionalmente quebrado

Gera uma nova senha temporária, grava `mustChangePassword: true` e **devolve a senha… que nunca foi aplicada**: o SDK cliente não pode alterar a senha de outro utilizador. A credencial exibida à instituição não funciona. `PaisTab.tsx:201` usa esta função.

**Decisão:** mover para Cloud Function `reissueUserPassword` (Admin SDK `auth.updateUser`, senha gerada com `crypto.randomBytes`, `mustChangePassword: true`, auditoria, retorna a senha só para o chamador autorizado).

### 🟠 P0-4 — Criação de utilizadores pelo cliente sem Custom Claims

`createManagedUser` cria contas pelo SDK cliente: (a) enumeração de e-mails, (b) senha via `Math.random()` (não-CSPRNG), (c) **não define claims** — enquanto o caminho CF define. Com as regras a depender de claims, utilizadores criados pelo caminho cliente podem ficar sem permissões; e há dois caminhos a manter em paralelo (risco de deriva).

**Decisão:** **um só caminho, server-side**: consolidar criação nas CFs existentes (`enrollStudent`, `enrollTeacher`) + nova `createGuardian` para encarregado sem aluno novo; `createManagedUser` do cliente passa a wrapper de CF ou é removido.

### 🟠 P1-5 — O login por telefone está morto sob as regras atuais (e inseguro se aberto)

`loginUser` resolve telefone com `query(users).where('phone','==')` **client-side e pré-autenticação** — mas as regras exigem `isAuthenticated()` para ler `users`. Logo: **o caminho de telefone falha hoje** com `permission-denied`. Se alguém "consertar" abrindo a leitura, cria enumeração de números. 

**Decisão:** v1 usa e-mail; a resolução telefone→conta só existe server-side (CF da P0-2 fase 2), nunca client-side.

### 🟡 P1-6 — Deriva de claims + fallbacks arriscados + higiene

- `dissociateStudentFromParent` (cliente) atualiza Firestore mas **não as claims** → `studentIds` nas claims ficam obsoletos (e o inverso: reatação idem). Desvinculação/vinculação devem passar pelas CFs, que recalculam claims.
- `loginUser` auto-cria perfil com `role: 'pai'` para conta Auth sem documento — remover: sem perfil, **login negado** (perfil é criado pela instituição).
- `institutionId: 'inst_horizonte_01'` hard-coded em vários registros de auditoria — propagar o schoolId real.
- `enrollStudent`/`enrollTeacher` geram senhas temporárias com `Math.random()` — trocar por `crypto.randomBytes`.
- Claims: respeitar o limite de 1000 bytes. **Correção à proposta do auditor:** `studentIds`/`classIds` nas claims são **cache de otimização, nunca fonte de verdade** — a fonte de verdade é `users/{uid}` + regras (como já é). Claims mantêm obrigatoriamente `role` e `schoolId`/`schoolIds`.

## 3. Decisão consolidada

1. **Adotar o modelo "3 portas, 1 Firebase Auth"** — já é a arquitetura existente; nenhuma reconstrução.
2. **Roles oficiais:** `pai`/`encarregado` (sinónimo de compatibilidade), `professor`, `instituicao`, `admin`, `terminal`. 
3. **Fluxo de criação:** 100% server-side (CFs), com claims escritas na criação e **recalculadas em toda mutação de vínculo**; senha temporária CSPRNG; `mustChangePassword` obrigatório no primeiro login (já implementado na UI; manter).
4. **Identidade:** e-mail real como credencial (v1); telefone como contacto; identificador por telefone via CF+App Check na fase 2; **zero e-mails sintéticos**.
5. **Correções obrigatórias antes de qualquer novo recurso:** P0-1, P0-2, P0-3, P0-4 (segurança), depois P1-5, P1-6.
6. **Auditoria:** eventos de login/criação/senha já existem; limpar hard-codes e garantir schoolId real.

## 4. Delta para o prompt de implementação (substitui a auditoria incorreta do prompt anterior)

O prompt do auditor é bons princípios, mas manda "criar" o que já existe. Substituir as premissas por:

- "O sistema JÁ TEM: 3 rotas de login com RBAC por portal, `loginUser` sem inferência de e-mail, criação gerida por senha temporária com `mustChangePassword`, CFs `enrollStudent`/`enrollTeacher`/`provisionTerminalDevice` com claims, RouteGuard, regras de `users` imutabilizando role/vínculos. NÃO recriar — consolidar."
- "REMOVER: (1) backdoor de auto-provisionamento no catch de `loginUser`; (2) geração de e-mail sintético por telefone em `createManagedUser`; (3) auto-criação de perfil `pai` sem documento; (4) `Math.random()` em senhas."
- "MOVER para Cloud Functions: reemissão de senha (`reissueUserPassword`), criação de encarregado (`createGuardian`), vinculação/desvinculação de alunos (recalcula claims)."
- "CLAIMS: `role` + `schoolId(s)` obrigatórios e escritos na criação; `studentIds`/`classIds` como cache; fonte de verdade = `users/{uid}` + regras."
- "Validações finais: as 20 do prompt do auditor são aprovadas, acrescendo: (21) tentar login por telefone deve falhar com mensagem clara na v1; (22) `reissueCredentials` deve produzir senha que efetivamente autentica; (23) conta criada sem claims não existe (criação só server-side); (24) e-mail sintético `@escola.alomae.ao` não é gerado em nenhum fluxo."

**Critério de aceite:** sem backdoor (senha qualquer não apropri conta); reemissão de credenciais funciona ponta-a-ponta; todos os utilizadores têm claims coerentes; nenhum fluxo gera e-mail sintético; auditoria com schoolId real; `lint/typecheck/build` verdes.
