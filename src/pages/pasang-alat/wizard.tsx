import { useMemo, useState } from 'react';
import { Outlet } from 'react-router';

import type { DeviceKind } from '@/api/pairing';
import { WizardContext, type Wizard } from '@/pages/pasang-alat/wizard-context';

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
