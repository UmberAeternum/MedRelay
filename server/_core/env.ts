export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Server-only. Do not prefix this variable with VITE_ or expose it to client code.
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  // A stable, non-identifying HMAC salt used only for OpenAI safety identifiers.
  openaiSafetyIdentifierSalt: process.env.OPENAI_SAFETY_IDENTIFIER_SALT ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
