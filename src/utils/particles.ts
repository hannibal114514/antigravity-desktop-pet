export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  scale: number
  opacity: number
  rotation: number
  text: string
}

const ICONS = ['❤️', '💕', '✨', '🌸', '💖', '⭐', '🐾', '🎀']

let idCounter = 0

export function createParticleBurst(originX: number, originY: number, count = 6): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2)
    const speed = 1.8 + Math.random() * 2.5
    particles.push({
      id: ++idCounter,
      x: originX + (Math.random() * 20 - 10),
      y: originY + (Math.random() * 20 - 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      scale: 0.8 + Math.random() * 0.6,
      opacity: 1,
      rotation: (Math.random() - 0.5) * 40,
      text: ICONS[Math.floor(Math.random() * ICONS.length)]
    })
  }
  return particles
}
