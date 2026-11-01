import { createContext, useContext } from 'react';

import type { DeviceKind } from '@/api/pairing';

export interface Wizard {
  kind: DeviceKind | null;
  chooseKind: (kind: DeviceKind) => void;
  // The user read the safety text of the clamp
  safetyRead: boolean;
  setSafetyRead: (value: boolean) => void;
  // The user agreed that the data of the device is read
  consented: boolean;
  setConsented: (value: boolean) => void;
  name: string;
  setName: (value: string) => void;
  roomId: string;
  setRoomId: (value: string) => void;
}

export const WizardContext = createContext<Wizard | null>(null);

export function useWizard(): Wizard {
  const wizard = useContext(WizardContext);

  if (!wizard) {
    throw new Error('useWizard needs the layout of the Tambah alat steps.');
  }
  return wizard;
}
