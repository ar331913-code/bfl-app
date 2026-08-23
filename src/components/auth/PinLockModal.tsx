import React from 'react';
import { LoginModal } from './LoginModal';

// Backwards-compatibility alias
export const PinLockModal: React.FC = () => {
  return <LoginModal />;
};
