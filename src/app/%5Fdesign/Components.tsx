"use client";

import { Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { Card, CardMedia, Key, TwoTone } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, PhoneInput, Textarea } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stepper } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toast";
import { FloatingPill, Tooltip } from "@/components/ui/Tooltip";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`c-${title}`}>
      <h2 id={`c-${title}`} className="text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const people = [
  { name: "Ama Mensah" },
  { name: "Kojo Boateng" },
  { name: "Efua Owusu" },
  { name: "Yaw Darko" },
];

export function Components() {
  const [seg, setSeg] = useState("all");
  const [qty, setQty] = useState(1);
  const [sheet, setSheet] = useState(false);
  const [network, setNetwork] = useState("mtn");
  const { toast } = useToast();

  return (
    <div className="flex flex-col gap-10">
      <Section title="Buttons">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
          <Button block="responsive" size="lg">
            Preorder
          </Button>
          <Button block="responsive" size="lg" variant="accent">
            Pay GH₵ 420 now
          </Button>
          <Button block="responsive" variant="secondary">
            Secondary
          </Button>
          <Button block="responsive" variant="ghost">
            Ghost
          </Button>
          <Button block="responsive" variant="destructive" size="sm">
            Cancel order
          </Button>
          <Button block="responsive" variant="whatsapp">
            Ask on WhatsApp
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small (44px hit)</Button>
          <IconButton aria-label="Delete" icon={<Trash2 className="size-5" aria-hidden />} />
          <Button
            variant="secondary"
            onClick={() => toast({ title: "Copied order number", tone: "success" })}
          >
            Show toast
          </Button>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-2">
          <Card size="lg" as="article">
            <CardMedia ratio="aspect-[16/10]" className="bg-hero" />
            <div className="px-1 pt-4 pb-2">
              <TwoTone className="text-xl">
                Pay <Key>70% now</Key>, the rest <Key>two weeks before</Key> it lands.
              </TwoTone>
            </div>
          </Card>
          <div className="grid grid-cols-2 content-start items-start gap-4">
            <Card className="flex flex-col gap-1">
              <p className="text-sm text-fg-muted">Next container</p>
              <p className="text-3xl font-semibold">14 Dec</p>
              <p className="text-sm text-fg-muted">Arrives in Ghana</p>
            </Card>
            <Card className="flex flex-col gap-3">
              <AvatarStack people={people} total={27} />
              <p className="text-sm font-medium">27 preorders</p>
            </Card>
          </div>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge icon={<ShoppingBag />}>Preorder</Badge>
          <Badge tone="success">Delivered</Badge>
          <Badge tone="warning">Delayed</Badge>
          <Badge tone="danger">12 spots left</Badge>
          <Badge tone="info" icon={<Truck />}>
            Shipped
          </Badge>
        </div>
      </Section>

      <Section title="Form fields">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <Input autoComplete="name" placeholder="Ama Mensah" />
          </Field>
          <Field label="Phone" hint="We send order updates on WhatsApp.">
            <PhoneInput />
          </Field>
          <Field label="Email" optional>
            <Input type="email" inputMode="email" autoComplete="email" />
          </Field>
          <Field label="Phone with error" error="Enter a Ghana number, for example 024 000 0000.">
            <PhoneInput defaultValue="12" />
          </Field>
          <Field label="Mobile money network">
            <Select
              value={network}
              onValueChange={setNetwork}
              options={[
                { value: "mtn", label: "MTN MoMo" },
                { value: "telecel", label: "Telecel Cash" },
                { value: "at", label: "AirtelTigo Money" },
              ]}
            />
          </Field>
          <Field label="Delivery notes" optional>
            <Textarea />
          </Field>
        </div>
      </Section>

      <Section title="Segmented tabs, stepper, avatars">
        <div className="flex flex-wrap items-center gap-4">
          <SegmentedControl
            aria-label="Category"
            value={seg}
            onValueChange={setSeg}
            items={[
              { value: "all", label: "All", count: 24 },
              { value: "home", label: "Home" },
              { value: "beauty", label: "Beauty" },
              { value: "tech", label: "Gadgets" },
              { value: "fashion", label: "Fashion" },
            ]}
          />
          <Stepper value={qty} onChange={setQty} max={12} />
          <AvatarStack people={people} total={27} />
        </div>
      </Section>

      <Section title="Tooltip, floating pill, sheet">
        <div className="flex flex-wrap items-center gap-3">
          <Tooltip content="Add user">
            <IconButton aria-label="Add user" icon={<Plus className="size-5" aria-hidden />} />
          </Tooltip>
          <FloatingPill href="#">Send request</FloatingPill>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Open sheet
          </Button>
        </div>
        <Sheet
          open={sheet}
          onOpenChange={setSheet}
          title="Advance batch"
          description="14 customers will be notified on WhatsApp."
          footer={
            <Button block="always" size="lg" onClick={() => setSheet(false)}>
              Confirm
            </Button>
          }
        >
          <p className="text-fg-secondary">Move the whole batch to Arrived in Ghana.</p>
        </Sheet>
      </Section>

      <Section title="Skeleton">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[4/5] rounded-card" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
