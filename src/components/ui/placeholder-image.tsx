import type React from "react"

interface PlaceholderImageProps {
  width: number
  height: number
}

export const PlaceholderImage: React.FC<PlaceholderImageProps> = ({ width, height }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={width} height={height} fill="#E5E7EB" />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#9CA3AF"
        fontSize="16"
        fontFamily="sans-serif"
      >
        {width}x{height}
      </text>
    </svg>
  )
}

