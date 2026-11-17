export const NOTICES: Record<string, string> = {
  "account-created": "Account created. Sign in to continue.",
  "mock-ready": "Stripe keys are not configured. Use the local mock below. No card is charged.",
  "mock-pro": "Pro is active in the local mock. No card was charged.",
  "mock-free": "The workspace is back on the Free plan. No card was charged.",
  "checkout-success":
    "Stripe sent the browser back. The plan changes when the test webhook is accepted.",
  "checkout-cancel": "Stripe checkout was canceled. The plan was not changed.",
};

export function noticeMessage(code: string | undefined): string | null {
  if (!code) return null;
  return NOTICES[code] ?? null;
}
