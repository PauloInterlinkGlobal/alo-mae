'use client';

import React from 'react';
import { AccessLog } from '@/lib/types';
import { Logo } from './LogoImg';
import { CheckCircle2, QrCode, ShieldCheck, Download, Printer, X } from 'lucide-react';

interface ComprovanteModalProps {
  log: AccessLog | null;
  onClose: () => void;
}

export const ComprovanteModal: React.FC<ComprovanteModalProps> = ({ log, onClose }) => {
  if (!log) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#0D1B3D] text-white p-4 flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-2 relative z-10">
            <Logo variant="white" size="sm" showSubtitle={false} />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#96B5FE] border-l border-[#96B5FE]/30 pl-2">
              Comprovante Oficial
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="p-6 overflow-y-auto space-y-5 print:p-0">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-950 text-sm">
                  {log.type === 'entry' ? 'Entrada Confirmada' : 'Saída Registrada'}
                </h4>
                <p className="text-[11px] text-emerald-800">Validação biométrica autorizada</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-900 bg-white/80 px-2 py-1 rounded border border-emerald-200">
              {log.timestamp}
            </span>
          </div>

          {/* Student Profile Card */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <img
              src={log.studentPhoto}
              alt={log.studentName}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#143A7B] shadow-sm"
            />
            <div>
              <h3 className="font-bold text-[#0D1B3D] text-base">{log.studentName}</h3>
              <p className="text-xs text-gray-600 font-medium">{log.className} • {log.schoolName}</p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Destino: {log.notifiedRecipient}</p>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Data do Registo</span>
              <span className="font-semibold text-gray-900">{log.date}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Horário Oficial</span>
              <span className="font-bold font-mono text-[#143A7B]">{log.timestamp}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Local de Leitura</span>
              <span className="font-semibold text-gray-900">{log.location}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Método de Validação</span>
              <span className="font-semibold text-emerald-700">
                {log.method === 'facial'
                  ? 'Reconhecimento Facial (IA)'
                  : log.method === 'fingerprint'
                  ? 'Biometria Dactilar'
                  : 'Autorização Manual'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Código de Autenticidade</span>
              <span className="font-mono text-[10px] text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                {log.receiptCode}
              </span>
            </div>
          </div>

          {/* Legal Validation Seal */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#143A7B] shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-[#0D1B3D] mb-0.5">
                Validade Legal e Certificação Digital
              </p>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                Este comprovante possui validade legal perante a instituição e os encarregados de educação — Alô mãe, tecnologia e segurança para a proteção de quem você ama.
              </p>
            </div>
          </div>

          {/* QR Code and Cryptographic Seal */}
          <div className="flex items-center justify-between p-3 bg-gray-900 text-white rounded-xl">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-lg">
                <QrCode className="w-10 h-10 text-gray-900" />
              </div>
              <div className="text-[10px]">
                <p className="font-bold text-gray-200">Hash Criptográfico:</p>
                <p className="font-mono text-gray-400 text-[9px] break-all">
                  SHA256: 8f9b4c2...7a10e83
                </p>
                <p className="text-emerald-400 font-semibold mt-0.5">● Assinado pelo Servidor Seguro</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2.5">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-white border border-gray-300 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir Comprovante
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-[#143A7B] hover:bg-[#0D1B3D] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <Download className="w-4 h-4" />
            Fechar / Salvo no App
          </button>
        </div>
      </div>
    </div>
  );
};
