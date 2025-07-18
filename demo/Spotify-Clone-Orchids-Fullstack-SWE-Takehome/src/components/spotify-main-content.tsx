"use client"

import { Play, User } from "lucide-react"
import { useState, useEffect } from "react"

interface Track {
  id: string
  title: string
  artist: string
  album: string
  albumArt: string
  duration: number
}

interface MusicCardProps {
  title: string
  artist: string
  image?: string
  size?: "small" | "medium" | "large"
  className?: string
  onPlay?: () => void
}

function MusicCard({ title, artist, image, size = "medium", className = "", onPlay }: MusicCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const sizeClasses = {
    small: "w-[180px] h-[180px]",
    medium: "w-full aspect-square",
    large: "w-full aspect-square"
  }

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPlay?.()
  }

  return (
    <div 
      className={`group cursor-pointer p-4 rounded-lg transition-all duration-300 hover:bg-[var(--color-interactive-hover)] border border-transparent hover:border-gray-600/50 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative ${sizeClasses[size]} mb-4`}>
        <div className="w-full h-full bg-[var(--color-muted)] rounded-lg flex items-center justify-center overflow-hidden">
          {image ? (
            <img 
              src={image} 
              alt={title}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-chart-1)] opacity-20 rounded-lg"></div>
          )}
        </div>
        
        {/* Play button overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div 
            onClick={handlePlayClick}
            className="w-12 h-12 bg-[var(--color-primary)] rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-110 cursor-pointer"
          >
            <Play className="w-5 h-5 text-black fill-black ml-1" />
          </div>
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="font-medium text-[var(--color-text-primary)] text-sm truncate">{title}</h3>
        <p className="text-[var(--color-text-secondary)] text-xs truncate">{artist}</p>
      </div>
    </div>
  )
}

interface SpotifyMainContentProps {
  onPlayTrack?: (track: Track) => void
}

export default function SpotifyMainContent({ onPlayTrack }: SpotifyMainContentProps) {
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([])
  const [madeForYou, setMadeForYou] = useState<Track[]>([])
  const [popularAlbums, setPopularAlbums] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Fetch recently played tracks
        const recentlyPlayedResponse = await fetch('/api/tracks/recently-played')
        if (!recentlyPlayedResponse.ok) {
          throw new Error('Failed to fetch recently played tracks')
        }
        const recentlyPlayedData = await recentlyPlayedResponse.json()
        setRecentlyPlayed(recentlyPlayedData)
        
        // Fetch made for you playlists
        const madeForYouResponse = await fetch('/api/playlists/made-for-you')
        if (!madeForYouResponse.ok) {
          throw new Error('Failed to fetch made for you playlists')
        }
        const madeForYouData = await madeForYouResponse.json()
        setMadeForYou(madeForYouData)
        
        // Fetch popular albums
        const popularAlbumsResponse = await fetch('/api/albums/popular')
        if (!popularAlbumsResponse.ok) {
          throw new Error('Failed to fetch popular albums')
        }
        const popularAlbumsData = await popularAlbumsResponse.json()
        setPopularAlbums(popularAlbumsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
        console.error('Error fetching data:', err)
        
        // Fallback to empty arrays if there's an error
        setRecentlyPlayed([])
        setMadeForYou([])
        setPopularAlbums([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const handlePlayTrack = (item: any) => {
    const track: Track = {
      id: item.id,
      title: item.title,
      artist: item.artist,
      album: item.album,
      albumArt: item.image || '/api/placeholder/56/56',
      duration: item.duration
    }
    onPlayTrack?.(track)
  }

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-[var(--color-muted)] rounded mb-6"></div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-shrink-0">
            <div className="w-[180px] h-[180px] bg-[var(--color-muted)] rounded-lg mb-4"></div>
            <div className="h-4 w-32 bg-[var(--color-muted)] rounded mb-2"></div>
            <div className="h-3 w-24 bg-[var(--color-muted)] rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )

  // Error message component
  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg my-4">
      <p>{message}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  )

  return (
    <div className="bg-[var(--color-background-primary)] text-[var(--color-text-primary)] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Good afternoon</h1>
        </div>
        <div className="w-8 h-8 bg-[var(--color-muted)] rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </div>
      </div>

      {/* Error display */}
      {error && <ErrorMessage message={error} />}

      {/* Recently Played */}
      <section className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Recently played</h2>
        </div>
        
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {recentlyPlayed.length > 0 ? (
              recentlyPlayed.map((item) => (
                <div key={item.id} className="flex-shrink-0">
                  <MusicCard 
                    title={item.title} 
                    artist={item.artist} 
                    image={item.albumArt}
                    size="small"
                    onPlay={() => handlePlayTrack(item)}
                  />
                </div>
              ))
            ) : (
              <div className="w-full text-center py-8 text-[var(--color-text-secondary)]">
                No recently played tracks found
              </div>
            )}
          </div>
        )}
      </section>

      {/* Made For You */}
      <section className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Made For You</h2>
          <button className="text-[var(--color-text-secondary)] text-sm font-medium hover:text-[var(--color-text-primary)] transition-colors">
            Show all
          </button>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="w-full aspect-square bg-[var(--color-muted)] rounded-lg mb-4"></div>
                <div className="h-4 w-32 bg-[var(--color-muted)] rounded mb-2"></div>
                <div className="h-3 w-24 bg-[var(--color-muted)] rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {madeForYou.length > 0 ? (
              madeForYou.map((item) => (
                <MusicCard 
                  key={item.id}
                  title={item.title} 
                  artist={item.artist}
                  image={item.albumArt}
                  size="medium"
                  onPlay={() => handlePlayTrack(item)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-[var(--color-text-secondary)]">
                No personalized playlists found
              </div>
            )}
          </div>
        )}
      </section>

      {/* Popular Albums */}
      <section className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Popular albums</h2>
          <button className="text-[var(--color-text-secondary)] text-sm font-medium hover:text-[var(--color-text-primary)] transition-colors">
            Show all
          </button>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="w-full aspect-square bg-[var(--color-muted)] rounded-lg mb-4"></div>
                <div className="h-4 w-32 bg-[var(--color-muted)] rounded mb-2"></div>
                <div className="h-3 w-24 bg-[var(--color-muted)] rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {popularAlbums.length > 0 ? (
              popularAlbums.map((item) => (
                <MusicCard 
                  key={item.id}
                  title={item.title} 
                  artist={item.artist}
                  image={item.albumArt}
                  size="medium"
                  onPlay={() => handlePlayTrack(item)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-[var(--color-text-secondary)]">
                No popular albums found
              </div>
            )}
          </div>
        )}
      </section>

      <style jsx>{`
        .scrollbar-hide {
          /* Hide scrollbar for Chrome, Safari and Opera */
          -webkit-scrollbar: hidden;
        }
        
        .scrollbar-hide {
          /* Hide scrollbar for IE, Edge and Firefox */
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}