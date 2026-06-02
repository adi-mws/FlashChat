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

export const buildSession = (req) => {
  const userAgent = req.headers['user-agent'] || '';

  return {
    sessionId: createSessionId(),
    ip: getClientIp(req),
    ...parseDeviceInfo(userAgent),
    createdAt: new Date(),
    lastSeenAt: new Date(),
  };
};
