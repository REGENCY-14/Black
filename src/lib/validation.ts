import { z } from "zod";
import { features } from "@/config";
import { isValidGhPhone } from "@/lib/phone";

/** GhanaPost GPS digital address, for example GA-123-4567. */
export const ghanaPostGpsPattern = /^[A-Za-z]{2,3}-?\d{3,4}-?\d{4}$/;

export const paymentMethods = ["mtn_momo", "telecel_cash", "airteltigo_money", "card"] as const;

export const checkoutSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name."),
    phone: z.string().refine(isValidGhPhone, "Enter a Ghana mobile number, for example 024 123 4567."),
    email: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || z.email().safeParse(v).success,
        "Enter a valid email address, or leave it empty.",
      ),
    fulfilment: z.enum(["delivery", "pickup"]),
    area: z.string(),
    address: z.string().trim(),
    ghanaPostGps: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || ghanaPostGpsPattern.test(v),
        "Use the format GA-123-4567, or leave it empty.",
      ),
    plan: z.enum(["deposit", "full"]),
    method: z.enum(paymentMethods, { error: "Choose how you want to pay." }),
    momoPhone: z.string(),
    terms: z.boolean().refine((v) => v === true, "Accept the terms to continue."),
  })
  // Cross-field rules. Zod skips object-level checks once any field has failed, so `when` forces them
  // to run: the customer should see every problem at once, not one after another.
  .refine((v) => v.fulfilment !== "delivery" || v.area.length > 0, {
    path: ["area"],
    message: "Choose your delivery area.",
    when: () => true,
  })
  .refine((v) => v.fulfilment !== "delivery" || v.address.length >= 5, {
    path: ["address"],
    message: "Enter an address the rider can find.",
    when: () => true,
  })
  .refine((v) => v.method === "card" || isValidGhPhone(v.momoPhone), {
    path: ["momoPhone"],
    message: "Enter the Mobile Money number that will pay, for example 024 123 4567.",
    when: () => true,
  });

export type CheckoutValues = z.infer<typeof checkoutSchema>;

/** Which fields belong to each checkout step (used to validate step by step on mobile). */
export const stepFields: (keyof CheckoutValues)[][] = [
  [
    "name",
    "phone",
    "email",
    "fulfilment",
    "area",
    "address",
    ...(features.ghanaPostGps ? (["ghanaPostGps"] as const) : []),
  ],
  ["plan"],
  ["method", "momoPhone"],
  ["terms"],
];

export const stepTitles = ["Your details", "Payment plan", "Payment method", "Review and pay"];
