import crypto from 'crypto';

export const createSessionId = () => crypto.randomUUID();

export const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
};

export const parseDeviceInfo = (userAgent = '') => {
  const browser =
    userAgent.match(/Edg\/([\d.]+)/) ? 'Edge' :
    userAgent.match(/OPR\/([\d.]+)/) ? 'Opera' :
    userAgent.match(/Chrome\/([\d.]+)/) ? 'Chrome' :
    userAgent.match(/Firefox\/([\d.]+)/) ? 'Firefox' :
    userAgent.match(/Safari\/([\d.]+)/) && !userAgent.match(/Chrome\/([\d.]+)/) ? 'Safari' :
    'Unknown';

  const os =
    userAgent.includes('Windows') ? 'Windows' :
    userAgent.includes('Android') ? 'Android' :
    userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'iOS' :
    userAgent.includes('Mac OS X') ? 'macOS' :
    userAgent.includes('Linux') ? 'Linux' :
    'Unknown';

  return { browser, os, userAgent };
};

export const buildSession = (req, user = null) => {
  const userAgent = req?.headers?.['user-agent'] || '';
  const requestedDeviceId = req?.body?.deviceId || req?.headers?.['x-device-id'];

  let sessionId;
  if (requestedDeviceId && typeof requestedDeviceId === 'string' && requestedDeviceId.trim().length > 0) {
    const rawId = requestedDeviceId.trim();
    // Scope the device session to the user so multiple accounts on the same browser have separate sessions and keys
    if (user?._id) {
      const uIdStr = user._id.toString();
      const uPrefix = uIdStr.slice(-6);
      if (rawId.includes(uPrefix)) {
        sessionId = rawId;
      } else {
        sessionId = `dev_${uPrefix}_${rawId.slice(0, 14)}`;
      }
    } else {
      sessionId = rawId;
    }
  } else {
    sessionId = createSessionId();
  }

  return {
    sessionId,
    ip: getClientIp(req),
    ...parseDeviceInfo(userAgent),
    createdAt: new Date(),
    lastSeenAt: new Date(),
  };
};
