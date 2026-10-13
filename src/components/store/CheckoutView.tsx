"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CreditCard, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { Controller, useForm, useWatch, type Control, type FieldErrors } from "react-hook-form";
import { BottomBar } from "@/components/layout/BottomBar";
import { OrderSummary } from "@/components/store/OrderSummary";
import { PaymentFlow } from "@/components/store/PaymentFlow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, PhoneInput, Textarea } from "@/components/ui/Input";
import { RadioCard } from "@/components/ui/RadioCard";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { businessRules, contact, features } from "@/config";
import { deliveryAreas, deliveryNote } from "@/config/delivery";
import { useBatches, useCreateOrder } from "@/hooks/api";
import { useCartLines } from "@/hooks/useHydrated";
import { ApiError, type Order, type PaymentMethod, type StartPaymentInput } from "@/lib/api/types";
import { canPayDeposit, groupCart, totalsFor } from "@/lib/checkout";
import { formatDate } from "@/lib/dates";
import { saveLastCheckout } from "@/lib/lastCheckout";
import { computeDeposit, formatGHS, sumPesewas } from "@/lib/money";
import { detectNetwork, normalizeGhPhone, type MomoNetwork } from "@/lib/phone";
import { stepFields, stepTitles, checkoutSchema, type CheckoutValues } from "@/lib/validation";
import { useCart } from "@/stores/cart";

const methodForNetwork: Record<MomoNetwork, PaymentMethod> = {
  mtn: "mtn_momo",
  telecel: "telecel_cash",
  airteltigo: "airteltigo_money",
};
const networkForMethod: Partial<Record<PaymentMethod, MomoNetwork>> = {
  mtn_momo: "mtn",
  telecel_cash: "telecel",
  airteltigo_money: "airteltigo",
};
const networkNames: Record<MomoNetwork, string> = {
  mtn: "MTN",
  telecel: "Telecel",
  airteltigo: "AirtelTigo",
};

const methodOptions: { value: PaymentMethod; label: string; description: string }[] = [
  { value: "mtn_momo", label: "MTN MoMo", description: "Approve a prompt on your phone." },
  { value: "telecel_cash", label: "Telecel Cash", description: "Approve a prompt on your phone." },
  { value: "airteltigo_money", label: "AirtelTigo Money", description: "Approve a prompt on your phone." },
  { value: "card", label: "Card", description: "Visa or Mastercard, entered on the secure payment page." },
];

const sectionClass = "flex flex-col gap-5";

/** Controller wrapper that forwards the id and aria props Field injects onto the real select trigger. */
function AreaSelect({
  control,
  ...aria
}: { control: Control<CheckoutValues> } & Partial<ComponentProps<typeof Select>>) {
  return (
    <Controller
      control={control}
      name="area"
      render={({ field }) => (
        <Select
          {...aria}
          value={field.value}
          onValueChange={field.onChange}
          placeholder="Choose your area"
          options={deliveryAreas.map((a) => ({ value: a, label: a }))}
        />
      )}
    />
  );
}

