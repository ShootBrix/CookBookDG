type DogEarProps = {
  side: 'left' | 'right'
  onClick: () => void
}

export function DogEar({ side, onClick }: DogEarProps) {
  const isLeft = side === 'left'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isLeft ? 'Previous page' : 'Next page'}
      className={`group absolute bottom-0 h-10 w-10 transition-all duration-150 hover:h-14 hover:w-14 ${
        isLeft ? 'left-0' : 'right-0'
      }`}
      style={{
        clipPath: isLeft
          ? 'polygon(0 100%, 0 0, 100% 100%)'
          : 'polygon(100% 100%, 100% 0, 0 100%)',
        background: isLeft
          ? 'linear-gradient(135deg, #E9DFC8 0%, #C9B88E 55%, #A8926A 100%)'
          : 'linear-gradient(225deg, #E9DFC8 0%, #C9B88E 55%, #A8926A 100%)',
        boxShadow: '-2px -2px 6px rgba(122,96,58,0.35) inset',
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
      }}
    />
  )
}
