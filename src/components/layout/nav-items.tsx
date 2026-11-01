import type { ComponentType, SVGProps } from 'react';

import { BulbIcon } from '@/components/icons/bulb-icon';
import { HomeIcon } from '@/components/icons/home-icon';
import { PlugIcon } from '@/components/icons/plug-icon';
import { ReportIcon } from '@/components/icons/report-icon';

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

// A screen adds its own entry here when it ships, so the menu never links to a page that does not exist.
export const navItems: NavItem[] = [
  { to: '/', label: 'Beranda', icon: HomeIcon },
  { to: '/saran', label: 'Saran', icon: BulbIcon },
  { to: '/alat', label: 'Alat', icon: PlugIcon },
  { to: '/laporan', label: 'Laporan', icon: ReportIcon },
];
