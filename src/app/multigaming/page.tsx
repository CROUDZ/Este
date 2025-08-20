"use client";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Eye, 
  Calendar, 
  ExternalLink, 
  Grid3X3, 
  List,
  Search,
  Filter,
  ArrowUpRight,
  Gamepad2,
  Users,
  Trophy
} from "lucide-react";
import { youtubeService, YouTubeData } from "@/services/youtubeService";
import { GlassCard } from "@/components/shared/GlassCard";
import BackgroundElements from "@/components/shared/BackgroundElements";

// Import the PlaylistVideo interface from the service
interface PlaylistVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  publishedAt: string;
  channelTitle: string;
  position: number;
  viewCount?: string | null;
  duration?: string | null;
  likeCount?: string | null;
}

const MultiGamingPage = () => {
  const [data, setData] = useState<YouTubeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'title'>('recent');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await youtubeService.getData();
        setData(result);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort videos
  const filteredAndSortedVideos = useMemo(() => {
    if (!data?.playlistVideos) return [];
    
    const filtered = data.playlistVideos.filter(video =>
      video.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (sortBy) {
      case 'popular':
        return filtered.sort((a, b) => 
          parseInt(b.viewCount || '0') - parseInt(a.viewCount || '0')
        );
      case 'title':
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      case 'recent':
      default:
        return filtered.sort((a, b) => 
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
    }
  }, [data?.playlistVideos, searchTerm, sortBy]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatViews = (views: string | null | undefined) => {
    if (!views) return 'N/A';
    const num = parseInt(views);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const openVideoInNewTab = (videoId: string) => {
    if (!videoId) {
      console.error('Video ID is missing');
      return;
    }
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    console.log('Opening video:', url);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 relative overflow-hidden">
        <BackgroundElements />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <GlassCard className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-300 text-lg">Chargement des vidéos gaming...</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 relative overflow-hidden">
      <BackgroundElements />
      
      {/* Header Section */}
      <div className="relative z-10 pt-24 pb-16">
        <div className="container mx-auto px-6">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="section-header-icons justify-center">
              <div className="icon-circle-primary">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div className="icon-divider"></div>
              <div className="icon-circle-secondary">
                <Trophy className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <h1 className="section-title gradient-text-primary md:text-7xl sm:text-5xl text-4xl">
              MultiGaming
            </h1>
            <p className="section-subtitle">
              Découvrez toutes mes vidéos MultiGaming avec des parties épiques,
              des collaborations et des moments de pure adrénaline !
            </p>
            
            {/* Stats Row */}
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              <div className="flex items-center gap-2 text-slate-300">
                <Play className="w-5 h-5 text-purple-400" />
                <span className="font-semibold">{data?.playlistVideos?.length || 0}</span>
                <span>Vidéos</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold">Multi</span>
                <span>Gaming</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Eye className="w-5 h-5 text-pink-400" />
                <span className="font-semibold">
                  {formatViews(
                    data?.playlistVideos?.reduce((sum, video) => 
                      sum + parseInt(video.viewCount || '0'), 0
                    ).toString()
                  )}
                </span>
                <span>Vues totales</span>
              </div>
            </div>
          </m.div>

          {/* Latest MultiGaming Video Highlight */}
          {data?.playlistVideos && data.playlistVideos.length > 0 && (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-16"
            >
              <GlassCard className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <h2 className="text-2xl font-bold text-white">Dernière vidéo MultiGaming</h2>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div 
                    className="relative group cursor-pointer"
                    onClick={() => openVideoInNewTab(data.playlistVideos[0].id)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl blur opacity-5 group-hover:opacity-15 transition-opacity duration-300"></div>
                    <div className="relative">
                      <Image
                        src={data.playlistVideos[0].thumbnail || "/default-thumbnail.jpg"}
                        alt={data.playlistVideos[0].title}
                        width={600}
                        height={337}
                        className="w-full rounded-xl"
                      />
                      <div className="absolute inset-0 bg-black/10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-16 h-16 bg-white/5 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white leading-tight">
                      {data.playlistVideos[0].title}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-purple-400" />
                        <span>{formatViews(data.playlistVideos[0].viewCount)} vues</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span>{formatDate(data.playlistVideos[0].publishedAt)}</span>
                      </div>
                    </div>
                    <button 
                      className="cta-button-primary group"
                      onClick={() => openVideoInNewTab(data.playlistVideos[0].id)}
                    >
                      <span>Regarder maintenant</span>
                      <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            </m.div>
          )}

          {/* Controls Section */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8"
          >
            <GlassCard className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une vidéo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  />
                </div>

                {/* Filters and View Toggle */}
                <div className="flex gap-3 items-center">
                  {/* Sort Filter */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular' | 'title')}
                      className="appearance-none bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="recent">Plus récentes</option>
                      <option value="popular">Plus populaires</option>
                      <option value="title">Par titre</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex bg-slate-800/50 rounded-xl p-1 border border-slate-600/50">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        viewMode === 'grid'
                          ? 'bg-purple-500 text-white shadow-lg'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Grid3X3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        viewMode === 'list'
                          ? 'bg-purple-500 text-white shadow-lg'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Results count */}
              <div className="mt-4 pt-4 border-t border-slate-600/30">
                <p className="text-slate-300 text-sm">
                  {filteredAndSortedVideos.length} vidéo{filteredAndSortedVideos.length > 1 ? 's' : ''} trouvée{filteredAndSortedVideos.length > 1 ? 's' : ''}
                  {searchTerm && (
                    <span className="text-purple-400 ml-1">
                      pour "{searchTerm}"
                    </span>
                  )}
                </p>
              </div>
            </GlassCard>
          </m.div>

          {/* Videos Grid/List */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? (
                <m.div
                  key="grid"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {filteredAndSortedVideos.map((video: PlaylistVideo, index) => (
                    <m.div
                      key={video.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <GlassCard 
                        hoverable 
                        className="group cursor-pointer h-full"
                        onClick={() => openVideoInNewTab(video.id)}
                      >
                        <div className="relative mb-4">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                          <div className="relative">
                            <Image
                              src={video.thumbnail || "/default-thumbnail.jpg"}
                              alt={video.title}
                              width={320}
                              height={180}
                              className="w-full rounded-xl"
                            />
                            <div className="absolute inset-0 bg-black/10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-12 h-12 bg-white/5 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <Play className="w-6 h-6 text-white ml-1" />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 group-hover:text-purple-300 transition-colors duration-300">
                            {video.title}
                          </h3>
                          
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>{formatViews(video.viewCount)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(video.publishedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </m.div>
                  ))}
                </m.div>
              ) : (
                <m.div
                  key="list"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {filteredAndSortedVideos.map((video: PlaylistVideo, index) => (
                    <m.div
                      key={video.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <GlassCard 
                        hoverable 
                        className="group cursor-pointer"
                        onClick={() => openVideoInNewTab(video.id)}
                      >
                        <div className="flex gap-4 items-start">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                            <div className="relative">
                              <Image
                                src={video.thumbnail || "/default-thumbnail.jpg"}
                                alt={video.title}
                                width={200}
                                height={112}
                                className="rounded-xl"
                              />
                              <div className="absolute inset-0 bg-black/10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="w-10 h-10 bg-white/5 backdrop-blur-sm rounded-full flex items-center justify-center">
                                  <Play className="w-5 h-5 text-white ml-1" />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <h3 className="font-semibold text-white leading-tight group-hover:text-purple-300 transition-colors duration-300">
                              {video.title}
                            </h3>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                              <div className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                <span>{formatViews(video.viewCount)} vues</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(video.publishedAt)}</span>
                              </div>
                            </div>
                            
                            <p className="text-slate-300 text-sm line-clamp-2">
                              {video.description || "Aucune description disponible"}
                            </p>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors duration-300" />
                          </div>
                        </div>
                      </GlassCard>
                    </m.div>
                  ))}
                </m.div>
              )}
            </AnimatePresence>
          </m.div>

          {/* Empty State */}
          {filteredAndSortedVideos.length === 0 && (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-center py-16"
            >
              <GlassCard className="max-w-md mx-auto text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Aucune vidéo trouvée
                </h3>
                <p className="text-slate-400 mb-4">
                  Essayez de modifier vos critères de recherche
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSortBy('recent');
                  }}
                  className="text-purple-400 hover:text-purple-300 transition-colors duration-300"
                >
                  Réinitialiser les filtres
                </button>
              </GlassCard>
            </m.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiGamingPage;
