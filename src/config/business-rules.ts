/** Business rules from client-decisions.docx. Change here, nowhere else. */
export const businessRules = {
  deposit: { percent: 70 },
  balance: {
    /** Balance is due this many days before the container arrives in Ghana. */
    dueDaysBeforeArrival: 14,
    /** Unpaid balance policy (Q5-A): cancelled after this many days, deposit kept. */
    unpaidCancelAfterDays: 14,
  },
  payment: {
    /** How long the UI waits for a customer to approve a MoMo prompt before offering retry. */
    momoApprovalTimeoutSeconds: 90,
  },
  timezone: "Africa/Accra",
  currency: "GHS",
  /** Price includes shipping from China and duty (Q1-A). */
  priceIncludesShippingAndDuty: true,
  /** Price locks once the deposit is paid (Q2-A). */
  priceLockedOnDeposit: true,
} as const;
