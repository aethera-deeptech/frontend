import { useNavigation } from 'react-router';

// A page opens as its own chunk, so after a tap the old page stays until the new one has loaded
export function useNavigationPending(): boolean {
  return useNavigation().state === 'loading';
}
