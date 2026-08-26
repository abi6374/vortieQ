import React from 'react'

/**
 * SkeletonBlock
 * A single shimmering placeholder. Compose several (varying width/height) to
 * approximate the shape of the content that is loading.
 */
export default function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
}
