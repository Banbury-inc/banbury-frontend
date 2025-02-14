import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationsButton from '../NotificationsButton';
import { act } from 'react-dom/test-utils';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../themes/theme2';
import { banbury } from '@banbury/core';

// Mock the notifications API
jest.mock('../../../../neuranet/notifications');
jest.mock('../fetchNotifications', () => ({
    fetchNotifications: jest.fn((username, setNotifications) => {
        setNotifications([
            {
                _id: '1',
                type: 'system',
                title: 'Test Notification 1',
                description: 'Test Description 1',
                timestamp: '2024-03-20T10:00:00Z',
                read: false,
            },
            {
                _id: '2',
                type: 'system',
                title: 'Test Notification 2',
                description: 'Test Description 2',
                timestamp: '2024-03-20T09:00:00Z',
                read: true,
            },
        ]);
    }),
}));

// Create a proper websocket mock
const mockWebSocket = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    close: jest.fn(),
};

// Mock the useAuth hook
jest.mock('../../../../context/AuthContext', () => ({
    useAuth: () => ({
        username: 'testuser',
        websocket: mockWebSocket,
        isAuthenticated: true,
    }),
}));

// Mock banbury module
jest.mock('@banbury/core', () => ({
    banbury: {
        notifications: {
            markNotificationAsRead: jest.fn(),
            deleteNotification: jest.fn(),
        }
    }
}));

const renderWithProviders = (ui: React.ReactElement) => {
    return render(
        <ThemeProvider theme={theme}>
            {ui}
        </ThemeProvider>
    );
};

describe('NotificationsButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Clean up any websocket listeners
        mockWebSocket.removeEventListener.mockClear();
        mockWebSocket.addEventListener.mockClear();
        mockWebSocket.close.mockClear();
    });

    it('displays notification count badge for unread notifications', () => {
        renderWithProviders(<NotificationsButton />);

        const badge = screen.getByText('1');
        expect(badge).toBeInTheDocument();
    });


    it('marks notification as read when clicking mark as read button', async () => {
        (banbury.notifications.markNotificationAsRead as jest.Mock).mockResolvedValueOnce({});

        renderWithProviders(<NotificationsButton />);

        const button = screen.getByRole('button');
        await act(async () => {
            fireEvent.click(button);
        });

        await waitFor(() => {
            const markAsReadButton = screen.getAllByRole('button').find(
                button => button.querySelector('svg[data-testid="DoneIcon"]')
            );
            expect(markAsReadButton).toBeInTheDocument();
            if (markAsReadButton) {
                fireEvent.click(markAsReadButton);
            }
        }, { timeout: 1000 });

        await waitFor(() => {
            expect(banbury.notifications.markNotificationAsRead).toHaveBeenCalledWith('1');
        }, { timeout: 1000 });
    });

    it('deletes notification when clicking delete button', async () => {
        (banbury.notifications.deleteNotification as jest.Mock).mockResolvedValueOnce({});

        renderWithProviders(<NotificationsButton />);

        const button = screen.getByRole('button');
        await act(async () => {
            fireEvent.click(button);
        });

        await waitFor(() => {
            const deleteButton = screen.getAllByRole('button').find(
                button => button.querySelector('svg[data-testid="DeleteIcon"]')
            );
            expect(deleteButton).toBeInTheDocument();
            if (deleteButton) {
                fireEvent.click(deleteButton);
            }
        }, { timeout: 1000 });

        await waitFor(() => {
            expect(banbury.notifications.deleteNotification).toHaveBeenCalledWith('1', 'testuser');
        }, { timeout: 1000 });
    });

    it('marks all notifications as read when clicking "Mark all as read"', async () => {
        (banbury.notifications.markNotificationAsRead as jest.Mock).mockResolvedValueOnce({});

        renderWithProviders(<NotificationsButton />);

        const button = screen.getByRole('button');
        await act(async () => {
            fireEvent.click(button);
        });

        await waitFor(() => {
            const markAllAsReadButton = screen.getByText('Mark all as read');
            expect(markAllAsReadButton).toBeInTheDocument();
            fireEvent.click(markAllAsReadButton);
        }, { timeout: 1000 });

        await waitFor(() => {
            expect(banbury.notifications.markNotificationAsRead).toHaveBeenCalledWith('1');
        }, { timeout: 1000 });
    });

    it('removes all notifications when clicking "Remove all"', async () => {
        (banbury.notifications.deleteNotification as jest.Mock).mockResolvedValueOnce({});

        renderWithProviders(<NotificationsButton />);

        const button = screen.getByRole('button');
        await act(async () => {
            fireEvent.click(button);
        });

        await waitFor(() => {
            const removeAllButton = screen.getByText('Remove all');
            expect(removeAllButton).toBeInTheDocument();
            fireEvent.click(removeAllButton);
        }, { timeout: 1000 });

        await waitFor(() => {
            expect(banbury.notifications.deleteNotification).toHaveBeenCalledWith('1', 'testuser');
            expect(banbury.notifications.deleteNotification).toHaveBeenCalledWith('2', 'testuser');
        }, { timeout: 1000 });
    });

    it('shows empty state when there are no notifications', async () => {
        jest.requireMock('../fetchNotifications').fetchNotifications.mockImplementationOnce(
            (username: string, setNotifications: (notifications: any[]) => void) => {
                setNotifications([]);
            }
        );

        renderWithProviders(<NotificationsButton />);

        const button = screen.getByRole('button');
        await act(async () => {
            fireEvent.click(button);
        });

        await waitFor(() => {
            expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
            expect(screen.getByText('No new notifications')).toBeInTheDocument();
        }, { timeout: 1000 });
    });
}); 
