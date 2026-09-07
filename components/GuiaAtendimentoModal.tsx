'use client';

import React from 'react';
import { Student, MedicalClinic } from '@/lib/types';
import { Logo } from './LogoImg';
import { Phone, Shield, FileText, CheckCircle, Printer, X, Hospital } from 'lucide-react';

interface GuiaAtendimentoModalProps {
  guideData: { student: Student; clinic: MedicalClinic } | null;
  onClose: () => void;
}

export const GuiaAtendimentoModal: React.FC<GuiaAtendimentoModalProps> = ({
  guideData,
  onClose,
}) => {
  if (!guideData) return null;
  const { student, clinic } = guideData;
  const now = new Date();
  const guideNumber = `GUIA-MED-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${student.matricula.replace(/[^0-9]/g, '')}`;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable w-[95%] max-w-[95vw] sm:max-w-lg">
        <div className="modal-content bg-white rounded-2xl shadow-2xl border border-gray-200 w-full overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
          {/* Header */}
          <div className="modal-header bg-[#BA1A1A] text-white p-3.5 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
              <div>
                <h3 className="font-bold text-xs sm:text-sm tracking-wide">GUIA DE ATENDIMENTO MÉDICO</h3>
                <p className="text-[10px] text-white/80">Seguro Escolar Alô Protege • Ativo 24h</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="modal-body p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <Logo variant="dark" size="sm" showSubtitle={true} />
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-gray-500 block">Nº da Guia de Atendimento</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-[#0D1B3D]">{guideNumber}</span>
              </div>
            </div>

            {/* Target Clinic Box */}
            <div className="p-3 bg-red-50 rounded-xl border border-red-200">
              <div className="flex items-start justify-between">
                <div className="flex gap-2.5">
                  <div className="p-2 bg-red-600 text-white rounded-lg shrink-0 mt-0.5">
                    <Hospital className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-950 text-xs sm:text-sm">{clinic.name}</h4>
                    <p className="text-gray-700 text-xs mt-0.5">{clinic.address}</p>
                    <p className="text-red-700 font-semibold mt-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> Central de Urgência: {clinic.emergencyPhone}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Student & Policy Grid (stacked on mobile) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="text-[10px] text-gray-500 block">Beneficiário (Aluno)</span>
                <span className="font-bold text-gray-900 text-xs sm:text-sm">{student.name}</span>
                <span className="text-[10px] text-gray-600 block mt-0.5">{student.className} • Matrícula {student.matricula}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Apólice Coletiva Escolar</span>
                <span className="font-mono font-bold text-emerald-800 text-xs sm:text-sm">{student.insurancePolicyId}</span>
                <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Cobertura Integral 100%</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Encarregado de Educação</span>
                <span className="font-semibold text-gray-900">{student.parentName}</span>
                <span className="text-[10px] text-gray-600 block">{student.parentPhone}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Emissão da Guia</span>
                <span className="font-semibold text-gray-900">
                  {now.toLocaleDateString('pt-PT')} às {now.toLocaleTimeString('pt-PT')}
                </span>
              </div>
            </div>

            {/* Cobertura Inclusa (stacked on mobile) */}
            <div>
              <span className="font-bold text-gray-800 block mb-1.5">Procedimentos e Coberturas Autorizadas:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-gray-700">
                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 px-2 py-1 rounded border border-emerald-100">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Pronto Socorro e Triagem
                </span>
                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 px-2 py-1 rounded border border-emerald-100">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Traumatologia & Suturas
                </span>
                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 px-2 py-1 rounded border border-emerald-100">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Raio-X e Exames de Imagem
                </span>
                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 px-2 py-1 rounded border border-emerald-100">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Internamento Emergencial
                </span>
              </div>
            </div>

            {/* Digital Signature Notice */}
            <div className="p-3 bg-gray-100 rounded-xl text-[10px] text-gray-600 space-y-1">
              <p className="font-bold text-gray-800 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#143A7B]" /> Autorização Prévia Válida
              </p>
              <p>
                A apresentação deste documento digital ou impresso na receção da clínica credenciada autoriza o atendimento imediato do estudante sem copagamento prévio.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-footer p-3 sm:p-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
            <button
              onClick={() => window.print()}
              className="w-full sm:flex-1 min-h-[44px] py-2.5 px-4 bg-white border border-gray-300 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-100 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir Guia
            </button>
            <button
              onClick={onClose}
              className="w-full sm:flex-1 min-h-[44px] py-2.5 px-4 bg-[#BA1A1A] hover:bg-red-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              Concluir & Apresentar na Clínica
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
