'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink, Copy, ShieldCheck, Globe } from 'lucide-react';
import { getFirebaseDiagnostics, checkFirestoreConnectivity, firebaseConfig } from '@/lib/firebase';
import { getUnauthorizedDomainHelp } from '@/services/auth.service';

interface FirebaseDomainAlertProps {
  errorMsg: string;
  onCopy?: () => void;
}

export function FirebaseDomainAlert({ errorMsg }: FirebaseDomainAlertProps) {
  const [diag, setDiag] = useState<ReturnType<typeof getFirebaseDiagnostics> | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<string>('A verificar…');
  const [copied, setCopied] = useState(false);

  const isUnauthorizedDomain =
    errorMsg.includes('não autorizado') ||
    errorMsg.includes('unauthorized') ||
    errorMsg.includes('Authorized domains') ||
    errorMsg.includes('Domínio não autorizado');

  useEffect(() => {
    if (!isUnauthorizedDomain) return;
    setDiag(getFirebaseDiagnostics());
    checkFirestoreConnectivity().then((r) => setFirestoreStatus(r.message));
  }, [isUnauthorizedDomain, errorMsg]);

  if (!isUnauthorizedDomain) return null;

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const help = getUnauthorizedDomainHelp();

  const copyHelp = async () => {
    try {
      await navigator.clipboard.writeText(`Hostname: ${hostname}\nAuthDomain: ${firebaseConfig.authDomain}\nProjectId: ${firebaseConfig.projectId}\n\n${help}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700 border border-amber-200">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-amber-900">Correção necessária no Firebase Console</h4>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            Este erro <b>não é do seu código</b> — é configuração do Firebase.
            O domínio onde a APP está a correr <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] border border-amber-200">{hostname || '(desconhecido)'}</code> precisa ser autorizado.
          </p>

          <div className="mt-3 rounded-xl bg-white border border-amber-200 p-3">
            <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Passos (2 min)
            </p>
            <ol className="mt-2 list-decimal list-inside space-y-1.5 text-xs text-slate-700">
              <li>
                Abra <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">Firebase Console → Authentication → Settings → Authorized domains <ExternalLink className="h-3 w-3" /></a>
              </li>
              <li>
                Clique <b>Add domain</b> e adicione exatamente: <code className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-white text-[11px]">{hostname}</code>
              </li>
              <li>
                Se estiver no AI Studio / Workstations (preview <code>*.cloudworkstations.dev</code>) adicione também:
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] border">*.cloudworkstations.dev</code>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] border">*.aistudio.google.com</code>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] border">ai-studio-almeconexoquecui-c859596d-ed42-4f57-9605-de70a18847eb</code>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] border">*.e2b.app</code>
                </div>
              </li>
              <li>
                Em <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">Google Cloud → APIs & Services → Credentials → API key <ExternalLink className="h-3 w-3" /></a> verifique <b>Application restrictions → Website restrictions</b> permite <code className="font-mono text-[11px]">{hostname}</code> (ou use <b>None</b> temporariamente para teste).
              </li>
              <li>Aguarde 30–60s e recarregue esta página (Ctrl+Shift+R).</li>
            </ol>
            <div className="mt-3 rounded-lg bg-slate-900 text-slate-200 p-3 font-mono text-[11px] leading-relaxed">
              <div>hostname: {hostname || '—'}</div>
              <div>authDomain: {(firebaseConfig as any).authDomain || '—'}</div>
              <div>projectId: {firebaseConfig.projectId || '—'}</div>
              <div>origin: {typeof window !== 'undefined' ? window.location.origin : '—'}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={copyHelp} className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 transition">
                <Copy className="h-3.5 w-3.5" /> {copied ? 'Copiado!' : 'Copiar diagnóstico'}
              </button>
              <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-600 transition">
                <ShieldCheck className="h-3.5 w-3.5" /> Abrir Firebase Console
              </a>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-blue-50 border border-blue-200 p-3">
            <p className="text-[11px] font-semibold text-blue-900">Firestore • diagnóstico rápido</p>
            <p className="text-xs text-blue-800 mt-1">{firestoreStatus}</p>
            {diag && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-semibold text-blue-700 hover:text-blue-800">Ver getFirebaseDiagnostics() completo</summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] text-slate-100">{JSON.stringify(diag, null, 2)}</pre>
              </details>
            )}
            <p className="mt-2 text-[11px] text-blue-700">
              Dica: no console do navegador execute <code className="rounded bg-blue-100 px-1 py-0.5 font-mono border border-blue-200">getFirebaseDiagnostics()</code> e <code className="rounded bg-blue-100 px-1 py-0.5 font-mono border border-blue-200">checkFirestoreConnectivity()</code>.
            </p>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            Após autorizar, este aviso desaparecerá. Enquanto estiver pendente, pode usar login e-mail/senha (não depende de popup OAuth) ou testar em <code className="font-mono">localhost:3000</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default FirebaseDomainAlert;
