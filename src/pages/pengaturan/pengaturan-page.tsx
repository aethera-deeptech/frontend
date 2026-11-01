import { useLocation } from 'react-router';

import { PengaturanHeader, PengaturanView } from '@/pages/pengaturan/pengaturan-view';
import { SettingsGate } from '@/pages/pengaturan/settings-gate';
import { savedMessages, type SavedSetting } from '@/pages/pengaturan/settings-text';

const backTo = '/lainnya';

function readSaved(state: unknown): SavedSetting | undefined {
  if (typeof state !== 'object' || state === null || !('saved' in state)) {
    return undefined;
  }
  return Object.keys(savedMessages).find((key): key is SavedSetting => key === state.saved);
}

export function PengaturanPage() {
  const state: unknown = useLocation().state;
  const saved = readSaved(state);

  return (
    <>
      <title>Pengaturan · Audit Energi UMKM</title>
      <SettingsGate
        fallback={(content) => (
          <div className="flex flex-col gap-3">
            <PengaturanHeader backTo={backTo} />
            {content}
          </div>
        )}
      >
        {(settings) => <PengaturanView settings={settings} saved={saved} backTo={backTo} />}
      </SettingsGate>
    </>
  );
}
