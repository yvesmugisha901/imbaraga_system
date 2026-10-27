import { useState } from 'react'
import HeroArt from './HeroArt'

interface Props {
  src: string
  alt: string
  credit?: string
  className?: string
}

// Shows a real photo. If the file is missing or fails to load, it falls back to the illustration.
export default function HeroPhoto({ src, alt, credit, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed) return <HeroArt className={className} />

  return (
    <figure className={`relative overflow-hidden rounded-xl shadow-sm ring-1 ring-slate-900/10 ${className}`}>
      <img
        src={src}
        alt={alt}
        width={640}
        height={448}
        loading="eager"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
      {credit && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 pb-2 pt-6 text-[11px] text-white/90">
          {credit}
        </figcaption>
      )}
    </figure>
  )
}