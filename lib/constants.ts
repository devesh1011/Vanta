import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.PLAYWRIGHT ||
  process.env.CI_PLAYWRIGHT,
);

export const guestRegex = /^guest-\d+$/;

let cachedDummyPassword: string | null = null;

export function getDummyPassword(): string {
  if (!cachedDummyPassword) {
    cachedDummyPassword = generateDummyPassword();
  }
  return cachedDummyPassword;
}
