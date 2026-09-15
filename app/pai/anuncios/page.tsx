'use client';

import React from 'react';
import Link from 'next/link';
import { MuralAnunciosCarousel } from '@/components/pai/MuralAnunciosCarousel';
import { ArrowLeft, Sparkles, BookOpen, ShieldCheck } from 'lucide-react';

export default function PaiAnunciosPage() {
  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0D1B3D] via-[#143A7B] to-[#0D1B3D] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <Link
            href="/pai/inicio"
            className="inline-flex items-center gap-1.5 text-xs text-blue-200 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Início</span>
          </Link>

          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-amber-300 border border-white/15 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Mural Institucional
            </span>
          </div>

          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl tracking-tight text-white mb-1">
            Aulas e Explicações
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm">
            Encontre professores credenciados da escola para aulas particulares, reforço escolar,
            explicação domiciliar e preparação para exames.
          </p>
        </div>
      </div>

      {/* Safety & Institutional Guarantee Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-900">
        <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-blue-950">Garantia e Credenciamento Escolar</p>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Todos os anúncios publicados neste mural são submetidos a verificação prévia e autorização
            da Direção da Instituição, assegurando idoneidade e alinhamento pedagógico com o currículo nacional.
          </p>
        </div>
      </div>

      {/* Main Mural & Carousel Section */}
      <MuralAnunciosCarousel />
    </div>
  );
}
