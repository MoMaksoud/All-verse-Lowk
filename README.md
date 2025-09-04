# Marketplace Monorepo

A production-quality cross-platform marketplace application built with a modern monorepo architecture. Features a shared UI component library, TypeScript throughout, and mock API services for realistic development experience.

## 🏗️ Architecture

```
marketplace-monorepo/
├── apps/
│   ├── web/                 # Next.js web application
│   └── mobile/             # Expo React Native app (coming soon)
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── lib/                # Shared utilities and mock API
│   └── ui/                 # Cross-platform UI components
└── package.json            # Root workspace configuration
```

## ✨ Features

### Web Application (Next.js)
- **Home Page**: Featured categories, recent listings, hero section
- **Listings Browse**: Grid/list view with advanced filters and pagination
- **Listing Detail**: Photo gallery, seller info, price suggestions
- **Sell Flow**: Multi-step form with image upload preview
- **Responsive Design**: Mobile-first with Tailwind CSS
- **Dark Mode**: System preference support

### Shared Components (React Native Web)
- **Button**: Multiple variants and sizes
- **Input**: Form inputs with validation states
- **Card**: Content containers with elevation options
- **Avatar**: User profile images with fallbacks
- **Toast**: Notification system
- **Modal**: Overlay dialogs
- **Spinner**: Loading indicators
- **EmptyState**: No content states

### Mock API Services
- **Realistic Data**: Comprehensive mock data with relationships
- **Network Simulation**: Configurable delays for realistic UX
- **CRUD Operations**: Full listing lifecycle management
- **Search & Filters**: Advanced filtering and pagination
- **Price Suggestions**: Interactive pricing system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm 8+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd marketplace-monorepo
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build shared packages**
   ```bash
   pnpm build
   ```

4. **Start development servers**
   ```bash
   # Start web app
   pnpm dev --filter=@marketplace/web
   
   # Start all apps (if you have multiple)
   pnpm dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

### Apps

#### `apps/web/` - Next.js Web Application
- **App Router**: Modern Next.js 14 with app directory
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **React Native Web**: Shared component compatibility
- **TypeScript**: Full type safety throughout

Key pages:
- `/` - Home with featured content
- `/listings` - Browse with filters
- `/listings/[id]` - Detail view
- `/sell` - Multi-step listing creation
- `/chat` - Messaging (coming soon)
- `/profile` - User profile (coming soon)

#### `apps/mobile/` - Expo React Native (Coming Soon)
- **Expo SDK**: Cross-platform mobile development
- **NativeWind**: Tailwind CSS for React Native
- **Shared Components**: Reuse UI package components

### Packages

#### `packages/types/` - Shared TypeScript Types
```typescript
// Core domain types
interface Listing {
  id: string;
  title: string;
  price: number;
  // ... more properties
}

interface User {
  id: string;
  displayName: string;
  // ... more properties
}

// API response types
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
```

#### `packages/lib/` - Shared Utilities
- **Mock API**: Realistic data services with delays
- **Validation**: Zod schemas for form validation
- **Utils**: Formatting, debouncing, and helper functions

#### `packages/ui/` - Cross-Platform Components
- **React Native Web**: Web and mobile compatibility
- **Design System**: Consistent theming and spacing
- **Accessibility**: ARIA labels and keyboard navigation
- **Dark Mode**: Theme switching support

## 🛠️ Development

### Available Scripts

```bash
# Root level commands
pnpm build          # Build all packages and apps
pnpm dev            # Start all development servers
pnpm lint           # Lint all packages
pnpm test           # Run tests across all packages
pnpm clean          # Clean all build artifacts

# Package-specific commands
pnpm --filter=@marketplace/web dev     # Start web app
pnpm --filter=@marketplace/lib build   # Build lib package
pnpm --filter=@marketplace/ui build    # Build UI package
```

### Development Workflow

1. **Start Development**
   ```bash
   pnpm dev
   ```

2. **Make Changes**
   - Edit components in `packages/ui/src/components/`
   - Update types in `packages/types/src/`
   - Add utilities in `packages/lib/src/`
   - Build pages in `apps/web/src/app/`

3. **Hot Reload**
   - Web app: `http://localhost:3000`
   - UI package: Auto-rebuilds on changes
   - Types: Auto-rebuilds on changes

### Adding New Components

1. **Create component in UI package**
   ```typescript
   // packages/ui/src/components/NewComponent.tsx
   import React from 'react';
   import { View, Text } from 'react-native';
   
   export interface NewComponentProps {
     // Define props
   }
   
   export const NewComponent: React.FC<NewComponentProps> = ({}) => {
     return (
       <View>
         <Text>New Component</Text>
       </View>
     );
   };
   ```

2. **Export from index**
   ```typescript
   // packages/ui/src/index.ts
   export { NewComponent } from './components/NewComponent';
   export type { NewComponentProps } from './components/NewComponent';
   ```

3. **Use in web app**
   ```typescript
   // apps/web/src/components/SomePage.tsx
   import { NewComponent } from '@marketplace/ui';
   
   export function SomePage() {
     return <NewComponent />;
   }
   ```

## 🎨 Design System

### Colors
```typescript
// Primary brand colors
primary: {
  50: '#eff6ff',
  500: '#3b82f6',
  600: '#2563eb',
  900: '#1e3a8a',
}

// Semantic colors
success: { 500: '#22c55e' }
warning: { 500: '#f59e0b' }
error: { 500: '#ef4444' }
```

### Typography
```typescript
fontSizes: {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
}
```

### Spacing
```typescript
spacing: {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
}
```

## 🔧 Configuration

### TypeScript
- Strict mode enabled
- Path mapping for clean imports
- Shared configs across packages

### ESLint
- Next.js recommended rules
- TypeScript support
- Import sorting

### Tailwind CSS
- Custom design tokens
- Dark mode support
- Responsive utilities

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter=@marketplace/ui test
```

### Component Testing
```typescript
// Example test for UI components
import { render, screen } from '@testing-library/react';
import { Button } from '@marketplace/ui';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

## 📦 Deployment

### Web App (Vercel)
```bash
# Build for production
pnpm build

# Deploy to Vercel
vercel --prod
```

### Package Publishing
```bash
# Build packages
pnpm build

# Publish to npm (if needed)
pnpm --filter=@marketplace/ui publish
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make changes and test**
4. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
5. **Push and create pull request**

### Commit Convention
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions
- **Documentation**: Check inline code comments and TypeScript types

## 🚧 Roadmap

### Phase 1 ✅ (Current)
- [x] Monorepo setup with Turborepo
- [x] Shared UI component library
- [x] Next.js web application
- [x] Mock API services
- [x] TypeScript throughout
- [x] Responsive design

### Phase 2 🔄 (In Progress)
- [ ] Expo React Native mobile app
- [ ] Real-time chat functionality
- [ ] User authentication
- [ ] Image upload service
- [ ] Payment integration

### Phase 3 📋 (Planned)
- [ ] Backend API development
- [ ] Database integration
- [ ] Search and recommendation engine
- [ ] Analytics and monitoring
- [ ] Performance optimization

---

Built with ❤️ using modern web technologies
#   A l l - v e r s e - L o w k  
 