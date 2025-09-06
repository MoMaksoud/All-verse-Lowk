# DynamicBackground Component

A high-performance, sitewide dynamic background system with aurora gradients and particle effects.

## Features

- **Aurora Gradients**: Multi-layered animated gradients with smooth hue drift
- **Particle System**: Canvas-based particles with Brownian motion and parallax effects
- **Performance Optimized**: GPU-accelerated CSS animations, FPS capped at 45
- **Accessibility**: Respects `prefers-reduced-motion`, maintains WCAG contrast
- **Route Guard**: Only loads on specified routes to prevent memory leaks

## Usage

```tsx
import { DynamicBackground } from '@/components/DynamicBackground';

// Basic usage
<DynamicBackground />

// With custom settings
<DynamicBackground 
  intensity="high" 
  showParticles={false} 
  className="custom-class"
/>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `intensity` | `'low' \| 'med' \| 'high'` | `'med'` | Controls opacity and particle count |
| `showParticles` | `boolean` | `true` | Enable/disable particle system |
| `className` | `string` | `''` | Additional CSS classes |

### Intensity Levels

- **Low**: 30 particles, 0.3 speed, 0.4 opacity
- **Med**: 60 particles, 0.5 speed, 0.6 opacity  
- **High**: 90 particles, 0.7 speed, 0.8 opacity

## Technical Details

### Aurora Gradients
- **Layer A**: 6 radial gradients with elliptical shapes
- **Layer B**: 3 linear gradients with directional movement
- **Layer C**: Conic gradient with rotating color wheel
- **Animation**: 20-30 second cycles with smooth transitions

### Particle System
- **Canvas-based**: Hardware accelerated rendering
- **Brownian Motion**: Random walk with velocity damping
- **Mouse Parallax**: Subtle interaction with cursor position
- **Scroll Parallax**: Particles move with page scroll
- **Performance**: FPS capped at 45, pauses when tab hidden

### Performance Optimizations
- `will-change` properties for GPU acceleration
- `requestAnimationFrame` for smooth animations
- Early bailout for reduced motion preferences
- Proper cleanup on unmount and route changes

## CSS Classes

The component uses these CSS classes defined in `globals.css`:

- `.aurora-gradient` - Main gradient container
- `.aurora-intensity-{low|med|high}` - Intensity variations
- `.aurora-static` - Fallback for reduced motion

## Route Integration

Use with route guards to only load on specific pages:

```tsx
import { useRouteGuard } from '@/hooks/useRouteGuard';

function HomePage() {
  const isHomeRoute = useRouteGuard();
  
  return (
    <div>
      {isHomeRoute && <DynamicBackground intensity="med" />}
      {/* Your content */}
    </div>
  );
}
```

## Accessibility

- Respects `prefers-reduced-motion: reduce`
- Maintains WCAG contrast ratios
- No impact on text legibility
- Static fallback for motion-sensitive users

## Browser Support

- Modern browsers with Canvas API support
- CSS Grid and Flexbox support required
- Hardware acceleration recommended for best performance
