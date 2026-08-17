/**
 * AppInitializer
 * Runs once at app boot: verifies session from cookie,
 * then initializes E2EE keys when user is available.
 * Replaces the useEffect logic that was inside AuthContext.
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { verifyUser, initE2EEKeys, selectUser } from '../../redux/slices/authSlice';

export default function AppInitializer() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  // Verify session on mount
  useEffect(() => {
    dispatch(verifyUser());
  }, [dispatch]);

  // Initialize E2EE keys when user is loaded
  useEffect(() => {
    if (user) {
      dispatch(initE2EEKeys(user));
    }
  }, [user, dispatch]);

  return null;
}
