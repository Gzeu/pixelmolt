// Particle System - Physics and Behavior
import { Particle, EncodedThought, HSLColor, ShapeType } from '@/types';

let particleIdCounter = 0;

// Create a single particle
function createParticle(
  x: number,
  y: number,
  color: HSLColor,
  shape: ShapeType,
  intensity: number,
  chaos: number,
  speed: number
): Particle {
  const angle = Math.random() * Math.PI * 2;
  const baseSpeed = speed * (0.5 + Math.random() * 0.5);
  
  // Chaotic particles have more random velocity
  const velocityVariation = chaos * 2;
  
  return {
    id: particleIdCounter++,
    x,
    y,
    z: 0,
    vx: Math.cos(angle) * baseSpeed + (Math.random() - 0.5) * velocityVariation,
    vy: Math.sin(angle) * baseSpeed + (Math.random() - 0.5) * velocityVariation,
    vz: (Math.random() - 0.5) * baseSpeed * 0.5,
    color: { ...color, a: color.a * (0.7 + Math.random() * 0.3) },
    size: 2 + intensity * 8 + Math.random() * 4,
    lifetime: 100 + intensity * 200 + Math.random() * 100,
    maxLifetime: 100 + intensity * 200 + Math.random() * 100,
    shape,
    trail: [],
    glowIntensity: intensity * 0.8 + Math.random() * 0.2,
    rotationSpeed: (Math.random() - 0.5) * chaos * 0.1,
  };
}

// Generate particles from encoded thought
export function generateParticles(
  encoded: EncodedThought,
  canvasWidth: number,
  canvasHeight: number
): Particle[] {
  const particles: Particle[] = [];
  const { colors, shapes, intensity, chaos, speed, particleCount } = encoded;
  
  // Spawn position - center with some spread
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const spawnRadius = Math.min(canvasWidth, canvasHeight) * 0.1 * (1 + chaos);
  
  for (let i = 0; i < particleCount; i++) {
    // Random position within spawn radius
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * spawnRadius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    // Pick random color and shape from encoded thought
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    particles.push(createParticle(x, y, color, shape, intensity, chaos, speed));
  }
  
  return particles;
}

// Update particle physics
export function updateParticle(
  particle: Particle,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  // Save position to trail
  if (particle.trail.length > 20) {
    particle.trail.shift();
  }
  particle.trail.push({ x: particle.x, y: particle.y, z: particle.z });
  
  // Apply velocity
  particle.x += particle.vx;
  particle.y += particle.vy;
  particle.z += particle.vz;
  
  // Apply shape-specific behavior
  switch (particle.shape) {
    case 'spiral':
      // Spiral motion
      const spiralForce = 0.02;
      const dx = canvasWidth / 2 - particle.x;
      const dy = canvasHeight / 2 - particle.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        // Perpendicular + inward force
        particle.vx += (dy / dist) * spiralForce + (dx / dist) * 0.005;
        particle.vy += (-dx / dist) * spiralForce + (dy / dist) * 0.005;
      }
      break;
      
    case 'star':
      // Pulsing size
      particle.size = particle.size * (0.98 + Math.sin(particle.lifetime * 0.1) * 0.04);
      particle.glowIntensity = particle.glowIntensity * (0.95 + Math.sin(particle.lifetime * 0.05) * 0.1);
      break;
      
    case 'fractal':
      // Branching behavior (occasionally split velocity)
      if (Math.random() < 0.01) {
        const branchAngle = (Math.random() - 0.5) * Math.PI;
        const cos = Math.cos(branchAngle);
        const sin = Math.sin(branchAngle);
        const newVx = particle.vx * cos - particle.vy * sin;
        const newVy = particle.vx * sin + particle.vy * cos;
        particle.vx = newVx * 0.8;
        particle.vy = newVy * 0.8;
      }
      break;
      
    case 'line':
      // Maintain momentum, less randomness
      particle.vx *= 0.999;
      particle.vy *= 0.999;
      break;
      
    default:
      // Circle - slight gravity toward center
      const gravityCenterX = canvasWidth / 2;
      const gravityCenterY = canvasHeight / 2;
      const gx = gravityCenterX - particle.x;
      const gy = gravityCenterY - particle.y;
      const gDist = Math.sqrt(gx * gx + gy * gy);
      if (gDist > 50) {
        particle.vx += (gx / gDist) * 0.01;
        particle.vy += (gy / gDist) * 0.01;
      }
  }
  
  // Apply friction
  particle.vx *= 0.995;
  particle.vy *= 0.995;
  particle.vz *= 0.99;
  
  // Decrease lifetime
  particle.lifetime--;
  
  // Fade out
  particle.color.a = (particle.lifetime / particle.maxLifetime) * particle.color.a;
  
  // Return false if particle should be removed
  return particle.lifetime > 0 && particle.color.a > 0.01;
}

// Batch update all particles
export function updateParticles(
  particles: Particle[],
  canvasWidth: number,
  canvasHeight: number
): Particle[] {
  return particles.filter(p => updateParticle(p, canvasWidth, canvasHeight));
}
