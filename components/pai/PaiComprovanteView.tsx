'use client';

import React from 'react';
import Link from 'next/link';
import { useSystem } from '@/lib/context';
import { Logo } from '@/components/LogoImg';
import {
  ArrowLeft,
  Printer,
  Share2,
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  ScanFace,
  Fingerprint,
} from 'lucide-react';

interface PaiComprovanteViewProps {
  id: string;
}

export const PaiComprovanteView: React.FC<PaiComprovanteViewProps> = ({ id }) => {
  const { logs, students } = useSystem();

  const currentLog =
    logs.find((l) => l.id === id) ||
    logs.find((l) => l.receiptCode.includes(id)) ||
    logs[0];

  const student = students.find((s) => s.id === currentLog?.studentId) || students[0];

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-lg mx-auto">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/pai/atividades"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#143A7B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Atividades</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Imprimir / Guardar PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator
                  .share({
                    title: 'Comprovante Alô mãe',
                    text: `Comprovante de ${
                      currentLog.type === 'entry' ? 'Entrada' : 'Saída'
                    } de ${currentLog.studentName}`,
                    url: window.location.href,
                  })
                  .catch(() => {});
              }
            }}
            className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Partilhar"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Official Legal Receipt Certificate Card */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-200/90 shadow-xl relative overflow-hidden print:border-none print:shadow-none">
        {/* Certificate Watermark Header */}
        <div className="text-center pb-5 border-b-2 border-dashed border-slate-200">
          <div className="flex justify-center mb-2">
            <Logo size="md" />
          </div>
          <p className="font-['Poppins',sans-serif] font-bold text-xs uppercase tracking-widest text-[#143A7B]">
            Comprovante Digital de Acesso Escolar
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            CHAVE ÚNICA: {currentLog.receiptCode}
          </p>
        </div>

        {/* Student Data Section */}
        <div className="py-5 border-b border-slate-100 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#143A7B]/20 shrink-0 shadow-sm">
            <img
              src={currentLog.studentPhoto || student.photoUrl}
              alt={currentLog.studentName}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="overflow-hidden flex-1">
            <h2 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D] truncate">
              {currentLog.studentName}
            </h2>
            <p className="text-xs text-slate-500 font-medium truncate">
              {currentLog.className} • {currentLog.schoolName}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Matrícula: {student.matricula}
            </p>
          </div>
        </div>

        {/* Access Event Specifications */}
        <div className="py-5 space-y-3 border-b border-slate-100 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Tipo de Registo:</span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                currentLog.type === 'entry'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {currentLog.type === 'entry' ? 'ENTRADA CONFIRMADA' : 'SAÍDA CONFIRMADA'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Data do Registo:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentLog.date}</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Horário Exato:</span>
            <span className="font-mono font-bold text-slate-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{currentLog.timestamp}</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Local / Portaria:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentLog.location}</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Método de Validação:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              {currentLog.method === 'facial' ? (
                <ScanFace className="w-3.5 h-3.5 text-[#143A7B]" />
              ) : (
                <Fingerprint className="w-3.5 h-3.5 text-[#143A7B]" />
              )}
              <span>
                {currentLog.method === 'facial'
                  ? 'Reconhecimento Facial'
                  : currentLog.method === 'fingerprint'
                  ? 'Biometria Dactilar'
                  : 'Validação Manual'}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Notificado a:</span>
            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
              {currentLog.notifiedRecipient}
            </span>
          </div>
        </div>

        {/* QR Code & Legal Signature */}
        <div className="pt-5 flex items-center justify-between gap-4">
          <div className="space-y-1 text-left flex-1">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Documento com Validade Legal</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Assinatura digital emitida pela plataforma Alô mãe em conformidade com as diretrizes de segurança escolar.
            </p>
          </div>

          {/* Stylized QR Code */}
          <div className="w-18 h-18 bg-slate-900 p-1.5 rounded-xl border border-slate-300 flex items-center justify-center shrink-0">
            <div className="grid grid-cols-4 gap-0.5 w-full h-full p-1 bg-white rounded-md">
              <div className="bg-black rounded-xs" />
              <div className="bg-black rounded-xs" />
              <div className="bg-white" />
              <div className="bg-black rounded-xs" />
              <div className="bg-black rounded-xs" />
              <div className="bg-white" />
              <div className="bg-black rounded-xs" />
              <div className="bg-white" />
              <div className="bg-white" />
              <div className="bg-black rounded-xs" />
              <div className="bg-black rounded-xs" />
              <div className="bg-black rounded-xs" />
              <div className="bg-black rounded-xs" />
              <div className="bg-white" />
              <div className="bg-black rounded-xs" />
              <div className="bg-black rounded-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
