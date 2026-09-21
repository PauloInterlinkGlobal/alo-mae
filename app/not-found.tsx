import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-md w-full shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Página não encontrada</h2>
        <p className="text-sm text-slate-500 mb-6">
          A página solicitada não existe ou foi movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#143A7B] text-white font-bold text-sm hover:bg-[#0D1B3D] transition-colors"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
