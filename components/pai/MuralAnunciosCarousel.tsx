'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { TeacherListing } from '@/lib/types';
import { fetchApprovedTeacherListings } from '@/lib/firebase-services';
import { ContactarProfessorModal } from './ContactarProfessorModal';
import {
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Coins,
  Filter,
  Search,
  MessageSquare,
  Phone,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Home,
  Monitor,
  School,
  ArrowUpRight,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export const MuralAnunciosCarousel: React.FC = () => {
  const [listings, setListings] = useState<TeacherListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedModality, setSelectedModality] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected listing for contact modal & details modal
  const [contactListing, setContactListing] = useState<TeacherListing | null>(null);
  const [detailListing, setDetailListing] = useState<TeacherListing | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchApprovedTeacherListings();
      setListings(data);
    } catch (err) {
      console.warn('Erro ao carregar anúncios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchApprovedTeacherListings()
      .then((data) => {
        if (isMounted) {
          setListings(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar anúncios:', err);
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered Listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      // Query search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.teacherName?.toLowerCase().includes(q) ||
          item.subjectId?.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Subject
      if (selectedSubject !== 'all' && item.subjectId !== selectedSubject) {
        return false;
      }

      // Class
      if (selectedClass !== 'all') {
        const matchesClass = item.targetClasses?.some((c) =>
          c.toLowerCase().includes(selectedClass.toLowerCase())
        );
        if (!matchesClass) return false;
      }

      // Modality
      if (selectedModality !== 'all' && item.modality !== selectedModality) {
        return false;
      }

      // Municipality
      if (selectedMunicipality !== 'all') {
        const mun = item.location?.municipality?.toLowerCase() || '';
        if (!mun.includes(selectedMunicipality.toLowerCase())) {
          return false;
        }
      }

      // Price Range
      if (priceRange !== 'all' && item.price) {
        if (priceRange === 'under_4500' && item.price > 4500) return false;
        if (priceRange === '4500_5500' && (item.price < 4500 || item.price > 5500)) return false;
        if (priceRange === 'over_5500' && item.price < 5500) return false;
      }

      return true;
    });
  }, [
    listings,
    searchQuery,
    selectedSubject,
    selectedClass,
    selectedModality,
    selectedMunicipality,
    priceRange,
  ]);

  const safeCurrentIndex =
    filteredListings.length > 0
      ? currentIndex % filteredListings.length
      : 0;

  const handleNext = () => {
    if (filteredListings.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % filteredListings.length);
  };

  const handlePrev = () => {
    if (filteredListings.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + filteredListings.length) % filteredListings.length);
  };

  const activeFiltersCount = [
    selectedSubject !== 'all',
    selectedClass !== 'all',
    selectedModality !== 'all',
    selectedMunicipality !== 'all',
    priceRange !== 'all',
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedSubject('all');
    setSelectedClass('all');
    setSelectedModality('all');
    setSelectedMunicipality('all');
    setPriceRange('all');
    setSearchQuery('');
  };

  // Modality helpers
  const getModalityLabel = (mod: string) => {
    switch (mod) {
      case 'home':
        return { label: 'Domiciliar', icon: Home, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'online':
        return { label: 'Online', icon: Monitor, bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'school':
        return { label: 'Na Escola', icon: School, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      default:
        return { label: 'Outro Local', icon: MapPin, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Mural Autorizado
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Verificado pelo Colégio</span>
          </div>
          <h2 className="font-['Poppins',sans-serif] font-bold text-lg text-[#0D1B3D] leading-tight">
            Aulas e Explicações
          </h2>
          <p className="text-xs text-slate-500">
            Apoio escolar, reforço individual e preparação com professores da instituição
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showFilters || activeFiltersCount > 0
                ? 'bg-[#143A7B] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('carousel')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'carousel'
                  ? 'bg-white text-[#143A7B] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Destaques
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-[#143A7B] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos ({filteredListings.length})
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      {showFilters && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 animate-fade-in text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-bold text-slate-800">Filtrar Explicações e Aulas:</span>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 text-[11px]"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Search query */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Pesquisar por texto</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: Carlos, Matemática, teste..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Disciplina */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Disciplina</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="all">Todas as disciplinas</option>
                <option value="Matemática">Matemática</option>
                <option value="Língua Portuguesa">Língua Portuguesa</option>
                <option value="Física">Física</option>
                <option value="Química">Química</option>
                <option value="Biologia">Biologia</option>
                <option value="Estudo do Meio">Estudo do Meio</option>
                <option value="Inglês">Inglês</option>
              </select>
            </div>

            {/* Classe */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Classe do Aluno</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="all">Todas as classes</option>
                <option value="1ª">1ª Classe (Primário)</option>
                <option value="2ª">2ª Classe (Primário)</option>
                <option value="3ª">3ª Classe (Primário)</option>
                <option value="4ª">4ª Classe (Primário)</option>
                <option value="5ª">5ª Classe</option>
                <option value="6ª">6ª Classe</option>
                <option value="7ª">7ª Classe</option>
                <option value="8ª">8ª Classe</option>
                <option value="9ª">9ª Classe</option>
                <option value="10ª">10ª Classe</option>
                <option value="11ª">11ª Classe</option>
                <option value="12ª">12ª Classe</option>
              </select>
            </div>

            {/* Modalidade */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Modalidade</label>
              <select
                value={selectedModality}
                onChange={(e) => setSelectedModality(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="all">Todas as modalidades</option>
                <option value="home">Domiciliar (em casa)</option>
                <option value="online">Online (remoto)</option>
                <option value="school">Na escola / colégio</option>
                <option value="other">Outro local</option>
              </select>
            </div>

            {/* Localização */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Localização (Município)</label>
              <select
                value={selectedMunicipality}
                onChange={(e) => setSelectedMunicipality(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="all">Todos os municípios</option>
                <option value="Talatona">Talatona / Benfica</option>
                <option value="Luanda">Luanda (Maianga, Alvalade, Ingombota)</option>
                <option value="Belas">Belas / Kilamba</option>
                <option value="Kilamba Kiaxi">Kilamba Kiaxi / Camama</option>
                <option value="Viana">Viana</option>
              </select>
            </div>

            {/* Faixa de Preço */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Faixa de Preço (por sessão)</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="all">Qualquer valor</option>
                <option value="under_4500">Até 4.500 Kz</option>
                <option value="4500_5500">4.500 Kz a 5.500 Kz</option>
                <option value="over_5500">Acima de 5.500 Kz</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#143A7B]" />
          <p className="text-xs">A carregar anúncios autorizados do Firebase...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-8 text-center space-y-3 border border-dashed border-slate-200">
          <GraduationCap className="w-10 h-10 mx-auto text-slate-400" />
          <h4 className="font-bold text-sm text-slate-800">
            {listings.length === 0
              ? 'Nenhum professor anunciou aulas ou explicações neste momento.'
              : 'Nenhum anúncio encontrado'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {listings.length === 0
              ? 'Logo que a Direção autorize novas publicações docentes, elas serão exibidas aqui.'
              : 'Não foram localizadas aulas que correspondam aos filtros selecionados. Tente alargar a pesquisa.'}
          </p>
          {listings.length > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-[#143A7B] hover:underline cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      ) : viewMode === 'carousel' ? (
        /* CAROUSEL / SLIDER VIEW */
        <div className="space-y-3">
          {/* Card Presentation */}
          {(() => {
            const current = filteredListings[safeCurrentIndex];
            if (!current) return null;
            const modalityInfo = getModalityLabel(current.modality);
            const ModalityIcon = modalityInfo.icon;

            return (
              <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/40 rounded-3xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Photo & Badge */}
                  <div className="relative shrink-0 flex items-center md:block">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-200">
                      <img
                        src={
                          current.teacherPhoto ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                        }
                        alt={current.teacherName || 'Professor'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="hidden md:flex absolute -bottom-2 -right-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white shadow-xs items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Docente
                    </span>
                  </div>

                  {/* Main Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header line: Subject + Modality + Price */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-[#0D1B3D] text-white text-xs font-bold px-3 py-1 rounded-xl shadow-xs">
                          {current.subjectId || 'Geral'}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${modalityInfo.bg}`}
                        >
                          <ModalityIcon className="w-3 h-3" />
                          <span>{modalityInfo.label}</span>
                        </span>
                      </div>

                      {/* Price Badge */}
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-xs">
                        <Coins className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {current.price?.toLocaleString()} {current.currency || 'Kz'}
                        </span>
                        <span className="text-[10px] font-normal text-emerald-700">/ sessão</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-['Poppins',sans-serif] font-bold text-base text-slate-900 leading-tight">
                      {current.title}
                    </h3>

                    {/* Teacher name */}
                    <p className="text-xs font-semibold text-[#143A7B]">
                      {current.teacherName || 'Professor do Colégio'}
                    </p>

                    {/* Classes */}
                    {current.targetClasses && current.targetClasses.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-700">Classes:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {current.targetClasses.map((cls, i) => (
                            <span
                              key={i}
                              className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-medium"
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description excerpt */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {current.description}
                    </p>

                    {/* Location & Availability (Privacy safe: only municipality & district) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5 bg-white/80 p-2 rounded-xl border border-slate-100">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">
                          {current.location?.district || current.location?.municipality || 'Luanda'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-white/80 p-2 rounded-xl border border-slate-100">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">
                          {current.availability?.days?.join(', ') || 'Segunda a Sexta'}
                          {current.availability?.startTime ? ` (${current.availability.startTime} - ${current.availability.endTime})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setDetailListing(current)}
                    className="text-xs font-semibold text-slate-600 hover:text-[#143A7B] flex items-center gap-1"
                  >
                    <span>Ver Detalhes Completos</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {current.showPhone && current.contactPhone && (
                      <a
                        href={`tel:${current.contactPhone.replace(/\s+/g, '')}`}
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        title="Ligar diretamente"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      onClick={() => setContactListing(current)}
                      className="bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Contactar Professor</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Carousel Pagination & Arrows */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              {filteredListings.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    safeCurrentIndex === idx ? 'w-6 bg-[#143A7B]' : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">
                {safeCurrentIndex + 1} de {filteredListings.length}
              </span>
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Seguinte"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* GRID / DIRECTORY VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredListings.map((listing) => {
            const modalityInfo = getModalityLabel(listing.modality);
            const ModalityIcon = modalityInfo.icon;

            return (
              <div
                key={listing.id}
                className="bg-white hover:bg-slate-50/70 rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                      <img
                        src={
                          listing.teacherPhoto ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                        }
                        alt={listing.teacherName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="bg-[#0D1B3D] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                          {listing.subjectId || 'Geral'}
                        </span>
                        <span className="font-bold text-xs text-[#143A7B]">
                          {listing.price?.toLocaleString()} {listing.currency || 'Kz'}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 truncate leading-snug">
                        {listing.title}
                      </h4>
                      <p className="text-[11px] text-[#143A7B] font-medium">{listing.teacherName}</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {listing.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${modalityInfo.bg}`}
                    >
                      <ModalityIcon className="w-3 h-3" />
                      <span>{modalityInfo.label}</span>
                    </span>
                    <span className="truncate max-w-[130px]">
                      {listing.location?.district || listing.location?.municipality || 'Luanda'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDetailListing(listing)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Detalhes
                  </button>
                  <button
                    onClick={() => setContactListing(listing)}
                    className="bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Contactar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
            <div className="bg-[#0D1B3D] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/20">
                  <img
                    src={detailListing.teacherPhoto}
                    alt={detailListing.teacherName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-['Poppins',sans-serif] font-bold text-base text-white">
                    {detailListing.title}
                  </h3>
                  <p className="text-xs text-blue-200">{detailListing.teacherName}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailListing(null)}
                className="p-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Preço por Sessão</span>
                  <p className="font-bold text-base text-emerald-700">
                    {detailListing.price?.toLocaleString()} {detailListing.currency || 'Kz'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Disciplina</span>
                  <p className="font-bold text-slate-800">{detailListing.subjectId}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Modalidade</span>
                  <p className="font-bold text-slate-800 capitalize">
                    {getModalityLabel(detailListing.modality).label}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">Descrição e Metodologia</h4>
                <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                  {detailListing.description}
                </p>
              </div>

              {detailListing.targetClasses && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Classes Atendidas</h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {detailListing.targetClasses.map((c, i) => (
                      <span
                        key={i}
                        className="bg-blue-50 text-[#143A7B] font-semibold px-2.5 py-1 rounded-xl border border-blue-100"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-1 text-slate-400 mb-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>Área de Cobertura</span>
                  </div>
                  <p className="font-bold text-slate-800">
                    {detailListing.location?.municipality || 'Luanda'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {detailListing.location?.district || detailListing.location?.description}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-1 text-slate-400 mb-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Horários & Dias</span>
                  </div>
                  <p className="font-bold text-slate-800">
                    {detailListing.availability?.days?.join(', ') || 'Sob consulta'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {detailListing.availability?.startTime} - {detailListing.availability?.endTime}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDetailListing(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    const l = detailListing;
                    setDetailListing(null);
                    setContactListing(l);
                  }}
                  className="bg-[#143A7B] hover:bg-[#0D1B3D] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Contactar Professor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTACT MODAL */}
      <ContactarProfessorModal
        listing={contactListing}
        onClose={() => setContactListing(null)}
      />
    </section>
  );
};
