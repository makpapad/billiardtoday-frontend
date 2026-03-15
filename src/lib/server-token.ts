export function getScoreboardApiToken(): string | null {
  const serverToken = process.env.STRAPI_API_TOKEN;
  if (serverToken && serverToken.trim()) return serverToken.trim();

  const activationToken = process.env.SCREEN_ACTIVATION_TOKEN;
  if (activationToken && activationToken.trim()) return activationToken.trim();

  return null;
}
