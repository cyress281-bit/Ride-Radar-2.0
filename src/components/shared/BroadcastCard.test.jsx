import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BroadcastCard from './BroadcastCard';

// Mock auth state so SafetyActions doesn't crash
vi.mock('@/features/auth/hooks/use-auth.js', () => ({
  useAuthState: () => ({ user: { id: 'viewer-1' } }),
  useAuthActions: () => ({}),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function Wrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const mockBroadcast = {
  id: '1',
  type: 'solo_ride',
  title: 'Sunday Morning Ride',
  body: 'Cruising up the coast',
  frozen_lat: 34.05,
  frozen_lng: -118.25,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  author_id: 'user-1',
};

const mockAuthor = {
  id: 'user-1',
  display_name: 'Test Rider',
  avatar_url: null,
};

describe('BroadcastCard', () => {
  it('renders broadcast title and author', () => {
    render(
      <Wrapper>
        <BroadcastCard broadcast={mockBroadcast} author={mockAuthor} />
      </Wrapper>
    );

    expect(screen.getByText('Sunday Morning Ride')).toBeInTheDocument();
    expect(screen.getByText('Test Rider')).toBeInTheDocument();
  });

  it('renders correct type badge for solo_ride', () => {
    render(
      <Wrapper>
        <BroadcastCard broadcast={mockBroadcast} author={mockAuthor} />
      </Wrapper>
    );

    expect(screen.getByText(/Solo Ride/i)).toBeInTheDocument();
  });
});
