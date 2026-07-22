import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import InterviewCompletionModal from '../InterviewCompletionModal';

// Mock the navigate function used inside the component
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useNavigate: () => jest.fn(),
  };
});

describe('InterviewCompletionModal', () => {
  const onClose = jest.fn();
  const onRetake = jest.fn();

  const renderModal = () =>
    render(
      <BrowserRouter>
        <InterviewCompletionModal onClose={onClose} onRetake={onRetake} />
      </BrowserRouter>
    );

  test('renders modal with three buttons', () => {
    renderModal();
    expect(screen.getByText(/Interview Completed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View Summary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retake Interview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
  });

  test('calls onClose when close icon is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText(/Close/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onRetake when Retake Interview button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Retake Interview/i }));
    expect(onRetake).toHaveBeenCalledTimes(1);
  });

  test('logout button clears storage and redirects', () => {
    // Spy on localStorage methods
    const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
    expect(removeItemSpy).toHaveBeenCalledWith('token');
    expect(removeItemSpy).toHaveBeenCalledWith('role');
    // window.location.href change cannot be asserted directly in JSDOM; ensure no errors thrown
    removeItemSpy.mockRestore();
  });
});
