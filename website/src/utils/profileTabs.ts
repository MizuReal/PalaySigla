export const PROFILE_TAB_IDS = Object.freeze({
  ACCOUNT: 'account',
  FARMER: 'farmer',
  LISTINGS: 'listings',
  PURCHASES: 'purchases',
} as const)

export type ProfileTabId = (typeof PROFILE_TAB_IDS)[keyof typeof PROFILE_TAB_IDS]
