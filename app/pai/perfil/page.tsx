'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSystem } from '@/lib/context';
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  GraduationCap,
  Users,
  LogOut,
  ScanFace,
  CheckCircle2,
  Lock,
  ChevronRight,
} from 'lucide-react';

export default function PaiPerfilPage() {
  const { currentUser, selectedStudent, students, logout } = useSystem();
  const router = useRouter();

  const myStudents = students.filter((s) => s.id === 'std-1' || s.id === 'std-2');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-['Poppins',sans-serif] font-bold text-xl text-[#0D1B3D]">
          Perfil do Encarregado
        </h1>
        <p className="text-xs text-slate-500">
          Dados cadastrais, educandos vinculados e credenciais
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#143A7B]/20 shadow-sm shrink-0">
            <img
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300'}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h2 className="font-['Poppins',sans-serif] font-bold text-lg text-[#0D1B3D]">
              {currentUser?.name || 'Fernanda Silva'}
            </h2>
            <p className="text-xs text-[#143A7B] font-semibold">
              Encarregada de Educação Titular
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Conta verificada • Colégio Horizonte
            </p>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-3 text-xs text-slate-700">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Phone className="w-4 h-4 text-[#143A7B] shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                Telefone Principal
              </span>
              <span className="font-medium text-slate-900">{currentUser?.phone || '+244 923 884 912'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Mail className="w-4 h-4 text-[#143A7B] shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                E-mail para Notificações
              </span>
              <span className="font-medium text-slate-900">{currentUser?.email || 'fernanda.silva@email.com'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <MapPin className="w-4 h-4 text-[#143A7B] shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                Residência
              </span>
              <span className="font-medium text-slate-900">Talatona, Luanda — Angola</span>
            </div>
          </div>
        </div>
      </div>

      {/* Children linked */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
        <h3 className="font-['Poppins',sans-serif] font-bold text-sm text-[#0D1B3D] mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#143A7B]" />
          <span>Educandos Vinculados ({myStudents.length})</span>
        </h3>

        <div className="space-y-3">
          {myStudents.map((std) => (
            <div
              key={std.id}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                  <img src={std.photoUrl} alt={std.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-900">{std.name}</h4>
                  <p className="text-[11px] text-slate-500">{std.className} • Matrícula {std.matricula}</p>
                </div>
              </div>

              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Biometria Ativa</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
      >
        <LogOut className="w-4 h-4" />
        <span>Terminar Sessão</span>
      </button>
    </div>
  );
}
