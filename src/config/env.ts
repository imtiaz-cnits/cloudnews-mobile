/**
 * Cloud News Environment Configuration
 */

const IS_PRODUCTION = true;

export const ENV = {
  API_BASE_URL: IS_PRODUCTION
    ? 'https://api.cloudnewsmeet.com/api/v1' // Removed trailing slash
    : 'http://10.0.2.2:8001/api/v1',

  LIVEKIT_WS_URL: IS_PRODUCTION
    ? 'wss://livekit.cloudnewsmeet.com'
    : 'ws://10.0.2.2:7880',

  INVITE_WEB_URL: 'https://cloudnewsmeet.com',
  DEEP_LINK_SCHEME: 'cloudnews://',
};
