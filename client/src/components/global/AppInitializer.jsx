import { useEffect } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { verifyUser, initE2EEKeys, selectUser } from '../../redux/slices/authSlice';
import { getOrCreateDeviceId } from '../../lib/e2ee/keyStore';

// Attach stable browser device ID to every outgoing request
const deviceId = getOrCreateDeviceId();
if (deviceId) {
  axios.defaults.headers.common['x-device-id'] = deviceId;
}

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
