'use client';

import React, { useState, useEffect } from 'react';
import { TeacherListing, TeacherListingStatus } from '@/lib/types';
import {
  fetchAllTeacherListingsForAdmin,
  approveTeacherListing,
  rejectTeacherListing,
  suspendTeacherListing,
  deleteTeacherListing,
} from '@/lib/firebase-services';
import {
  Megaphone,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  Eye,
  Trash2,
  PauseCircle,
  X,
  Send,
  MapPin,
  Coins,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export default function AdminAnunciosPage() {
  const [listings, setListings] = useState<TeacherListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [rejectingListing, setRejectingListing] = useState<TeacherListing | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewingListing, setViewingListing] = useState<TeacherListing | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllTeacherListingsForAdmin();
      setListings(data);
    } catch (err) {
      console.warn('Erro ao carregar anúncios para admin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchAllTeacherListingsForAdmin()
      .then((data) => {
        if (isMounted) {
          setListings(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar anúncios para admin:', err);
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApprove = async (listingId: string) => {
    setIsProcessing(true);
    try {
      await approveTeacherListing(listingId);
      showToast('success', 'Anúncio aprovado e publicado com sucesso no Mural dos Pais!');
      loadData();
    } catch (err) {
      showToast('error', 'Erro ao aprovar anúncio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingListing) return;
    if (!rejectionReason.trim()) {
      alert('Por favor especifique o motivo da rejeição para orientar o professor.');
      return;
    }

    setIsProcessing(true);
    try {
      await rejectTeacherListing(rejectingListing.id, rejectionReason.trim());
      showToast('success', 'Anúncio rejeitado. O professor foi notificado com o motivo.');
      setRejectingListing(null);
      setRejectionReason('');
      loadData();
    } catch (err) {
      showToast('error', 'Erro ao rejeitar anúncio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = async (listingId: string) => {
    if (!confirm('Deseja suspender temporariamente a publicação deste anúncio no mural?')) return;
    setIsProcessing(true);
    try {
      await suspendTeacherListing(listingId, 'Suspenso temporariamente pela Direção');
      showToast('success', 'Anúncio suspenso.');
      loadData();
    } catch (err) {
      showToast('error', 'Erro ao suspender anúncio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Atenção: Deseja eliminar definitivamente este anúncio da base de dados?')) return;
    setIsProcessing(true);
    try {
      await deleteTeacherListing(listingId);
      showToast('success', 'Anúncio removido da base de dados.');
      loadData();
    } catch (err) {
      showToast('error', 'Erro ao eliminar anúncio.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered
  const filteredListings = listings.filter((l) => {
    if (activeTab !== 'all' && l.status !== activeTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.teacherName?.toLowerCase().includes(q) ||
        l.subjectId?.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countPending = listings.filter((l) => l.status === 'pending').length;
  const countApproved = listings.filter((l) => l.status === 'approved').length;
  const countRejected = listings.filter((l) => l.status === 'rejected').length;
  const countSuspended = listings.filter((l) => l.status === 'suspended').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold border animate-slide-down ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-[#0D1B3D] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-amber-300 border border-white/15 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Controlo e Moderação Institucional
            </span>
          </div>
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl tracking-tight text-white mb-1">
            Moderação de Anúncios e Aulas
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
            Valide e controle todas as ofertas de explicações domiciliares, reforço e aulas particulares
            cadastradas pelo corpo docente antes da publicação no mural dos encarregados.
          </p>
        </div>

        <button
          onClick={loadData}
          className="bg-[#143A7B] hover:bg-[#1a4b9e] text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase ${activeTab === 'pending' ? 'text-amber-100' : 'text-slate-400'}`}>
              Pendentes de Moderação
            </span>
            <Clock className={`w-4 h-4 ${activeTab === 'pending' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <p className={`text-2xl font-black mt-1 ${activeTab === 'pending' ? 'text-white' : 'text-amber-600'}`}>
            {countPending}
          </p>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'approved'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase ${activeTab === 'approved' ? 'text-emerald-100' : 'text-slate-400'}`}>
              Aprovados no Mural
            </span>
            <CheckCircle2 className={`w-4 h-4 ${activeTab === 'approved' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <p className={`text-2xl font-black mt-1 ${activeTab === 'approved' ? 'text-white' : 'text-emerald-700'}`}>
            {countApproved}
          </p>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'rejected'
              ? 'bg-rose-600 text-white border-rose-700 shadow-md'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase ${activeTab === 'rejected' ? 'text-rose-100' : 'text-slate-400'}`}>
              Rejeitados
            </span>
            <XCircle className={`w-4 h-4 ${activeTab === 'rejected' ? 'text-white' : 'text-rose-600'}`} />
          </div>
          <p className={`text-2xl font-black mt-1 ${activeTab === 'rejected' ? 'text-white' : 'text-rose-600'}`}>
            {countRejected}
          </p>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'all'
              ? 'bg-[#0D1B3D] text-white border-slate-900 shadow-md'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase ${activeTab === 'all' ? 'text-blue-200' : 'text-slate-400'}`}>
              Total Cadastrado
            </span>
            <Megaphone className={`w-4 h-4 ${activeTab === 'all' ? 'text-white' : 'text-[#143A7B]'}`} />
          </div>
          <p className={`text-2xl font-black mt-1 ${activeTab === 'all' ? 'text-white' : 'text-slate-800'}`}>
            {listings.length}
          </p>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'pending', label: `Pendentes (${countPending})` },
            { id: 'approved', label: `Aprovados (${countApproved})` },
            { id: 'rejected', label: `Rejeitados (${countRejected})` },
            { id: 'suspended', label: `Suspensos (${countSuspended})` },
            { id: 'all', label: 'Todos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#143A7B] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar docente, título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Listings Moderation List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#143A7B]" />
          <p className="text-xs">A sincronizar com a base de dados Firestore...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center space-y-3 border border-dashed border-slate-200">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Nenhum anúncio nesta categoria</h3>
          <p className="text-xs text-slate-500">
            {activeTab === 'pending'
              ? 'Todos os anúncios submetidos pelos docentes já foram moderados!'
              : 'Não existem registos correspondentes ao filtro atual.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredListings.map((listing) => {
            return (
              <div
                key={listing.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4 hover:border-blue-200 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Teacher Info & Listing details */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                      <img
                        src={
                          listing.teacherPhoto ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                        }
                        alt={listing.teacherName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-[#0D1B3D] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
                          {listing.subjectId || 'Geral'}
                        </span>
                        <span className="font-bold text-xs text-[#143A7B]">
                          {listing.teacherName || 'Docente'}
                        </span>
                        <span className="text-[11px] text-slate-400">•</span>
                        <span className="text-[11px] text-slate-500">
                          {listing.category === 'home_tutoring'
                            ? 'Explicação Domiciliar'
                            : listing.category === 'online'
                            ? 'Online'
                            : listing.category === 'exam_preparation'
                            ? 'Preparação para Exames'
                            : 'Reforço Escolar'}
                        </span>
                      </div>

                      <h3 className="font-['Poppins',sans-serif] font-bold text-base text-slate-900 leading-tight">
                        {listing.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2 max-w-2xl leading-relaxed">
                        {listing.description}
                      </p>

                      {/* Meta badges */}
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>
                            {listing.location?.district || listing.location?.municipality || 'Luanda'}
                          </span>
                        </span>

                        <span className="flex items-center gap-1 font-bold text-emerald-700">
                          <Coins className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {listing.price?.toLocaleString()} {listing.currency || 'Kz'} / sessão
                          </span>
                        </span>

                        {listing.targetClasses && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                            <span>{listing.targetClasses.join(', ')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status badge & Moderation action buttons */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div>
                      {listing.status === 'approved' && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Aprovado & Ativo</span>
                        </span>
                      )}
                      {listing.status === 'pending' && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pendente de Decisão</span>
                        </span>
                      )}
                      {listing.status === 'rejected' && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Rejeitado</span>
                        </span>
                      )}
                      {listing.status === 'suspended' && (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                          <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Publicação Suspensa</span>
                        </span>
                      )}
                      {listing.status === 'draft' && (
                        <span className="bg-zinc-100 text-zinc-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          Rascunho
                        </span>
                      )}
                    </div>

                    {/* Moderation Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingListing(listing)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Ver Ficha Completa"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {listing.status !== 'approved' && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleApprove(listing.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aprovar</span>
                        </button>
                      )}

                      {listing.status !== 'rejected' && (
                        <button
                          disabled={isProcessing}
                          onClick={() => {
                            setRejectingListing(listing);
                            setRejectionReason('');
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejeitar</span>
                        </button>
                      )}

                      {listing.status === 'approved' && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleSuspend(listing.id)}
                          className="p-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
                          title="Suspender Anúncio"
                        >
                          <PauseCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        disabled={isProcessing}
                        onClick={() => handleDelete(listing.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Eliminar Anúncio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Show rejection reason if rejected */}
                {listing.status === 'rejected' && listing.rejectionReason && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800">
                    <span className="font-bold">Motivo da Recusa Registado: </span>
                    <span className="font-medium">&ldquo;{listing.rejectionReason}&rdquo;</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* REJECTION REASON MODAL (Section 18 requirement) */}
      {rejectingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <h3 className="font-['Poppins',sans-serif] font-bold text-base text-white">
                  Rejeitar Anúncio de Explicação
                </h3>
              </div>
              <button
                onClick={() => setRejectingListing(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Está a rejeitar o anúncio{' '}
                <strong>&ldquo;{rejectingListing.title}&rdquo;</strong> do docente{' '}
                <strong>{rejectingListing.teacherName}</strong>.
              </p>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Motivo da Rejeição (Obrigatório) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Especifique com clareza o motivo para que o docente possa corrigir. Ex: Ajustar o valor conforme tabela do colégio; Definir com maior precisão os horários permitidos; etc."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  O professor visualizará esta justificação diretamente no seu painel para efetuar os devidos ajustes.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingListing(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isProcessing ? 'A registar...' : 'Confirmar Rejeição'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL DETAILS MODAL */}
      {viewingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
            <div className="bg-[#0D1B3D] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-['Poppins',sans-serif] font-bold text-base text-white">
                  Detalhes da Oferta Pedagógica
                </h3>
                <p className="text-xs text-blue-200">{viewingListing.teacherName}</p>
              </div>
              <button
                onClick={() => setViewingListing(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Título</span>
                <p className="font-bold text-sm text-slate-900">{viewingListing.title}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Descrição Completa</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100 mt-1">
                  {viewingListing.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Disciplina</span>
                  <span className="font-bold text-slate-900">{viewingListing.subjectId}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Preço</span>
                  <span className="font-bold text-emerald-700">
                    {viewingListing.price?.toLocaleString()} {viewingListing.currency || 'Kz'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Modalidade</span>
                  <span className="font-bold text-slate-900 capitalize">{viewingListing.modality}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Contacto</span>
                  <span className="font-bold text-slate-900">
                    {viewingListing.showPhone ? viewingListing.contactPhone || 'Sem número' : 'Chat Interno'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => setViewingListing(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
