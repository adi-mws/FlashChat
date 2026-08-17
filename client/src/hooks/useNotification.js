import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification, removeNotification } from '../redux/slices/notificationSlice';

const TYPES = ['success', 'error', 'info', 'warning'];

/**
 * Drop-in replacement for the old useNotification() context hook.
 * Returns { showNotification } — same API as before.
 */
export function useNotification() {
  const dispatch = useDispatch();

  const showNotification = useCallback(
    (arg1, arg2) => {
      let type = 'info';
      let message = '';

      // Auto-detect parameter order: (type, message) or (message, type)
      if (TYPES.includes(arg1)) {
        type = arg1;
        message = arg2;
      } else if (TYPES.includes(arg2)) {
        type = arg2;
        message = arg1;
      } else {
        message = arg1 || arg2 || '';
      }

      const id = Date.now() + Math.random();
      dispatch(addNotification({ id, type, message }));

      setTimeout(() => {
        dispatch(removeNotification(id));
      }, 5000);
    },
    [dispatch]
  );

  return { showNotification };
}
