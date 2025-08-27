'use client';

import { useState, useCallback } from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
}

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function useConfirmation() {
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmVariant: 'primary',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = useCallback(
    (options: ConfirmationOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmation({
          isOpen: true,
          title: options.title,
          message: options.message,
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          confirmVariant: options.confirmVariant || 'primary',
          onConfirm: () => {
            setConfirmation(prev => ({ ...prev, isOpen: false }));
            resolve(true);
          },
          onCancel: () => {
            setConfirmation(prev => ({ ...prev, isOpen: false }));
            resolve(false);
          },
        });
      });
    },
    []
  );

  return {
    confirmation,
    confirm,
  };
}