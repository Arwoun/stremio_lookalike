export const queryParamsEncode = (params) =>
  [...params]
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
