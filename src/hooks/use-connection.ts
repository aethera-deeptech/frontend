import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export type ConnectionState = 'online' | 'offline' | 'catching-up';

// The state of the connection of the device. After the connection returns the state is catching-up until every running
// request has finished, so a screen can say that the numbers are still arriving.
export function useConnection(): ConnectionState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ConnectionState>(() =>
    onlineManager.isOnline() ? 'online' : 'offline',
  );

  useEffect(() => {
    const settle = () => {
      setState((current) =>
        current === 'catching-up' && queryClient.isFetching() === 0 ? 'online' : current,
      );
    };

    const stopOnline = onlineManager.subscribe((online) => {
      if (!online) {
        setState('offline');
        return;
      }
      setState('catching-up');
      // The queries start their requests while this event is handled, so look again when the event is done
      setTimeout(settle, 0);
    });
    const stopCache = queryClient.getQueryCache().subscribe(settle);

    return () => {
      stopOnline();
      stopCache();
    };
  }, [queryClient]);

  return state;
}
