# Testing Guide — Ride Radar 2.0

## Test Runner

We use **Vitest** with **jsdom** environment and **React Testing Library**.

```bash
# Run all tests once
npm run test

# Watch mode (reruns on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

## Test Setup

Global setup is in `src/test/setup.js`:
- Imports `@testing-library/jest-dom` matchers
- Mocks `import.meta.env` with safe defaults
- Suppresses non-critical console noise during tests

## Writing Tests

### Component Tests

Wrap components that use TanStack Query in a `QueryClientProvider`:

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function Wrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

render(<MyComponent />, { wrapper: Wrapper });
```

### Mocking Auth

If a component calls `useAuthState`, mock it at the module level:

```jsx
import { vi } from 'vitest';

vi.mock('@/features/auth/hooks/use-auth.js', () => ({
  useAuthState: () => ({ user: { id: 'test-user' } }),
  useAuthActions: () => ({}),
}));
```

### Mocking Router

Wrap with `MemoryRouter` from `react-router-dom`:

```jsx
import { MemoryRouter } from 'react-router-dom';

render(
  <MemoryRouter>
    <MyPage />
  </MemoryRouter>
);
```

### Hook Tests

Use `renderHook` from `@testing-library/react`:

```jsx
import { renderHook } from '@testing-library/react';
import { useMyHook } from './use-my-hook';

const { result } = renderHook(() => useMyHook());
expect(result.current).toBe(true);
```

## Testing Patterns

| What to test | How |
|--------------|-----|
| Render without crashing | `render(<Component />)` |
| Props affect output | Pass different props, assert DOM changes |
| User interactions | `fireEvent.click`, `userEvent.type` |
| Error states | Trigger errors, assert fallback UI |
| Hook return values | `renderHook` + `act` |

## Coverage Goals

- **Smoke tests** for all critical user flows (auth, broadcast, chat, notifications)
- **Regression tests** for previously fixed bugs
- Target: 60%+ coverage on `src/lib/` and `src/hooks/`

## Known Test Limitations

- Leaflet map components are not rendered in jsdom (no canvas/WebGL)
- Supabase realtime subscriptions are not tested in unit tests (test integration separately)
- Image upload flows require browser APIs not available in jsdom
