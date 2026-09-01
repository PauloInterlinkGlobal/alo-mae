'use client';

import React, { useState } from 'react';
import { useSystem } from '@/lib/context';
import {
  ShieldCheck,
  HeartPulse,
  PhoneCall,
  MapPin,
  Clock,
  Search,
  Building,
  CheckCircle2,
  FileCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { MedicalClinic } from '@/lib/types';

export default function AdminSeguroPage() {
  const { clinics, students, setActiveMedicalGuide } = useSystem();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClinics = clinics.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.district ? c.district.toLowerCase().includes(q) : false) ||
      c.specialty.toLowerCase().includes(q) ||
      c.services.some((s) => s.toLowerCase().includes(q))
    );
  });

  const handleEmitGuide = (clinic: MedicalClinic) => {
    setActiveMedicalGuide({
      student: students[0],
      clinic,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl text-[#0D1B3D]">
            Gestão do Seguro Escolar & Rede Hospitalar
          </h1>
          <p className="text-sm text-slate-500">
            Controlo da apólice coletiva 24h e clínicas credenciadas em Luanda
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-1.5 rounded-full text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Apólice SEG-ALO-2024-8821 • 100% Ativa</span>
        </div>
      </div>

      {/* Policy Details Banner */}
      <div className="bg-gradient-to-r from-[#0B3A2C] via-emerald-900 to-[#0D1B3D] text-white rounded-3xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold block">
              Apólice Coletiva
            </span>
            <p className="font-['Poppins',sans-serif] font-bold text-lg text-white mt-0.5">
              SEG-ALO-2024-8821
            </p>
            <p className="text-xs text-slate-300 mt-1">Seguradora Parceira: ENSA / Alô Care</p>
          </div>

          <div>
            <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold block">
              Alunos Cobertos
            </span>
            <p className="font-['Poppins',sans-serif] font-bold text-lg text-white mt-0.5">
              240 Alunos (100%)
            </p>
            <p className="text-xs text-slate-300 mt-1">Todos os turnos protegidos</p>
          </div>

          <div>
            <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold block">
              Tempo Médio de Socorro
            </span>
            <p className="font-['Poppins',sans-serif] font-bold text-lg text-emerald-300 mt-0.5">
              7 a 12 minutos
            </p>
            <p className="text-xs text-slate-300 mt-1">Raio de proximidade em Luanda</p>
          </div>

          <div>
            <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold block">
              Cobertura
            </span>
            <p className="font-['Poppins',sans-serif] font-bold text-lg text-white mt-0.5">
              100% Urgências
            </p>
            <p className="text-xs text-slate-300 mt-1">Sem franquia para os encarregados</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar hospital por nome, especialidade ou bairro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143A7B]"
          />
        </div>

        <span className="text-xs text-slate-500 font-semibold">
          {filteredClinics.length} unidades hospitalares disponíveis
        </span>
      </div>

      {/* Clinics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredClinics.map((clinic) => (
          <div
            key={clinic.id}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-[#143A7B]/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={clinic.imageUrl}
                    alt={clinic.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D] truncate">
                      {clinic.name}
                    </h3>
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                      {clinic.timeMin} ({clinic.distanceKm})
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[#143A7B]">{clinic.specialty}</p>

                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{clinic.address} • {clinic.district}</span>
                  </p>
                </div>
              </div>

              {/* Services badges */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {clinic.services.map((svc, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium"
                  >
                    {svc}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <a
                href={`tel:${clinic.emergencyPhone.replace(/\s+/g, '')}`}
                className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 px-3.5 py-2 rounded-xl transition-colors"
              >
                <PhoneCall className="w-4 h-4 text-[#143A7B]" />
                <span>{clinic.emergencyPhone}</span>
              </a>

              <button
                onClick={() => handleEmitGuide(clinic)}
                className="flex items-center gap-1.5 bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <HeartPulse className="w-4 h-4 text-rose-300" />
                <span>Gerar Guia SOS</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
