/**
 * NetworkWatcher
 * Replaces NetworkContext — listens to browser online/offline events
 * and dispatches to Redux uiSlice. Also renders the NetworkStatusBar.
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setIsOnline, selectIsOnline } from '../../redux/slices/uiSlice';
import { NetworkStatusBar } from './NetworkStatusBar';

export default function NetworkWatcher() {
  const dispatch = useDispatch();
  const isOnline = useSelector(selectIsOnline);

  useEffect(() => {
    const handleOnline = () => dispatch(setIsOnline(true));
    const handleOffline = () => dispatch(setIsOnline(false));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  return <NetworkStatusBar isOnline={isOnline} />;
}
