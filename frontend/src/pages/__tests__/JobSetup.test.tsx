import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import JobSetup from '../../pages/JobSetup';
import { toast } from 'react-hot-toast';

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock API client
jest.mock('../../api/client', () => ({
  api: {
    post: jest.fn(() => Promise.resolve({ data: { job_id: '12345' } })),
  },
}));

describe('JobSetup copy button', () => {
  test('displays Job ID after creation and copies to clipboard', async () => {
    const writeTextMock = jest.fn();
    // @ts-ignore
    navigator.clipboard = { writeText: writeTextMock };

    render(
      <BrowserRouter>
        <JobSetup />
      </BrowserRouter>
    );

    // Fill form fields
    fireEvent.change(screen.getByLabelText(/Job Title/i), { target: { value: 'Frontend Developer' } });
    fireEvent.change(screen.getByLabelText(/Domain/i), { target: { value: 'it' } });
    fireEvent.change(screen.getByLabelText(/Job Description/i), { target: { value: 'We need React' } });
    fireEvent.change(screen.getByLabelText(/Required Skills/i), { target: { value: 'React,Node.js' } });
    fireEvent.change(screen.getByLabelText(/Experience Level/i), { target: { value: 'fresher' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Job/i }));

    // Wait for async state update
    const jobIdElement = await screen.findByText(/Job ID: 12345/i);
    expect(jobIdElement).toBeInTheDocument();

    // Click copy button
    fireEvent.click(screen.getByRole('button', { name: /Copy ID/i }));
    expect(writeTextMock).toHaveBeenCalledWith('12345');
    expect(toast.success).toHaveBeenCalledWith('Job ID copied to clipboard');
  });
});
