/** UI acknowledgment only; neither proof of legal consent nor a stored record. */
export function canSubmitAccountForm(mode: "login" | "signup" | "forgot", acknowledged: boolean): boolean {
  return mode !== "signup" || acknowledged;
}