"use client";
import React, { useState, useEffect } from 'react';

type PlaylistVideo = {
  id: string;
  title: string;
  thumbnail: string | null; // Allow null for thumbnail
  viewCount: number | null | undefined; // Allow null or undefined for viewCount
};
import Image from 'next/image';
import { youtubeService, YouTubeData } from '@/services/youtubeService'; // Ajustez le chemin selon votre structure

const SimpleYouTubePage = () => {
  const [data, setData] = useState<YouTubeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await youtubeService.getData();
        setData(result);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Ma Chaîne YouTube</h1>

      {/* Dernière vidéo */}
      {data?.videoData && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Dernière vidéo</h2>
          <div className="border rounded-lg p-4">
            <Image 
              src={data.videoData.thumbnail || '/default-thumbnail.jpg'} 
              alt={data.videoData.title}
              width={320}
              height={180}
              className="w-full max-w-md mx-auto mb-4"
            />
            <h3 className="font-semibold">{data.videoData.title}</h3>
            <p className="text-gray-600 text-sm mt-2">
              {data.videoData.viewCount} vues
            </p>
          </div>
        </div>
      )}

      {/* Vidéos de la playlist */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Toutes les vidéos ({data?.playlistVideos?.length || 0})
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.playlistVideos?.map((video: PlaylistVideo) => (
            <div key={video.id} className="border rounded-lg p-4">
              <Image 
                src={video.thumbnail || '/default-thumbnail.jpg'} // Handle null case
                alt={video.title}
                width={320}
                height={180}
                className="w-full mb-3 rounded"
              />
              <h3 className="font-medium text-sm mb-2 line-clamp-2">
                {video.title}
              </h3>
              <p className="text-xs text-gray-500">
                {video.viewCount ?? 'N/A'} vues {/* Handle null or undefined */}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleYouTubePage;