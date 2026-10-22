// BotDiff supports only native authenticator TOTP; no SMS/custom/email MFA.
export const MFA_FACTOR_KINDS = ["totp"] as const;
export const PROVIDER_MFA_FACTOR_TYPES = ["totp"] as const;
export type MfaFactorKind = "totp";
export interface MfaFactorOption {
  kind: MfaFactorKind;
  label: string;
  availability: "available";
}
export function describeMfaFactors(): MfaFactorOption[] {
  return [{ kind: "totp", label: "Authenticator app", availability: "available" }];
}
export function canEnableFactor(option: MfaFactorOption): boolean { return option.availability === "available"; }
export function isFactorEnabled(input: { option: MfaFactorOption; verifiedFactorTypes: string[] }): boolean {
  return canEnableFactor(input.option) && input.verifiedFactorTypes.includes("totp");
}
