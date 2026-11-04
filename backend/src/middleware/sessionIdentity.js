const crypto = require('node:crypto');

const COOKIE_NAME = 'dms_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const configuredSecret = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === 'production' && !configuredSecret) {
  throw new Error('SESSION_SECRET deve ser definido em produção.');
}
if (configuredSecret && Buffer.byteLength(configuredSecret) < 32) {
  throw new Error('SESSION_SECRET deve conter pelo menos 32 bytes.');
}

const sessionSecret = configuredSecret || crypto.randomBytes(32).toString('hex');

function sign(sessionId) {
  return crypto.createHmac('sha256', sessionSecret).update(sessionId).digest('base64url');
}

function readSessionId(cookieHeader) {
  const cookie = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  const [sessionId, signature, ...extraParts] = cookie.slice(COOKIE_NAME.length + 1).split('.');
  if (!sessionId || !signature || extraParts.length > 0) {
    return null;
  }

  const expectedSignature = Buffer.from(sign(sessionId));
  const receivedSignature = Buffer.from(signature);
  if (expectedSignature.length !== receivedSignature.length
    || !crypto.timingSafeEqual(expectedSignature, receivedSignature)) {
    return null;
  }

  return sessionId;
}

function sessionIdentity(req, res, next) {
  const existingSessionId = readSessionId(req.headers.cookie);
  const sessionId = existingSessionId || crypto.randomUUID();

  if (!existingSessionId) {
    const token = `${sessionId}.${sign(sessionId)}`;
    const cookieOptions = [
      `${COOKIE_NAME}=${token}`,
      'HttpOnly',
      'SameSite=Strict',
      'Path=/',
      `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    ];
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure');
    }
    res.append('Set-Cookie', cookieOptions.join('; '));
  }

  req.user = req.user?.id ? req.user : { id: sessionId };
  return next();
}

module.exports = sessionIdentity;