export const contact = {
  phones: [
    { label: "Ghana", display: "+233 59 886 3540", e164: "+233598863540" },
    { label: "China", display: "+86 190 5725 6153", e164: "+8619057256153" },
  ],
  whatsapp: "https://wa.me/233598863540",
  /** Email is not supplied yet. Hidden everywhere while empty. */
  email: "",
} as const;

export function whatsappLink(message?: string): string {
  return message ? `${contact.whatsapp}?text=${encodeURIComponent(message)}` : contact.whatsapp;
}
