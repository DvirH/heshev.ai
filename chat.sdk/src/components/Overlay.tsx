import React from 'react';
import type { FloatingPosition } from '../types/config';

interface OverlayProps {
  position: FloatingPosition;
  isOpen: boolean;
  children: React.ReactNode;
}

export function Overlay({ position, isOpen, children }: OverlayProps) {
  if (!isOpen) {
    return null;
  }

  const positionClass = position === 'bottom-left'
    ? 'heshev-chat__overlay--bottom-left'
    : 'heshev-chat__overlay--bottom-right';

  return (
    <div className={`heshev-chat__overlay ${positionClass}`}>
      {children}
    </div>
  );
}
