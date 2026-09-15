'use client';

import React, { useState } from 'react';
import { useSystem } from '@/lib/context';
import {
  ShieldCheck,
  HeartPulse,
  PhoneCall,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  ArrowRight,
  Sparkles,
  Printer,
  Download,
  Eye,
  FileText,
} from 'lucide-react';
import { MedicalClinic } from '@/lib/types';

export default function PaiSeguroPage() {
  const { selectedStudent, clinics, setActiveMedicalGuide } = useSystem();
  const [selectedClinic, setSelectedClinic] = useState<MedicalClinic>(clinics[0]);

  const handleEmitGuide = (clinic: MedicalClinic, autoPrint = false) => {
    setSelectedClinic(clinic);
    setActiveMedicalGuide({
      student: selectedStudent,
      clinic,
      autoPrint,
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-['Poppins',sans-serif] font-bold text-xl text-[#0D1B3D]">
          Seguro Escolar & Rede Médica 24h
        </h1>
        <p className="text-xs text-slate-500">
          Assistência médica hospitalar de urgência para o seu educando
        </p>
      </div>

      {/* Insurance Policy Card */}
      <div className="bg-gradient-to-br from-[#0B3A2C] via-emerald-900 to-[#0D1B3D] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 text-emerald-300">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold block">
                  Plano Hospitalar Integrado
                </span>
                <h2 className="font-['Poppins',sans-serif] font-bold text-lg text-white">
                  Apólice: {selectedStudent.insurancePolicyId}
                </h2>
              </div>
            </div>

            <span className="bg-emerald-400 text-slate-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Ativa 24h
            </span>
          </div>

          <div className="bg-black/30 backdrop-blur-xs rounded-2xl p-4 border border-white/10 mb-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-300">Beneficiário Principal:</span>
              <strong className="text-white">{selectedStudent.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Escola / Matrícula:</span>
              <span className="text-white">{selectedStudent.schoolName} • {selectedStudent.matricula}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Cobertura:</span>
              <span className="text-emerald-300 font-semibold">100% Urgências & Traumatologia</span>
            </div>
          </div>

          {/* Quick Actions Bar (Requisitos 33 e 39: Ver Guia, Imprimir, Baixar PDF) */}
          <div className="space-y-2">
            <button
              onClick={() => handleEmitGuide(selectedClinic, false)}
              className="w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white py-3 px-4 rounded-2xl font-['Poppins',sans-serif] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
            >
              <HeartPulse className="w-5 h-5 animate-pulse" />
              <span>Emitir Guia de Atendimento SOS</span>
            </button>

            {/* Compact & Responsive Actions (Mobile-friendly) */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleEmitGuide(selectedClinic, false)}
                className="bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10"
                title="Visualizar documento oficial da guia médica"
              >
                <Eye className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                <span className="truncate">Ver Guia</span>
              </button>

              <button
                type="button"
                onClick={() => handleEmitGuide(selectedClinic, true)}
                className="bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10"
                title="Imprimir guia médica oficial com QR Code"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                <span className="truncate">Imprimir</span>
              </button>

              <button
                type="button"
                onClick={() => handleEmitGuide(selectedClinic, true)}
                className="bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10"
                title="Baixar guia médica em formato PDF"
              >
                <Download className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                <span className="truncate">Baixar PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Coverage Items List */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
        <h3 className="font-['Poppins',sans-serif] font-bold text-sm text-[#0D1B3D] mb-3">
          Coberturas Médicas Incluídas
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pronto-socorro 24h</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Traumatologia pediátrica</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Suturas e pequenas cirurgias</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Exames de raio-X e sangue</span>
          </div>
        </div>
      </div>

      {/* Partner Clinics Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D]">
            Rede Hospitalar em Luanda ({clinics.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">Credenciadas Alô mãe</span>
        </div>

        <div className="space-y-3">
          {clinics.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
              <HeartPulse className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma guia médica disponível.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Não foram localizadas unidades hospitalares credenciadas ou apólices ativas para emissão neste momento.
              </p>
            </div>
          ) : (
            clinics.map((clinic) => (
            <div
              key={clinic.id}
              className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs hover:border-[#143A7B]/40 transition-all space-y-3"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={clinic.imageUrl}
                    alt={clinic.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="font-['Poppins',sans-serif] font-bold text-sm text-[#0D1B3D] truncate">
                      {clinic.name}
                    </h4>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      {clinic.timeMin}
                    </span>
                  </div>

                  <p className="text-xs text-[#143A7B] font-medium">{clinic.specialty}</p>

                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{clinic.address} • {clinic.district}</span>
                  </p>
                </div>
              </div>

              {/* Services tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {clinic.services.map((svc, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                  >
                    {svc}
                  </span>
                ))}
              </div>

              {/* Actions: Direct Call & Emit Guide (Requisitos 33 e 39) */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <a
                  href={`tel:${clinic.emergencyPhone.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ligar Central</span>
                </a>

                <button
                  onClick={() => handleEmitGuide(clinic, false)}
                  className="flex items-center justify-center gap-1.5 bg-[#143A7B] hover:bg-[#0D1B3D] text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <HeartPulse className="w-3.5 h-3.5 text-rose-300" />
                  <span>Ver / Imprimir Guia</span>
                </button>
              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