export function CheckoutView() {
  const router = useRouter();
  const clearCart = useCart((s) => s.clear);
  const { lines, hydrated } = useCartLines();
  const batches = useBatches();
  const createOrder = useCreateOrder();

  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<Order[] | null>(null);
  const [payment, setPayment] = useState<{ input: StartPaymentInput; attempt: number } | null>(null);
  const [done, setDone] = useState(false);
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  const mounted = useRef(false);
  // Real user choices. (RHF's dirtyFields reports an untouched radio group as dirty, so it cannot be used.)
  const [methodChosen, setMethodChosen] = useState(false);
  const [momoEdited, setMomoEdited] = useState(false);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      fulfilment: "delivery",
      area: "",
      address: "",
      ghanaPostGps: "",
      plan: "deposit",
      method: undefined,
      momoPhone: "",
      terms: false,
    },
  });
  const { register, control, setValue, trigger, handleSubmit, formState } = form;
  const { errors } = formState;
  const [phone, momoPhone, method, plan, fulfilment] = useWatch({
    control,
    name: ["phone", "momoPhone", "method", "plan", "fulfilment"],
  });

  const groups = useMemo(() => groupCart(lines, batches.data ?? []), [lines, batches.data]);
  const depositOk = canPayDeposit(groups);
  const effectivePlan = depositOk ? plan : "full";
  const totals = totalsFor(groups, effectivePlan);

  // Preselect the MoMo network from the phone number, and default the wallet to the same number.
  useEffect(() => {
    const net = detectNetwork(phone);
    if (net && !methodChosen) setValue("method", methodForNetwork[net]);
    if (!momoEdited) setValue("momoPhone", phone);
  }, [phone, methodChosen, momoEdited, setValue]);

  useEffect(() => {
    if (!depositOk && plan !== "full") setValue("plan", "full");
  }, [depositOk, plan, setValue]);

  // Move keyboard and screen-reader focus to the new step's heading.
  useEffect(() => {
    if (mounted.current) headings.current[step]?.focus();
    mounted.current = true;
  }, [step]);

  if (done) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Taking you to your confirmation">
        <Skeleton className="h-40 rounded-card" />
      </div>
    );
  }

  if (!hydrated || (lines.length > 0 && batches.isPending)) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading checkout">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    );
  }

  if (lines.length === 0 || groups.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6 md:p-8">
        <span className="inline-flex size-12 items-center justify-center rounded-pill bg-subtle" aria-hidden>
          <ShoppingBag className="size-6 text-fg-secondary" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Nothing to check out yet</h2>
          <p className="text-fg-secondary">Add something to your cart first.</p>
        </div>
        <Button asChild size="lg" block="responsive">
          <Link href="/shop">Browse preorders</Link>
        </Button>
      </Card>
    );
  }

  const lastStep = stepTitles.length - 1;

  const next = async () => {
    if (await trigger(stepFields[step])) setStep((s) => Math.min(lastStep, s + 1));
  };

  const onInvalid = (errs: FieldErrors<CheckoutValues>) => {
    const firstBad = stepFields.findIndex((fields) => fields.some((f) => errs[f]));
    if (firstBad >= 0) setStep(firstBad);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const customerPhone = normalizeGhPhone(values.phone)!;
    try {
      let orders = created;
      if (!orders) {
        const res = await createOrder.mutateAsync({
          plan: effectivePlan,
          customer: {
            name: values.name.trim(),
            phone: customerPhone,
            email: values.email.trim() || undefined,
            area: values.fulfilment === "pickup" ? "Pickup" : values.area,
            address: values.fulfilment === "pickup" ? "Pickup" : values.address.trim(),
            ghanaPostGps: values.ghanaPostGps.trim() || undefined,
          },
          lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, variants: l.variants })),
        });
        orders = res.orders;
        setCreated(orders);
      }
      const kind = effectivePlan === "full" ? "full" : "deposit";
      const amountMinor =
        kind === "full"
          ? sumPesewas(orders.map((o) => o.totalMinor - o.paidMinor))
          : sumPesewas(orders.map((o) => (o.paidMinor > 0 ? 0 : computeDeposit(o.totalMinor))));
      const wallet = values.method === "card" ? undefined : normalizeGhPhone(values.momoPhone)!;
      setPayment({
        attempt: (payment?.attempt ?? 0) + 1,
        input: {
          orderIds: orders.map((o) => o.id),
          amountMinor,
          kind,
          method: values.method,
          phone: wallet,
          network: networkForMethod[values.method],
        },
      });
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
  }, onInvalid);

  if (payment && created) {
    return (
      <PaymentFlow
        key={payment.attempt}
        input={payment.input}
        onChangeMethod={() => {
          setPayment(null);
          setStep(2);
        }}
        onSuccess={() => {
          saveLastCheckout({
            orders: created.map((o) => ({ orderNumber: o.orderNumber })),
            contact: normalizeGhPhone(form.getValues("phone"))!,
            plan: effectivePlan,
          });
          setDone(true);
          clearCart();
          router.replace("/checkout/success");
        }}
      />
    );
  }

  const show = (i: number) => (step === i ? "" : "hidden lg:flex");
  const detectedNetwork = detectNetwork(momoPhone);
  const chosenNetwork = method ? networkForMethod[method] : undefined;
  const mismatch = detectedNetwork && chosenNetwork && detectedNetwork !== chosenNetwork;
  const payLabel = `Pay ${formatGHS(totals.dueNowMinor)}`;

  const heading = (i: number) => (
    <h2
      ref={(el) => {
        headings.current[i] = el;
      }}
      tabIndex={-1}
      className="text-lg font-semibold outline-none"
    >
      <span
        className="mr-2 inline-flex size-7 items-center justify-center rounded-pill bg-primary text-sm text-primary-fg"
        aria-hidden
      >
        {i + 1}
      </span>
      {stepTitles[i]}
    </h2>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
      <div className="flex flex-col gap-4">
        {/* mobile progress */}
        <div
          className="flex flex-col gap-2 lg:hidden"
          aria-label={`Step ${step + 1} of ${stepTitles.length}`}
        >
          <div className="flex gap-1.5" aria-hidden>
            {stepTitles.map((t, i) => (
              <span
                key={t}
                className={`h-1.5 flex-1 rounded-pill ${i <= step ? "bg-accent" : "bg-subtle"}`}
              />
            ))}
          </div>
          <p className="text-sm text-fg-muted">
            Step {step + 1} of {stepTitles.length}
          </p>
        </div>

        {/* 1. details */}
        <Card as="section" className={`${sectionClass} ${show(0)}`} aria-label={stepTitles[0]}>
          {heading(0)}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name" error={errors.name?.message} className="md:col-span-2">
              <Input autoComplete="name" {...register("name")} />
            </Field>
            <Field
              label="Phone number"
              hint="We send order updates here on WhatsApp."
              error={errors.phone?.message}
            >
              <PhoneInput autoComplete="tel-national" {...register("phone")} />
            </Field>
            <Field label="Email" optional error={errors.email?.message}>
              <Input type="email" inputMode="email" autoComplete="email" {...register("email")} />
            </Field>

            {features.pickup && (
              <fieldset className="flex flex-col gap-2 md:col-span-2">
                <legend className="mb-1 text-sm font-medium">How do you want to get your order?</legend>
                <RadioCard
                  value="delivery"
                  label="Delivery"
                  description={deliveryNote}
                  {...register("fulfilment")}
                />
                <RadioCard
                  value="pickup"
                  label="Pick up"
                  description="We confirm the pickup location on WhatsApp."
                  {...register("fulfilment")}
                />
              </fieldset>
            )}

            {fulfilment === "delivery" && (
              <>
                <Field label="Delivery area" error={errors.area?.message}>
                  <AreaSelect control={control} />
                </Field>
                {features.ghanaPostGps && (
                  <Field
                    label="GhanaPost GPS address"
                    optional
                    hint="For example GA-123-4567."
                    error={errors.ghanaPostGps?.message}
                  >
                    <Input autoCapitalize="characters" autoComplete="off" {...register("ghanaPostGps")} />
                  </Field>
                )}
                <Field label="Address and landmark" error={errors.address?.message} className="md:col-span-2">
                  <Textarea rows={3} autoComplete="street-address" {...register("address")} />
                </Field>
              </>
            )}
          </div>
          <p className="text-sm text-fg-muted">{deliveryNote}</p>
        </Card>

        {/* 2. plan */}
        <Card as="section" className={`${sectionClass} ${show(1)}`} aria-label={stepTitles[1]}>
          {heading(1)}
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Payment plan</legend>
            <RadioCard
              value="deposit"
              disabled={!depositOk}
              label={`Pay ${businessRules.deposit.percent}% now`}
              trailing={formatGHS(totalsFor(groups, "deposit").dueNowMinor)}
              description={
                depositOk
                  ? groups
                      .map(
                        (g) =>
                          `${formatGHS(g.balanceMinor)} balance due ${formatDate(g.balanceDueDate)}${groups.length > 1 ? ` (order ${groups.indexOf(g) + 1})` : ""}`,
                      )
                      .join(". ")
                  : "Not available: the balance date for an item in your cart has passed."
              }
              {...register("plan")}
            />
            <RadioCard
              value="full"
              label="Pay in full"
              trailing={formatGHS(totalsFor(groups, "full").dueNowMinor)}
              description="Nothing left to pay later."
              {...register("plan")}
            />
          </fieldset>
          <p className="text-sm text-fg-muted">
            Balance is due {businessRules.balance.dueDaysBeforeArrival} days before your container arrives in
            Ghana. Your price is locked once your deposit is paid.
          </p>
        </Card>

        {/* 3. method */}
        <Card as="section" className={`${sectionClass} ${show(2)}`} aria-label={stepTitles[2]}>
          {heading(2)}
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Payment method</legend>
            {methodOptions.map((m) => (
              <RadioCard
                key={m.value}
                value={m.value}
                label={m.label}
                description={m.description}
                {...register("method", { onChange: () => setMethodChosen(true) })}
              />
            ))}
          </fieldset>
          {errors.method && (
            <p role="alert" className="text-sm text-danger">
              {errors.method.message}
            </p>
          )}
          {method && method !== "card" && (
            <Field
              label="Mobile Money number"
              hint={
                mismatch
                  ? `This looks like a ${networkNames[detectedNetwork!]} number. Change the network above if that is wrong.`
                  : "You will approve the payment on this number."
              }
              error={errors.momoPhone?.message}
            >
              <PhoneInput
                autoComplete="off"
                {...register("momoPhone", { onChange: () => setMomoEdited(true) })}
              />
            </Field>
          )}
          {method === "card" && (
            <p className="flex items-start gap-2 text-sm text-fg-secondary">
              <CreditCard className="mt-0.5 size-4 shrink-0" aria-hidden /> Card details are entered with our
              payment provider. We never see or store your card number.
            </p>
          )}
        </Card>

        {/* 4. review */}
        <Card as="section" className={`${sectionClass} ${show(3)}`} aria-label={stepTitles[3]}>
          {heading(3)}
          <div className="lg:hidden">
            <OrderSummary groups={groups} plan={effectivePlan} />
          </div>
          <div className="hidden text-sm text-fg-secondary lg:block">
            Check the summary on the right, then accept the terms and pay.
          </div>

          <div className="flex flex-col gap-1">
            <label className="flex min-h-hit cursor-pointer items-start gap-3 py-2">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-accent"
                aria-invalid={errors.terms ? true : undefined}
                {...register("terms")}
              />
              <span className="text-sm">
                I accept the{" "}
                <Link href="/policies/terms" target="_blank" className="font-medium underline">
                  Terms of sale
                </Link>{" "}
                and the{" "}
                <Link href="/policies/refunds" target="_blank" className="font-medium underline">
                  Refund and cancellation policy
                </Link>
                .
              </span>
            </label>
            {errors.terms && (
              <p role="alert" className="text-sm text-danger">
                {errors.terms.message}
              </p>
            )}
          </div>

          {submitError && (
            <p role="alert" className="rounded-card bg-danger-soft p-4 text-sm text-danger">
              {submitError}
            </p>
          )}

          <p className="text-sm text-fg-muted">
            You will get order updates on WhatsApp. Questions? Call {contact.phones[0].display}.
          </p>

          <Button
            type="submit"
            size="lg"
            loading={formState.isSubmitting}
            className="hidden lg:inline-flex"
            variant="accent"
          >
            {payLabel}
          </Button>
        </Card>
      </div>

      {/* desktop summary */}
      <Card
        as="aside"
        aria-label="Order summary"
        className="hidden lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-4"
      >
        <h2 className="text-lg font-semibold">Order summary</h2>
        <OrderSummary groups={groups} plan={effectivePlan} />
      </Card>

      {/* mobile step actions */}
      <BottomBar showOnDesktop className="lg:hidden">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button variant="secondary" size="lg" aria-label="Back" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-5" aria-hidden />
            </Button>
          )}
          {step < lastStep ? (
            <Button size="lg" block="always" onClick={next}>
              Continue <ArrowRight className="size-5" aria-hidden />
            </Button>
          ) : (
            <Button type="submit" size="lg" variant="accent" block="always" loading={formState.isSubmitting}>
              {payLabel}
            </Button>
          )}
        </div>
      </BottomBar>
    </form>
  );
}
