import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { apiService, Draft } from '../../services/api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../contexts/WalletContext', () => ({
  useWallet: () => ({
    address: '0x1234567890abcdef1234567890abcdef12345678',
    isConnected: true,
    isConnecting: false,
    balance: '0.50 ETH',
    disconnect: vi.fn(),
  }),
}));

vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => null,
}));

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
  return {
    ...actual,
    apiService: {
      getArticles: vi.fn(),
      getAuthor: vi.fn(),
      getDrafts: vi.fn(),
      deleteDraft: vi.fn(),
    },
  };
});

const mockApi = apiService as unknown as {
  getArticles: ReturnType<typeof vi.fn>;
  getAuthor: ReturnType<typeof vi.fn>;
  getDrafts: ReturnType<typeof vi.fn>;
  deleteDraft: ReturnType<typeof vi.fn>;
};

const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

const sampleDrafts: Draft[] = [
  {
    id: 1,
    title: 'Draft One',
    content: '<p>First draft content</p>',
    price: 0.05,
    authorAddress: walletAddress,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    title: 'Draft Two',
    content: '<p>Second draft content</p>',
    price: 0.1,
    authorAddress: walletAddress,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

describe('Dashboard drafts modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();

    mockApi.getArticles.mockResolvedValue({
      success: true,
      data: [],
    });

    mockApi.getAuthor.mockResolvedValue({
      success: true,
      data: {
        address: walletAddress,
        createdAt: new Date().toISOString(),
        totalEarnings: 0,
        totalArticles: 0,
        totalViews: 0,
        totalPurchases: 0,
      },
    });

    mockApi.getDrafts.mockImplementation(async () => ({
      success: true,
      data: sampleDrafts.map(draft => ({ ...draft })),
    }));

    mockApi.deleteDraft.mockResolvedValue({
      success: true,
      data: { message: 'Draft deleted successfully' },
    });
  });

  afterEach(() => {
    mockNavigate.mockReset();
  });

  const renderDashboard = async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(mockApi.getArticles).toHaveBeenCalled());
    const openButton = await screen.findByRole('button', { name: /view drafts/i });
    return { user, openButton };
  };

  it('opens drafts modal and supports edit, publish, and delete actions', async () => {
    const { user, openButton } = await renderDashboard();

    await user.click(openButton);
    await waitFor(() => expect(mockApi.getDrafts).toHaveBeenCalledWith(walletAddress));
    await screen.findByText('Draft One');
    expect(screen.getByText('Draft Two')).toBeInTheDocument();

    const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
    await user.click(editButton);
    expect(mockNavigate).toHaveBeenLastCalledWith('/write?draftId=1');
    mockNavigate.mockClear();

    await user.click(await screen.findByRole('button', { name: /view drafts/i }));
    await screen.findByText('Draft One');
    const publishButton = screen.getAllByRole('button', { name: /publish/i })[0];
    await user.click(publishButton);
    expect(mockNavigate).toHaveBeenLastCalledWith('/write?draftId=1&action=publish');
    mockNavigate.mockClear();

    await user.click(await screen.findByRole('button', { name: /view drafts/i }));
    await screen.findByText('Draft One');
    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await user.click(deleteButton);

    await waitFor(() => expect(mockApi.deleteDraft).toHaveBeenCalledWith(1, walletAddress));
    await waitFor(() => expect(screen.queryByText('Draft One')).not.toBeInTheDocument());
  });
});
