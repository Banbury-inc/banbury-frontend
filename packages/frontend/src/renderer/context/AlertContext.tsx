import React, { createContext, useContext, useState } from 'react';

type AlertVariant = 'error' | 'warning' | 'success' | 'info';

type AlertState = {
  title: string;
  messages: string[];
  show: boolean;
  isVisible: boolean;
  variant: AlertVariant;
};

type AlertContextType = {
  showAlert: (title: string, messages: string[], variant?: AlertVariant) => void;
  hideAlert: () => void;
  alert: AlertState;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({
    title: '',
    messages: [],
    show: false,
    isVisible: false,
    variant: 'info',
  });

  const showAlert = (title: string, messages: string[], variant: AlertVariant = 'info') => {
    // First mount the component with opacity 0
    setAlert({
      title,
      messages,
      show: true,
      isVisible: false,
      variant,
    });

    // Then trigger the fade in after a brief delay
    requestAnimationFrame(() => {
      setAlert(prev => ({
        ...prev,
        isVisible: true,
      }));
    });

    // Automatically hide alert after 5 seconds
    setTimeout(() => {
      hideAlert();
    }, 5000);
  };

  const hideAlert = () => {
    // First trigger the fade out
    setAlert(prev => ({
      ...prev,
      isVisible: false,
    }));

    // Then remove the component after animation completes
    setTimeout(() => {
      setAlert(prev => ({
        ...prev,
        show: false,
      }));
    }, 300); // Match this with the CSS transition duration
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, alert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
} 