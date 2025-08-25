// netlify/functions/youtube.js

// Cache simple en mémoire (sera réinitialisé à chaque déploiement)
let cache = {
  data: null,
  timestamp: 0,
  duration: 5 * 60 * 1000, // 5 minutes
  errorTimestamp: 0,
  quotaExceeded: false,
};

// Helper CORS — on peut restreindre en lisant ALLOWED_ORIGINS env var si souhaité
function buildCorsHeaders(origin) {
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || "http://localhost:3000"
  ).split(",");
  const allowOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

exports.handler = async function (event) {
  const origin = (event && event.headers && event.headers.origin) || "";
  const corsHeaders = buildCorsHeaders(origin);

  // Répondre aux préflight OPTIONS rapidement
  if (event && event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "", // pas de body pour OPTIONS
    };
  }

  const API_KEY = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const playlistId = process.env.YOUTUBE_PLAYLIST_ID;

  console.log("start youtube function");

  const now = Date.now();

  // Si quota dépassé récemment, retourner données par défaut pendant 24h
  if (cache.quotaExceeded && now - cache.errorTimestamp < 24 * 60 * 60 * 1000) {
    console.log("Quota exceeded recently, returning default data");
    const fallbackData = {
      videoData: null,
      liveData: { isLive: false, url: false },
      playlistVideos: [],
      channelData: { subscriberCount: null },
    };
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=3600",
      },
      body: JSON.stringify(fallbackData),
    };
  }

  // Vérifier le cache d'abord
  if (cache.data && now - cache.timestamp < cache.duration) {
    console.log("Returning cached data");
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=300",
      },
      body: JSON.stringify(cache.data),
    };
  }

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "API key manquante" }),
    };
  }

  try {
    const requests = [];

    // Requête pour la dernière vidéo si channelId fourni
    if (channelId) {
      const latestVideoUrl = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${channelId}&part=snippet&order=date&maxResults=1&type=video`;
      requests.push(fetch(latestVideoUrl));
    } else {
      requests.push(Promise.resolve(null));
    }

    // Requête pour vérifier le live si channelId fourni
    if (channelId) {
      const liveCheckUrl = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${channelId}&part=snippet&eventType=live&type=video&maxResults=1`;
      requests.push(fetch(liveCheckUrl));
    } else {
      requests.push(Promise.resolve(null));
    }

    console.log("Fetching data...");
    const [searchRes, liveRes] = await Promise.all(requests);

    // Si searchRes existe et est en erreur
    if (searchRes && !searchRes.ok) {
      const errorBody = await searchRes.text().catch(() => "");
      console.error(
        "Erreur lors de la récupération des vidéos (latest):",
        searchRes.status,
        errorBody,
      );

      if (searchRes.status === 403) {
        console.error("QUOTA EXCEEDED - Setting 24h cache");
        const fallbackData = {
          videoData: null,
          liveData: { isLive: false, url: false },
          playlistVideos: [],
          channelData: { subscriberCount: null },
        };

        cache.quotaExceeded = true;
        cache.errorTimestamp = now;
        cache.data = fallbackData;
        cache.timestamp = now;

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            "Cache-Control": "public, max-age=86400",
          },
          body: JSON.stringify(fallbackData),
        };
      }

      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Erreur lors de la récupération des vidéos (latest)",
          status: searchRes.status,
          body: errorBody,
        }),
      };
    }

    // Traitement des données de base
    let videoData = null;
    let liveData = { isLive: false, url: false };
    let subscriberCount = null;
    let videoCount = null;

    if (searchRes && searchRes.ok) {
      const searchData = await searchRes.json().catch(() => null);

      if (searchData && searchData.items && searchData.items.length > 0) {
        const video = searchData.items[0];
        const videoId = video.id?.videoId;

        if (videoId) {
          // Récupérer les statistiques
          try {
            const statsRes = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${videoId}&part=statistics,contentDetails`,
            );

            let stats = null;
            if (statsRes.ok) {
              const statsData = await statsRes.json();
              stats = statsData.items?.[0];
            } else if (statsRes.status === 403) {
              // Quota hit sur la requête de stats
              cache.quotaExceeded = true;
              cache.errorTimestamp = now;
              console.warn("Quota exceeded when fetching video stats");
            }

            videoData = {
              id: videoId,
              title: video.snippet?.title ?? null,
              description: video.snippet?.description ?? "",
              thumbnail:
                video.snippet?.thumbnails?.maxres?.url ||
                video.snippet?.thumbnails?.high?.url ||
                video.snippet?.thumbnails?.default?.url ||
                null,
              publishedAt: video.snippet?.publishedAt ?? null,
              viewCount: stats?.statistics?.viewCount ?? null,
              duration: stats?.contentDetails?.duration ?? null,
              likeCount: stats?.statistics?.likeCount ?? null,
            };
          } catch (e) {
            console.warn(
              "Erreur lors de la récupération des stats:",
              e.message,
            );
          }
        }
      }
    }

    // Traitement du live
    if (liveRes) {
      if (!liveRes.ok) {
        const txt = await liveRes.text().catch(() => "");
        console.warn("Live check non-ok:", liveRes.status, txt);
        if (liveRes.status === 403) {
          cache.quotaExceeded = true;
          cache.errorTimestamp = now;
        }
      } else {
        const liveDataRaw = await liveRes.json().catch(() => null);
        if (liveDataRaw && liveDataRaw.items && liveDataRaw.items.length > 0) {
          const liveVideo = liveDataRaw.items[0];
          const liveVideoId = liveVideo.id?.videoId;
          if (liveVideoId) {
            liveData = {
              isLive: true,
              url: `https://www.youtube.com/watch?v=${liveVideoId}`,
            };
          }
        }
      }
    }

    // Récupérer le nombre d'abonnés et le videoCount si channelId fourni
    if (channelId) {
      try {
        const channelRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?key=${API_KEY}&id=${channelId}&part=statistics`,
        );

        if (channelRes.ok) {
          const channelJson = await channelRes.json().catch(() => null);
          const channelStats = channelJson?.items?.[0]?.statistics;
          subscriberCount = channelStats?.subscriberCount ?? null;

          // videoCount est fourni par l'API dans statistics.videoCount
          const rawVideoCount = channelStats?.videoCount ?? null;
          videoCount =
            rawVideoCount != null ? parseInt(rawVideoCount, 10) : null;
        } else if (channelRes.status === 403) {
          cache.quotaExceeded = true;
          cache.errorTimestamp = now;
          console.warn("Quota exceeded when fetching channel statistics");
        } else {
          console.warn("Channel stats fetch non-ok:", channelRes.status);
        }
      } catch (e) {
        console.warn(
          "Erreur lors de la récupération des abonnés/videoCount :",
          e.message,
        );
      }
    }

    // Récupérer toutes les vidéos de la playlist
    let playlistVideos = [];
    if (playlistId) {
      try {
        console.log("Fetching playlist videos...");
        playlistVideos = await fetchAllPlaylistVideos(API_KEY, playlistId);
        console.log(`Retrieved ${playlistVideos.length} videos from playlist`);
      } catch (e) {
        console.warn(
          "Erreur lors de la récupération de la playlist :",
          e.message,
        );
        if ((e.message || "").includes("403")) {
          cache.quotaExceeded = true;
          cache.errorTimestamp = now;
          console.log("Quota dépassé pour la playlist, on continue sans");
        }
      }
    }

    const responsePayload = {
      videoData,
      liveData,
      channelData: {
        subscriberCount,
        videoCount,
      },
      playlistVideos,
    };

    // Mettre en cache la réponse et reset quota exceeded si pas de problème
    cache.data = responsePayload;
    cache.timestamp = now;

    if (!cache.quotaExceeded) {
      // if previously flagged but now good, reset flag
      cache.quotaExceeded = false;
    }

    console.log(
      "Response payload prepared with",
      playlistVideos.length,
      "playlist videos",
    );

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=300",
      },
      body: JSON.stringify(responsePayload),
    };
  } catch (err) {
    console.error(err);
    // Si erreur inattendue, on renvoie aussi les headers CORS
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Erreur lors du chargement des données YouTube",
        details: err && err.message ? err.message : String(err),
      }),
    };
  }
};

// Fonction pour récupérer toutes les vidéos d'une playlist avec pagination
async function fetchAllPlaylistVideos(apiKey, playlistId, maxResults = 50) {
  let allVideos = [];
  let nextPageToken = "";
  let requestCount = 0;
  const maxRequests = 10; // Limite pour éviter les boucles infinies

  try {
    do {
      requestCount++;
      if (requestCount > maxRequests) {
        console.warn(
          `Limite de ${maxRequests} requêtes atteinte pour la playlist`,
        );
        break;
      }

      const url = `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${playlistId}&part=snippet,contentDetails&maxResults=${maxResults}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;

      console.log(`Fetching playlist page ${requestCount}...`);
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("403 - Quota exceeded");
        }
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();

      if (data.items) {
        // Récupérer les IDs des vidéos pour obtenir les statistiques
        const videoIds = data.items
          .map((item) => item.contentDetails?.videoId)
          .filter(Boolean);

        // Récupérer les statistiques en batch
        let videoStats = {};
        if (videoIds.length > 0) {
          try {
            const statsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}&id=${videoIds.join(",")}&part=statistics,contentDetails`;
            const statsResponse = await fetch(statsUrl);

            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              if (statsData.items) {
                statsData.items.forEach((item) => {
                  videoStats[item.id] = item;
                });
              }
            } else if (statsResponse.status === 403) {
              console.warn("Quota exceeded when fetching playlist video stats");
            }
          } catch (e) {
            console.warn(
              "Erreur lors de la récupération des stats:",
              e.message,
            );
          }
        }

        // Traiter les vidéos
        const videos = data.items
          .map((item) => {
            const videoId = item.contentDetails?.videoId;
            const stats = videoStats[videoId];

            return {
              id: videoId,
              title: item.snippet?.title || "Titre non disponible",
              description: item.snippet?.description || "",
              thumbnail:
                item.snippet?.thumbnails?.maxres?.url ||
                item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                item.snippet?.thumbnails?.default?.url ||
                null,
              publishedAt:
                item.snippet?.publishedAt ||
                item.contentDetails?.videoPublishedAt,
              channelTitle: item.snippet?.channelTitle || "",
              position: item.snippet?.position || allVideos.length,
              viewCount: stats?.statistics?.viewCount ?? null,
              duration: stats?.contentDetails?.duration ?? null,
              likeCount: stats?.statistics?.likeCount ?? null,
            };
          })
          .filter((video) => video.id); // Filtrer les vidéos sans ID (vidéos supprimées/privées)

        allVideos.push(...videos);
      }

      nextPageToken = data.nextPageToken || "";

      // Petite pause pour éviter de surcharger l'API
      if (nextPageToken && requestCount < maxRequests) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } while (nextPageToken && requestCount < maxRequests);
  } catch (error) {
    console.error("Erreur lors de la récupération de la playlist:", error);
    throw error;
  }

  return allVideos;
}
