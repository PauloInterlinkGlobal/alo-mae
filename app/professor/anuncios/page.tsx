'use client';

import React, { useState, useEffect } from 'react';
import { useSystem } from '@/lib/context';
import {
  TeacherListing,
  TeacherListingCategory,
  TeacherListingModality,
  TeacherListingStatus,
} from '@/lib/types';
import {
  fetchTeacherListingsByTeacher,
  saveTeacherListing,
  submitListingForReview,
  deleteTeacherListing,
} from '@/lib/firebase-services';
import {
  Plus,
  Edit,
  Trash2,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  Coins,
  ShieldCheck,
  Eye,
  X,
  RefreshCw,
  Home,
  Monitor,
  School,
  GraduationCap,
  Calendar,
  Phone,
  HelpCircle,
} from 'lucide-react';

export default function ProfessorAnunciosPage() {
  const { currentUser } = useSystem();
  const [listings, setListings] = useState<TeacherListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingListing, setEditingListing] = useState<TeacherListing | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('Matemática');
  const [category, setCategory] = useState<TeacherListingCategory>('home_tutoring');
  const [modality, setModality] = useState<TeacherListingModality>('home');
  const [targetClasses, setTargetClasses] = useState<string[]>(['7ª Classe', '8ª Classe']);
  const [province, setProvince] = useState('Luanda');
  const [municipality, setMunicipality] = useState('Talatona');
  const [district, setDistrict] = useState('Benfica');
  const [locationDesc, setLocationDesc] = useState('Atendimento no domicílio ou imediações');
  const [days, setDays] = useState<string[]>(['Segunda-feira', 'Quarta-feira', 'Sexta-feira']);
  const [startTime, setStartTime] = useState('14:30');
  const [endTime, setEndTime] = useState('18:00');
  const [price, setPrice] = useState('5000');
  const [currency] = useState('Kz');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '+244 923 000 111');
  const [showPhone, setShowPhone] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const teacherId = currentUser?.id || 'prof_antonio_silva';

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTeacherListingsByTeacher(teacherId);
      setListings(data);
    } catch (err) {
      console.warn('Erro ao carregar anúncios do docente:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchTeacherListingsByTeacher(teacherId)
      .then((data) => {
        if (isMounted) {
          setListings(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar anúncios do docente:', err);
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [teacherId]);

  const resetForm = () => {
    setEditingListing(null);
    setTitle('');
    setDescription('');
    setSubjectId('Matemática');
    setCategory('home_tutoring');
    setModality('home');
    setTargetClasses(['7ª Classe', '8ª Classe']);
    setProvince('Luanda');
    setMunicipality('Talatona');
    setDistrict('Benfica');
    setLocationDesc('Atendimento nas imediações');
    setDays(['Segunda-feira', 'Quarta-feira', 'Sexta-feira']);
    setStartTime('14:30');
    setEndTime('18:00');
    setPrice('5000');
    setContactPhone(currentUser?.phone || '+244 923 000 111');
    setShowPhone(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (listing: TeacherListing) => {
    setEditingListing(listing);
    setTitle(listing.title);
    setDescription(listing.description);
    setSubjectId(listing.subjectId || 'Matemática');
    setCategory(listing.category || 'home_tutoring');
    setModality(listing.modality || 'home');
    setTargetClasses(listing.targetClasses || []);
    setProvince(listing.location?.province || 'Luanda');
    setMunicipality(listing.location?.municipality || 'Talatona');
    setDistrict(listing.location?.district || '');
    setLocationDesc(listing.location?.description || '');
    setDays(listing.availability?.days || ['Segunda a Sexta']);
    setStartTime(listing.availability?.startTime || '14:00');
    setEndTime(listing.availability?.endTime || '18:00');
    setPrice(listing.price?.toString() || '5000');
    setContactPhone(listing.contactPhone || '');
    setShowPhone(listing.showPhone ?? false);
    setIsModalOpen(true);
  };

  const handleSave = async (targetStatus: 'draft' | 'pending') => {
    if (!title.trim() || !description.trim()) {
      alert('Por favor preencha o título e a descrição da aula.');
      return;
    }

    setIsSubmitting(true);
    try {
      const listingData: Partial<TeacherListing> & {
        teacherUid: string;
        teacherId: string;
        title: string;
        description: string;
      } = {
        id: editingListing?.id,
        institutionId: 'escola_colegio_horizonte',
        teacherUid: currentUser?.id || teacherId,
        teacherId: currentUser?.id || teacherId,
        teacherName: currentUser?.name || currentUser?.nome || 'Prof. Carlos Manuel',
        teacherPhoto:
          currentUser?.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        title,
        description,
        subjectId,
        category,
        modality,
        targetClasses,
        location: {
          province,
          municipality,
          district,
          description: locationDesc,
        },
        availability: {
          days,
          startTime,
          endTime,
        },
        price: Number(price) || 0,
        currency,
        contactPhone,
        showPhone,
        status: targetStatus,
        rejectionReason: undefined,
        createdAt: editingListing?.createdAt || new Date().toISOString(),
      };

      await saveTeacherListing(listingData);

      setFeedbackMessage({
        type: 'success',
        text:
          targetStatus === 'pending'
            ? 'Anúncio submetido com sucesso para moderação institucional!'
            : 'Rascunho gravado com sucesso.',
      });

      setIsModalOpen(false);
      resetForm();
      loadListings();

      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: any) {
      console.error('Erro ao guardar anúncio:', err);
      alert('Ocorreu um erro ao guardar o anúncio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForReview = async (listingId: string) => {
    try {
      await submitListingForReview(listingId);
      setFeedbackMessage({
        type: 'success',
        text: 'Anúncio enviado para verificação e aprovação da Direção.',
      });
      loadListings();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      alert('Erro ao submeter anúncio.');
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Deseja realmente eliminar este rascunho de anúncio?')) return;
    try {
      await deleteTeacherListing(listingId);
      setFeedbackMessage({
        type: 'success',
        text: 'Anúncio removido com sucesso.',
      });
      loadListings();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      alert('Erro ao apagar anúncio.');
    }
  };

  const availableClassesList = [
    '1ª Classe',
    '2ª Classe',
    '3ª Classe',
    '4ª Classe',
    '5ª Classe',
    '6ª Classe',
    '7ª Classe',
    '8ª Classe',
    '9ª Classe',
    '10ª Classe',
    '11ª Classe',
    '12ª Classe',
  ];

  const toggleClass = (cls: string) => {
    setTargetClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const toggleDay = (day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const daysList = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0D1B3D] via-[#143A7B] to-[#0D1B3D] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-amber-300 border border-white/15 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Módulo Oficial • Aulas e Explicações
            </span>
          </div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl tracking-tight text-white mb-1">
            Gestão de Anúncios e Aulas
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
            Divulgue as suas aulas particulares, explicação domiciliar e preparação para exames
            aos encarregados de educação da instituição com autorização da Direção.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>Criar Novo Anúncio</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs border ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">{feedbackMessage.text}</span>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Publicados no Mural</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {listings.filter((l) => l.status === 'approved').length}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Em Análise / Pendentes</span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {listings.filter((l) => l.status === 'pending').length}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Rascunhos</span>
          <p className="text-2xl font-black text-slate-600 mt-1">
            {listings.filter((l) => l.status === 'draft').length}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Rejeitados / Suspensos</span>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {listings.filter((l) => l.status === 'rejected' || l.status === 'suspended').length}
          </p>
        </div>
      </div>

      {/* Listings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-['Poppins',sans-serif] font-bold text-base text-[#0D1B3D]">
            Os Meus Anúncios Cadastrados
          </h2>
          <button
            onClick={loadListings}
            className="text-xs text-[#143A7B] font-semibold flex items-center gap-1 hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#143A7B]" />
            <p className="text-xs">A carregar os seus anúncios do Firebase...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center space-y-3 border border-dashed border-slate-200 shadow-xs">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Nenhum anúncio criado ainda</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Crie o seu primeiro anúncio de explicação particular ou reforço escolar para que os
              pais e encarregados possam solicitar os seus serviços.
            </p>
            <button
              onClick={handleOpenCreate}
              className="bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Começar Agora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {listings.map((listing) => {
              const isApproved = listing.status === 'approved';
              const isPending = listing.status === 'pending';
              const isDraft = listing.status === 'draft';
              const isRejected = listing.status === 'rejected';
              const isSuspended = listing.status === 'suspended';

              return (
                <div
                  key={listing.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3.5"
                >
                  {/* Top Bar: Subject, Title & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[#0D1B3D] text-white text-xs font-bold px-2.5 py-1 rounded-xl">
                        {listing.subjectId || 'Disciplina'}
                      </span>
                      <h3 className="font-['Poppins',sans-serif] font-bold text-base text-slate-900">
                        {listing.title}
                      </h3>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isApproved && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Aprovado & Publicado</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Em Moderação pela Direção</span>
                        </span>
                      )}
                      {isDraft && (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                          <Edit className="w-3.5 h-3.5 text-slate-500" />
                          <span>Rascunho (Não visível)</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Rejeitado pela Direção</span>
                        </span>
                      )}
                      {isSuspended && (
                        <span className="bg-zinc-100 text-zinc-700 border border-zinc-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                          <span>Suspenso</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rejection Alert Banner with reason (Section 18 requirement) */}
                  {isRejected && listing.rejectionReason && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-900 animate-fade-in">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-950">
                          Motivo da Rejeição pela Administração Escolar:
                        </p>
                        <p className="text-rose-800 mt-0.5 leading-relaxed font-medium">
                          &ldquo;{listing.rejectionReason}&rdquo;
                        </p>
                        <p className="text-[11px] text-rose-700 mt-1">
                          Pode editar o anúncio abaixo ajustando os pontos assinalados e submeter
                          novamente para validação.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    {listing.description}
                  </p>

                  {/* Meta Pills: Modality, Classes, Location, Availability, Price */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Modalidade
                      </span>
                      <span className="font-bold text-slate-800 capitalize">
                        {listing.modality === 'home'
                          ? 'Domiciliar'
                          : listing.modality === 'online'
                          ? 'Online'
                          : listing.modality === 'school'
                          ? 'Na Escola'
                          : 'Outro'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Preço por Sessão
                      </span>
                      <span className="font-bold text-emerald-700">
                        {listing.price?.toLocaleString()} {listing.currency || 'Kz'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Área de Atendimento
                      </span>
                      <span className="font-bold text-slate-800 truncate block">
                        {listing.location?.district || listing.location?.municipality || 'Luanda'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Contacto Público
                      </span>
                      <span className="font-medium text-slate-700">
                        {listing.showPhone ? 'Telefone visível' : 'Chat interno exclusivo'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Atualizado em: {new Date(listing.updatedAt || listing.createdAt).toLocaleDateString('pt-PT')}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* If draft or rejected: submit for review button */}
                      {(isDraft || isRejected) && (
                        <button
                          onClick={() => handleSubmitForReview(listing.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submeter para Moderação</span>
                        </button>
                      )}

                      {/* Edit button (allowed for draft, pending, rejected) */}
                      {(isDraft || isPending || isRejected) && (
                        <button
                          onClick={() => handleOpenEdit(listing)}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      )}

                      {/* Delete button (only drafts according to Section 17) */}
                      {isDraft && (
                        <button
                          onClick={() => handleDelete(listing.id)}
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Apagar Rascunho"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
            {/* Modal Header */}
            <div className="bg-[#0D1B3D] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-['Poppins',sans-serif] font-bold text-base text-white">
                  {editingListing ? 'Editar Anúncio de Aulas' : 'Criar Novo Anúncio de Explicação'}
                </h3>
                <p className="text-xs text-blue-200">
                  Defina as disciplinas, turmas e condições pedagógicas da aula
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave('pending');
              }}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs"
            >
              {/* Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Título do Anúncio *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Explicação de Matemática e Raciocínio Lógico"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Disciplina & Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Disciplina *
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Matemática">Matemática</option>
                    <option value="Língua Portuguesa">Língua Portuguesa</option>
                    <option value="Física">Física</option>
                    <option value="Química">Química</option>
                    <option value="Biologia">Biologia</option>
                    <option value="Estudo do Meio">Estudo do Meio</option>
                    <option value="História">História</option>
                    <option value="Geografia">Geografia</option>
                    <option value="Inglês">Inglês</option>
                    <option value="Informática">Informática</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Categoria da Explicação *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="home_tutoring">Explicação Domiciliar</option>
                    <option value="tutoring">Reforço Escolar</option>
                    <option value="exam_preparation">Preparação para Provas / Exames</option>
                    <option value="academic_support">Acompanhamento Escolar</option>
                    <option value="online">Explicação Online</option>
                    <option value="other">Outra Modalidade Autorizada</option>
                  </select>
                </div>
              </div>

              {/* Modalidade */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Modalidade do Atendimento *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'home', label: 'Domiciliar', icon: Home },
                    { id: 'online', label: 'Online', icon: Monitor },
                    { id: 'school', label: 'Na Escola', icon: School },
                    { id: 'other', label: 'Outro Local', icon: MapPin },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = modality === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setModality(m.id as any)}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-[#143A7B] text-white border-[#143A7B] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-semibold text-[11px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Classes Atendidas (Target Classes) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Classes / Níveis Atendidos
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableClassesList.map((cls) => {
                    const isChecked = targetClasses.includes(cls);
                    return (
                      <button
                        type="button"
                        key={cls}
                        onClick={() => toggleClass(cls)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                          isChecked
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Localização Aproximada (Privacy protection) */}
              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Localização Aproximada (Política de Privacidade)</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Por motivos de segurança, nunca coloque o seu endereço residencial completo.
                  Indique apenas o município e a zona aproximada.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Município</label>
                    <select
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                    >
                      <option value="Talatona">Talatona</option>
                      <option value="Luanda">Luanda (Maianga, Alvalade, Ingombota)</option>
                      <option value="Belas">Belas / Kilamba</option>
                      <option value="Kilamba Kiaxi">Kilamba Kiaxi</option>
                      <option value="Viana">Viana</option>
                      <option value="Cazenga">Cazenga</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bairro / Zona</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Ex: Benfica / Talatona Sul"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Disponibilidade: Dias e Horários */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">Dias de Disponibilidade</label>
                <div className="flex flex-wrap gap-1.5">
                  {daysList.map((d) => {
                    const isSelected = days.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                          isSelected
                            ? 'bg-[#143A7B] text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Hora de Início</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Hora de Término</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Preço e Contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Preço por Sessão (Kz) *
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ex: 5000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Telefone para Contacto
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+244 9..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showPhoneCheckbox"
                      checked={showPhone}
                      onChange={(e) => setShowPhone(e.target.checked)}
                      className="w-4 h-4 text-[#143A7B] rounded"
                    />
                    <label htmlFor="showPhoneCheckbox" className="text-[11px] text-slate-600">
                      Exibir telefone publicamente aos encarregados
                    </label>
                  </div>
                </div>
              </div>

              {/* Descrição e Observações */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descrição, Metodologia e Observações *
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o acompanhamento individual, metodologias pedagógicas, preparação para provas, etc."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSave('draft')}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Salvar Rascunho
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'A submeter...' : 'Submeter para Aprovação'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
