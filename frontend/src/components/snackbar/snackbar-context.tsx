import type { ReactNode } from 'react';
import type { AlertColor } from '@mui/material';

import React, { useState, useContext, useCallback, createContext } from 'react';

import { Alert, Snackbar } from '@mui/material';

interface SnackbarContextType {
  enqueueSnackbar: (message: string, options?: SnackbarOptions) => void;
}

interface SnackbarOptions {
  variant?: AlertColor;
  duration?: number;
}

interface SnackbarState {
  open: boolean;
  message: string;
  variant: AlertColor;
  duration: number;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    variant: 'info',
    duration: 6000,
  });

  const enqueueSnackbar = useCallback((message: string, options: SnackbarOptions = {}) => {
    setSnackbar({
      open: true,
      message,
      variant: options.variant || 'info',
      duration: options.duration || 6000,
    });
  }, []);

  const handleClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={{ enqueueSnackbar }}>
      {children}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={snackbar.variant}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};
