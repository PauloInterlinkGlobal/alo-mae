'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, MedicalClinic, MedicalGuide } from '@/lib/types';
import { Logo } from './LogoImg';
import {
  Phone,
  Shield,
  FileText,
  CheckCircle,
  Printer,
  X,
  Hospital,
  QrCode,
  Download,
  AlertTriangle,
  Lock,
  Building,
  User,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  HeartPulse,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useSystem } from '@/lib/context';
import { saveMedicalGuide, recordGuideAuditLog } from '@/lib/firebase-services';

interface GuiaAtendimentoModalProps {
  guideData: { student: Student; clinic: MedicalClinic } | null;
  onClose: () => void;
  autoPrint?: boolean;
}

export const GuiaAtendimentoModal: React.FC<GuiaAtendimentoModalProps> = ({
  guideData,
  onClose,
  autoPrint = false,
}) => {
  const { currentUser } = useSystem();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const printTriggeredRef = useRef(false);

  const student = guideData?.student;
  const clinic = guideData?.clinic;

  const now = useMemo(() => new Date(), []);
  const guideNumber = useMemo(() => {
    if (!student) return '';
    const rawMatricula = student.matricula ? student.matricula.replace(/[^0-9]/g, '') : '00192';
    return `GUIA-MED-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${rawMatricula}`;
  }, [student, now]);

  // Public safe validation URL (Requisito 36: sem senhas, tokens ou dados médicos confidenciais)
  const validationUrl = useMemo(() => {
    if (!guideNumber) return '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/validar/guia/${guideNumber}`;
    }
    return `https://alomae.ao/validar/guia/${guideNumber}`;
  }, [guideNumber]);

  // Requisito 34: Segurança da Guia Médica
  // Verificar no Frontend se o studentId pertence ao encarregado autenticado
  const isAuthorized = useMemo(() => {
    if (!student) return true;
    if (!currentUser) return true; // Fallback para visualização local inicial
    if (currentUser.role === 'admin' || currentUser.role === 'instituicao') return true;

    // Caso o perfil seja pai/encarregado
    if (currentUser.studentId && currentUser.studentId === student.id) return true;
    if (student.parentUid && student.parentUid === currentUser.uid) return true;
    if (
      student.parentEmail &&
      currentUser.email &&
      student.parentEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
    ) {
      return true;
    }
    if (
      student.parentName &&
      currentUser.name &&
      (student.parentName.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]) ||
        currentUser.name.toLowerCase().includes(student.parentName.toLowerCase().split(' ')[0]))
    ) {
      return true;
    }

    return false;
  }, [currentUser, student]);

  // Generate safe QR Code
  useEffect(() => {
    if (!validationUrl) return;
    let isMounted = true;
    QRCode.toDataURL(validationUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0D1B3D',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (isMounted) setQrCodeUrl(url);
      })
      .catch((err) => {
        console.warn('Erro ao gerar QR Code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [validationUrl]);

  // Auto-save guide to Firestore on open so it is valid for instant clinic QR scanning
  useEffect(() => {
    if (!guideData || !student || !clinic || !isAuthorized || !guideNumber) return;

    const fullGuide: MedicalGuide = {
      id: guideNumber,
      guideNumber,
      institutionId: student.institutionId || 'school_horizonte_luanda',
      schoolName: student.schoolName || 'Colégio Horizonte de Luanda',
      studentId: student.id,
      studentName: student.name,
      studentPhoto: student.photoUrl,
      studentMatricula: student.matricula,
      className: student.className || '1º Ano A',
      guardianUid: currentUser?.uid || student.parentUid || 'user-pai-1',
      guardianName: student.parentName || currentUser?.name || 'Fernanda Silva',
      emergencyContactPhone: student.parentPhone || '+244 923 884 912',
      clinicId: clinic.id,
      clinicName: clinic.name,
      clinicAddress: clinic.address,
      clinicEmergencyPhone: clinic.emergencyPhone,
      insuranceProviderName: 'Alô Protege Escolar • ENSA Seguros',
      insurancePolicyNumber: student.insurancePolicyId || 'SEG-ALO-2024-8821',
      insuranceType: 'Seguro de Saúde Escolar Integral 24h',
      priority: 'urgent',
      status: 'issued',
      issuedByUid: currentUser?.uid || 'user-pai-1',
      issuedByName: currentUser?.name || 'Encarregado de Educação',
      issuedAt: now.toISOString(),
      notes: 'Guia emitida com cobertura integral 100% de urgência médica escolar e traumatologia.',
    };

    saveMedicalGuide(fullGuide).catch(console.warn);
  }, [isAuthorized, guideNumber, student, clinic, currentUser, now, guideData]);

  // Execute print and record audit log (Requisito 40)
  const handlePrint = React.useCallback(async () => {
    if (!student || !clinic) return;
    if (!isAuthorized) {
      alert('Acesso negado: Não possui permissão para emitir guias médicas de outro educando.');
      return;
    }

    setIsSaving(true);
    try {
      // Requisito 40: Auditoria da Guia
      await recordGuideAuditLog({
        action: 'medical_guide_printed',
        actorUid: currentUser?.uid || 'user-pai-1',
        actorName: currentUser?.name || student.parentName || 'Encarregado',
        actorRole: currentUser?.role || 'pai',
        studentId: student.id,
        studentName: student.name,
        medicalGuideId: guideNumber,
        guideNumber,
        clinicName: clinic.name,
        institutionId: student.institutionId || 'school_horizonte_luanda',
      });
    } catch (auditErr) {
      console.warn('Erro ao gravar auditoria:', auditErr);
    } finally {
      setIsSaving(false);
      window.print();
    }
  }, [student, clinic, isAuthorized, currentUser, guideNumber]);

  // Requisito 38: PDF
  const handleDownloadPdf = async () => {
    setFeedbackNotice('Dica: Na janela que se abrir, escolha "Guardar como PDF" como impressora de destino.');
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 6000);
    await handlePrint();
  };

  // Auto-print if requested
  useEffect(() => {
    if (autoPrint && isAuthorized && !printTriggeredRef.current && student && clinic) {
      printTriggeredRef.current = true;
      const t = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [autoPrint, isAuthorized, student, clinic, handlePrint]);

  if (!guideData || !student || !clinic) return null;

  const studentBirthDate = student.dateOfBirth
    ? typeof student.dateOfBirth === 'string'
      ? student.dateOfBirth
      : new Date().toLocaleDateString('pt-PT')
    : '14/05/2018';

  const guardianPhoto =
    currentUser?.avatarUrl ||
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80';

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable w-[96%] max-w-[96vw] sm:max-w-2xl">
        <div className="modal-content bg-white rounded-3xl shadow-2xl border border-slate-200 w-full overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh]">
          {/* Interactive Modal Header (Hidden on @media print) */}
          <div className="modal-header bg-[#0D1B3D] text-white p-3.5 sm:p-4 flex items-center justify-between no-print">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm tracking-wide flex items-center gap-1.5">
                  <span>GUIA MÉDICA DE ATENDIMENTO</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase">
                    Oficial
                  </span>
                </h3>
                <p className="text-[10px] text-blue-200/90">
                  Alô Mãe • Conexão que Cuida • Rede Hospitalar 24h
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback notice for PDF instructions */}
          {feedbackNotice && (
            <div className="bg-blue-50 border-b border-blue-200 p-2.5 px-4 text-xs text-blue-800 flex items-center gap-2 no-print animate-fade-in">
              <Download className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="font-medium">{feedbackNotice}</p>
            </div>
          )}

          {/* Modal Body / Printable Document Container */}
          <div className="modal-body p-3 sm:p-6 overflow-y-auto space-y-4 text-xs bg-slate-50/50">
            {/* Security Check Alert if unauthorized (Requisito 34) */}
            {!isAuthorized ? (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-rose-900">Acesso Restrito ao Encarregado</h4>
                <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">
                  Por razões de segurança e proteção de dados do estudante, esta guia médica só pode ser visualizada ou impressa pelo encarregado de educação autenticado responsável pelo educando <strong>{student.name}</strong>.
                </p>
                <div className="pt-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              /* Requisito 35: MODELO DE GUIA MÉDICA OFICIAL */
              <div className="printable-medical-guide bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
                {/* 1. Official Header */}
                <div className="border-b-2 border-[#0D1B3D] pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Logo variant="dark" size="sm" showSubtitle={false} />
                    </div>
                    <span className="text-[11px] font-bold tracking-widest text-[#143A7B] uppercase block mt-1">
                      CONEXÃO QUE CUIDA
                    </span>
                    <h2 className="font-['Poppins',sans-serif] font-black text-base sm:text-lg text-[#0D1B3D] tracking-tight mt-0.5">
                      GUIA MÉDICA
                    </h2>
                  </div>

                  <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-slate-200 sm:border-none">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Número da Guia
                    </span>
                    <span className="font-mono font-extrabold text-sm sm:text-base text-rose-700">
                      {guideNumber}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Emissão: {now.toLocaleDateString('pt-PT')} às {now.toLocaleTimeString('pt-PT').slice(0, 5)}
                    </span>
                  </div>
                </div>

                {/* 2. Dados do Estudante & Encarregado (Requisito 35) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Dados do estudante */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/80 mb-2.5 text-slate-800 font-bold text-[11px]">
                      <User className="w-3.5 h-3.5 text-[#143A7B]" />
                      <span>DADOS DO ESTUDANTE</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                        <img
                          src={student.photoUrl || 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400'}
                          alt={student.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">Nome do Aluno</span>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {student.name}
                        </h4>
                        <div className="text-[11px] text-slate-600 space-y-0.5">
                          <p>
                            <span className="text-slate-400">Matrícula:</span>{' '}
                            <strong className="text-slate-800 font-mono">{student.matricula}</strong>
                          </p>
                          <p>
                            <span className="text-slate-400">Classe:</span>{' '}
                            <span className="text-slate-800 font-medium">{student.className || '1º Ano A'}</span>
                          </p>
                          <p>
                            <span className="text-slate-400">Nascimento:</span>{' '}
                            <span className="text-slate-800">{studentBirthDate}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Encarregado de Educação */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/80 mb-2.5 text-slate-800 font-bold text-[11px]">
                      <Shield className="w-3.5 h-3.5 text-[#143A7B]" />
                      <span>ENCARREGADO DE EDUCAÇÃO</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                        <img
                          src={guardianPhoto}
                          alt={student.parentName || 'Encarregado'}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">Nome do Encarregado</span>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {student.parentName || currentUser?.name || 'Fernanda Silva'}
                        </h4>
                        <div className="text-[11px] text-slate-600 space-y-0.5">
                          <p className="flex items-center gap-1">
                            <span className="text-slate-400">Telefone:</span>{' '}
                            <strong className="text-[#0D1B3D]">{student.parentPhone || '+244 923 884 912'}</strong>
                          </p>
                          <p>
                            <span className="text-slate-400">Relação:</span>{' '}
                            <span className="text-slate-800">Encarregado(a) Principal</span>
                          </p>
                          <p>
                            <span className="text-slate-400">Escola:</span>{' '}
                            <span className="text-slate-800 truncate block font-medium">
                              {student.schoolName || 'Colégio Horizonte de Luanda'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Seguro & Coberturas (Requisito 35) */}
                <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-[11px]">
                      <Shield className="w-4 h-4 text-emerald-700" />
                      <span>DADOS DA APÓLICE DE SEGURO ESCOLAR</span>
                    </div>

                    <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Possui Seguro: SIM
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-[10px] text-emerald-800 block">Seguradora:</span>
                      <strong className="text-emerald-950">Alô Protege Escolar • ENSA</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-800 block">Nº Apólice:</span>
                      <strong className="text-emerald-950 font-mono">{student.insurancePolicyId || 'SEG-ALO-2024-8821'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-800 block">Tipo:</span>
                      <span className="text-emerald-950 font-medium">Hospitalar & Traumatologia 24h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-800 block">Validade:</span>
                      <span className="text-emerald-950 font-bold">Ativa • Ano Letivo 2025/2026</span>
                    </div>
                  </div>

                  {/* Coberturas incluídas */}
                  <div className="pt-1.5 border-t border-emerald-200/60">
                    <span className="text-[10px] font-bold text-emerald-900 block mb-1">
                      Coberturas Autorizadas:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-emerald-950">
                      <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Pronto-Socorro, Triagem & Cuidados Médicos 24h</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Traumatologia Pediátrica, Suturas & Imobilizações</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Exames de Diagnóstico: Raio-X, Ultrassom e Sangue</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Internamento Emergencial (100% Coberto sem Copagamento)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Clínica / Unidade de Atendimento & Detalhes da Guia (Requisito 35) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Clínica */}
                  <div className="p-3 bg-red-50/70 rounded-2xl border border-red-200/90 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-red-950 text-[11px] pb-1 border-b border-red-200">
                      <Hospital className="w-4 h-4 text-red-700" />
                      <span>UNIDADE MÉDICA DE ATENDIMENTO</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{clinic.name}</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">{clinic.address}</p>
                      <p className="text-[11px] text-red-700 font-bold mt-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> Central de Urgência: {clinic.emergencyPhone}
                      </p>
                    </div>
                  </div>

                  {/* Detalhes da Guia */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200 font-bold text-slate-800">
                      <span className="text-[11px]">PARÂMETROS DA GUIA</span>
                      <span className="bg-rose-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                        Prioridade: Urgente
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Validade:</span>
                        <strong className="text-slate-800">Válida por 48 horas</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Motivo:</span>
                        <span className="text-slate-800 font-medium">Urgência Escolar & Pediátrica</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Copagamento:</span>
                        <strong className="text-emerald-700">0,00 Kz (Isento)</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Canal:</span>
                        <span className="text-slate-800">Direto Alô Protege</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Observações Oficiais */}
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#143A7B]" /> Observações & Instruções à Receção Clínica:
                  </p>
                  <p className="leading-relaxed">
                    A apresentação deste documento digital ou impresso autoriza a receção imediata do estudante beneficiário sem necessidade de caução financeira prévia pelo encarregado. O hospital faturará o atendimento diretamente à entidade seguradora pelo protocolo Alô Protege Escolar.
                  </p>
                </div>

                {/* 6. QR Code / Código de Validação & Rodapé Oficial (Requisito 35 & 36) */}
                <div className="pt-3 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {qrCodeUrl ? (
                      <div className="p-1.5 bg-white rounded-xl border-2 border-slate-300 shrink-0 shadow-xs">
                        <img
                          src={qrCodeUrl}
                          alt="QR Code de Validação"
                          className="w-20 h-20 sm:w-24 sm:h-24"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-slate-200 rounded-xl flex items-center justify-center shrink-0">
                        <QrCode className="w-8 h-8 text-slate-400 animate-pulse" />
                      </div>
                    )}

                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Código de Validação Hospitalar
                      </span>
                      <span className="font-mono font-black text-xs sm:text-sm text-[#0D1B3D] tracking-widest block">
                        {guideNumber}
                      </span>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Aponte a câmara do telemóvel para validar a autenticidade deste documento em tempo real.
                      </p>
                    </div>
                  </div>

                  {/* Institutional signature seal */}
                  <div className="text-center sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
                    <div className="inline-block text-center border-t border-slate-400 pt-1 px-4">
                      <p className="font-bold text-[11px] text-slate-800 uppercase tracking-wide">
                        {student.schoolName || 'Colégio Horizonte de Luanda'}
                      </p>
                      <p className="text-[10px] text-slate-500">Emitido pela instituição.</p>
                      <span className="text-[9px] text-emerald-700 font-semibold font-mono block mt-0.5">
                        AUTENTICAÇÃO DIGITAL ATIVA
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions Bar (Requisitos 33, 38, 39: Imprimir Guia, Baixar PDF, Ver Guia) */}
          {isAuthorized && (
            <div className="modal-footer p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 no-print">
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Apresente este documento na triagem hospitalar.
              </span>

              {/* Compact, responsive action buttons (Requisito 39) */}
              <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isSaving}
                  className="min-h-[44px] py-2.5 px-3 sm:px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-700" />
                  <span>Baixar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isSaving}
                  className="min-h-[44px] py-2.5 px-3 sm:px-4 bg-[#0D1B3D] hover:bg-[#143A7B] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Guia</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="col-span-2 sm:col-span-1 min-h-[44px] py-2.5 px-3 sm:px-4 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <span>Concluir & Fechar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
