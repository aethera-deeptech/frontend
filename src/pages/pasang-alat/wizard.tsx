import { createContext, useContext, useMemo, useState } from 'react';
import { Outlet } from 'react-router';

import type { DeviceKind } from '@/api/pairing';

interface Wizard {
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

const WizardContext = createContext<Wizard | null>(null);

export function useWizard(): Wizard {
  const wizard = useContext(WizardContext);

  if (!wizard) {
    throw new Error('useWizard needs the layout of the Tambah alat steps.');
  }
  return wizard;
}

// Holds what the user filled in over the steps. Each step has its own address, so the back button works.
export function TambahAlatLayout() {
  const [kind, setKind] = useState<DeviceKind | null>(null);
  const [safetyRead, setSafetyRead] = useState(false);
  const [consented, setConsented] = useState(false);
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const wizard = useMemo<Wizard>(
    () => ({
      kind,
      // Another kind needs the steps again
      chooseKind: (next) => {
        setKind(next);
        setSafetyRead(false);
        setConsented(false);
      },
      safetyRead,
      setSafetyRead,
      consented,
      setConsented,
      name,
      setName,
      roomId,
      setRoomId,
    }),
    [kind, safetyRead, consented, name, roomId],
  );

  return (
    <WizardContext value={wizard}>
      <Outlet />
    </WizardContext>
  );
}
