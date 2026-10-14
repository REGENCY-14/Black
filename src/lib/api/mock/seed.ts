/**
 * Realistic seed data for the mock API.
 * Dates are relative to "now" so arrival windows and due dates always look current.
 * Demo order for tracking: ORD-DEMO01 with phone 024 123 4567 (or demo@example.com).
 */
import { businessRules } from "@/config";
import { images } from "@/config/images";
import { addDays, balanceDueDate } from "@/lib/dates";
import { computeDeposit } from "@/lib/money";
import { progressSteps } from "@/lib/status";
import type {
  Batch,
  Category,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  Product,
  ProgressStep,
  StaffUser,
  StatusEntry,
  VariantGroup,
} from "../types";

const DAY = 86_400_000;
const now = Date.now();
const daysFromNow = (d: number) => new Date(now + d * DAY).toISOString();

export const categories: Category[] = [
  { id: "c1", slug: "home-kitchen", name: "Home and kitchen", sortOrder: 1 },
  { id: "c2", slug: "beauty", name: "Beauty", sortOrder: 2 },
  { id: "c3", slug: "gadgets", name: "Gadgets", sortOrder: 3 },
  { id: "c4", slug: "fashion", name: "Fashion", sortOrder: 4 },
  { id: "c5", slug: "kids-toys", name: "Kids and toys", sortOrder: 5 },
];

export const batches: Batch[] = [
  {
    id: "b0",
    name: "Container 0 (September)",
    status: "arrived_in_ghana",
    expectedArrival: daysFromNow(-6),
    shippedAt: daysFromNow(-52),
    arrivedAt: daysFromNow(-6),
  },
  {
    id: "b1",
    name: "Container 1 (November)",
    status: "shipped_from_china",
    expectedArrival: daysFromNow(38),
    shippedAt: daysFromNow(-9),
  },
  { id: "b2", name: "Container 2 (December)", status: "sourcing", expectedArrival: daysFromNow(62) },
  { id: "b3", name: "Container 3 (January)", status: "sourcing", expectedArrival: daysFromNow(104) },
];

const sizes = (limit?: number): VariantGroup => ({
  id: "size",
  name: "Size",
  options: ["S", "M", "L", "XL"].map((s, i) => ({ id: s.toLowerCase(), label: s, ordered: 2 + i, limit })),
});
const colours = (labels: string[]): VariantGroup => ({
  id: "colour",
  name: "Colour",
  options: labels.map((l, i) => ({ id: l.toLowerCase(), label: l, ordered: 1 + i * 2 })),
});

// [name, category index, price in cedis, batch index (1-3), limit, ordered, variants, description]
type Row = [string, number, number, number, number, number, VariantGroup[], string];
const rows: Row[] = [
  [
    "Stainless steel air fryer, 6L",
    0,
    780,
    1,
    40,
    31,
    [colours(["Black", "White"])],
    "Digital air fryer with 8 presets and a dishwasher-safe basket. Cooks with up to 80% less oil.",
  ],
  [
    "Non-stick cookware set, 12 pieces",
    0,
    1150,
    2,
    30,
    12,
    [],
    "Twelve-piece granite-coated set with lids. Works on gas, electric and induction.",
  ],
  [
    "Electric kettle, 2L glass",
    0,
    210,
    1,
    60,
    44,
    [],
    "Borosilicate glass kettle with blue LED and auto shut-off.",
  ],
  [
    "Bamboo storage organiser set",
    0,
    165,
    2,
    50,
    9,
    [],
    "Four stackable bamboo trays for drawers, desks and bathrooms.",
  ],
  [
    "Vacuum insulated flask, 1L",
    0,
    140,
    1,
    80,
    58,
    [colours(["Teal", "Black", "Cream"])],
    "Keeps drinks hot for 12 hours and cold for 24. Leak-proof lid.",
  ],
  [
    "Hydrating face serum, 30ml",
    1,
    120,
    1,
    100,
    77,
    [],
    "Hyaluronic acid and vitamin B5 serum for daily use.",
  ],
  [
    "Silk satin pillowcase, 2 pack",
    1,
    95,
    2,
    80,
    21,
    [colours(["Champagne", "Black", "Rose"])],
    "Smooth satin pillowcases that are gentle on skin and hair.",
  ],
  [
    "Hair dryer, ionic 2200W",
    1,
    340,
    1,
    35,
    33,
    [],
    "Fast-drying ionic dryer with three heat settings and a concentrator nozzle.",
  ],
  ["Makeup brush set, 14 pieces", 1, 135, 2, 70, 14, [], "Soft synthetic bristles with a travel pouch."],
  [
    "LED vanity mirror",
    1,
    175,
    3,
    45,
    3,
    [],
    "Rechargeable mirror with three light modes and touch dimming.",
  ],
  [
    "Wireless earbuds, ANC",
    2,
    260,
    1,
    60,
    52,
    [colours(["Black", "White"])],
    "Active noise cancelling earbuds with 28 hours of battery in the case.",
  ],
  [
    "Smart watch, AMOLED",
    2,
    420,
    2,
    40,
    18,
    [colours(["Black", "Silver", "Rose gold"])],
    "Heart-rate, sleep tracking and calls on the wrist. Water resistant.",
  ],
  [
    "Power bank, 20,000mAh",
    2,
    230,
    1,
    90,
    61,
    [],
    "Fast charging with two USB-C ports and a digital display.",
  ],
  [
    "Ring light with tripod",
    2,
    190,
    3,
    50,
    4,
    [],
    "10-inch ring light with a 1.6m tripod and phone holder. Made for content creators.",
  ],
  [
    "Portable bluetooth speaker",
    2,
    185,
    2,
    70,
    27,
    [colours(["Black", "Blue"])],
    "Waterproof speaker with deep bass and 12 hours of play time.",
  ],
  [
    "Oversized cotton hoodie",
    3,
    210,
    2,
    60,
    22,
    [sizes(), colours(["Black", "Grey", "Cream"])],
    "Heavy 380gsm brushed cotton. Relaxed fit.",
  ],
  [
    "Linen shirt, short sleeve",
    3,
    165,
    3,
    50,
    5,
    [sizes(), colours(["White", "Sand"])],
    "Breathable linen blend for hot afternoons.",
  ],
  [
    "Leather crossbody bag",
    3,
    295,
    2,
    25,
    19,
    [colours(["Black", "Tan"])],
    "Compact bag with two compartments and an adjustable strap.",
  ],
  [
    "Running sneakers",
    3,
    380,
    1,
    40,
    36,
    [sizes(10), colours(["White", "Black"])],
    "Lightweight mesh trainers with a cushioned sole.",
  ],
  ["Ankara print midi dress", 3, 245, 3, 30, 2, [sizes()], "Modern cut in a bold wax-print cotton."],
  [
    "Building blocks set, 520 pieces",
    4,
    150,
    1,
    70,
    40,
    [],
    "Colourful bricks with a storage box. Ages 6 and up.",
  ],
  [
    "Kids tablet, 7-inch",
    4,
    360,
    2,
    30,
    15,
    [colours(["Blue", "Pink"])],
    "Parental controls, drop-proof case and 32GB storage.",
  ],
  ["Baby stroller, foldable", 4, 890, 3, 15, 6, [], "One-hand fold, sun canopy and a five-point harness."],
  ["Remote control car", 4, 175, 1, 60, 8, [], "2.4GHz off-road car with a rechargeable battery."],
];

const batchIds = ["b0", "b1", "b2", "b3"];

export const products: Product[] = rows.map(
  ([name, cat, cedis, batch, limit, ordered, variantGroups, description], i) => {
    const id = String(i + 1).padStart(2, "0");
    return {
      id: `p${id}`,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      name,
      description,
      priceMinor: cedis * 100,
      images: [
        { src: `/products/p${id}.${images.productExt}`, alt: `${name}, front` },
        { src: `/products/p${id}-b.${images.productExt}`, alt: `${name}, detail` },
      ],
      categoryId: categories[cat]!.id,
      availability: "preorder",
      batchId: batchIds[batch]!,
      variantGroups,
      limit,
      ordered,
      status: "published",
      createdAt: daysFromNow(-(rows.length - i) * 2),
    };
  },
);

/* ---------- orders ---------- */

function item(productIdx: number, quantity: number, variants: Record<string, string> = {}): OrderItem {
  const p = products[productIdx]!;
  return {
    productId: p.id,
    name: p.name,
    imageSrc: p.images[0]!.src,
    unitPriceMinor: p.priceMinor,
    quantity,
    variants,
  };
}

interface Spec {
  num: string;
  name: string;
  phone: string;
  email?: string;
  items: OrderItem[];
  batch: string;
  status: OrderStatus;
  step: ProgressStep;
  paid: "deposit" | "full" | "none";
  createdDaysAgo: number;
  note?: string;
  delayedUntilDays?: number;
  refund?: "pending" | "refunded";
  area?: string;
}

const specs: Spec[] = [
  {
    num: "DEMO01",
    name: "Ama Mensah",
    phone: "+233241234567",
    email: "demo@example.com",
    items: [item(0, 1, { Colour: "Black" }), item(4, 2, { Colour: "Teal" })],
    batch: "b1",
    status: "shipped_from_china",
    step: "shipped_from_china",
    paid: "deposit",
    createdDaysAgo: 14,
  },
  {
    num: "K4T9QX",
    name: "Kojo Boateng",
    phone: "+233551112233",
    items: [item(10, 1, { Colour: "White" })],
    batch: "b1",
    status: "confirmed",
    step: "confirmed",
    paid: "deposit",
    createdDaysAgo: 1,
  },
  {
    num: "M7P2LA",
    name: "Efua Owusu",
    phone: "+233201998877",
    items: [item(15, 1, { Size: "M", Colour: "Black" })],
    batch: "b2",
    status: "sourcing",
    step: "sourcing",
    paid: "deposit",
    createdDaysAgo: 5,
  },
  {
    num: "R3W8ZD",
    name: "Yaw Darko",
    phone: "+233271445566",
    email: "yaw@example.com",
    items: [item(18, 1, { Size: "L", Colour: "White" })],
    batch: "b1",
    status: "shipped_from_china",
    step: "shipped_from_china",
    paid: "full",
    createdDaysAgo: 18,
  },
  {
    num: "T5B1NH",
    name: "Akosua Adjei",
    phone: "+233541002003",
    items: [item(7, 1)],
    batch: "b1",
    status: "sourcing",
    step: "sourcing",
    paid: "deposit",
    createdDaysAgo: 8,
  },
  {
    num: "V9C6YE",
    name: "Nana Osei",
    phone: "+233501234000",
    items: [item(1, 1)],
    batch: "b2",
    status: "delayed",
    step: "sourcing",
    paid: "deposit",
    createdDaysAgo: 11,
    note: "The factory needs 10 more days to finish the cookware set. Your price stays the same.",
    delayedUntilDays: 72,
  },
  {
    num: "A2D7FJ",
    name: "Abena Frimpong",
    phone: "+233261778899",
    items: [item(20, 2)],
    batch: "b0",
    status: "arrived_in_ghana",
    step: "arrived_in_ghana",
    paid: "full",
    createdDaysAgo: 58,
  },
  {
    num: "B8E4GK",
    name: "Kwame Asante",
    phone: "+233246660011",
    items: [item(12, 1), item(14, 1, {})],
    batch: "b0",
    status: "out_for_delivery",
    step: "out_for_delivery",
    paid: "full",
    createdDaysAgo: 60,
    area: "Kumasi",
  },
  {
    num: "C1F5HM",
    name: "Esi Quaye",
    phone: "+233551230987",
    items: [item(5, 3)],
    batch: "b0",
    status: "delivered",
    step: "delivered",
    paid: "full",
    createdDaysAgo: 70,
  },
  {
    num: "D6G3JN",
    name: "Selorm Agbo",
    phone: "+233205554433",
    items: [item(11, 1, { Colour: "Black" })],
    batch: "b0",
    status: "delivered",
    step: "delivered",
    paid: "full",
    createdDaysAgo: 66,
  },
  {
    num: "E9H2KP",
    name: "Mariam Issah",
    phone: "+233279990000",
    items: [item(16, 1)],
    batch: "b3",
    status: "confirmed",
    step: "confirmed",
    paid: "deposit",
    createdDaysAgo: 0,
  },
  {
    num: "F4J8LQ",
    name: "Ibrahim Salifu",
    phone: "+233532221100",
    items: [item(17, 1, { Colour: "Black" })],
    batch: "b2",
    status: "cancelled",
    step: "confirmed",
    paid: "deposit",
    createdDaysAgo: 9,
    refund: "refunded",
  },
  {
    num: "G7K1MR",
    name: "Adwoa Boakye",
    phone: "+233246789012",
    items: [item(8, 2)],
    batch: "b2",
    status: "cancelled",
    step: "sourcing",
    paid: "deposit",
    createdDaysAgo: 6,
    refund: "pending",
  },
  {
    num: "H3L6NS",
    name: "Fiifi Mensah",
    phone: "+233203334455",
    items: [item(22, 1)],
    batch: "b3",
    status: "confirmed",
    step: "confirmed",
    paid: "none",
    createdDaysAgo: 0,
  },
  {
    num: "J5M9PT",
    name: "Gifty Ankrah",
    phone: "+233549876543",
    items: [item(2, 1), item(13, 1)],
    batch: "b1",
    status: "sourcing",
    step: "sourcing",
    paid: "deposit",
    createdDaysAgo: 12,
  },
  {
    num: "L2N4QU",
    name: "Kofi Annan Jr",
    phone: "+233571239870",
    items: [item(19, 1, { Size: "M" })],
    batch: "b3",
    status: "confirmed",
    step: "confirmed",
    paid: "full",
    createdDaysAgo: 2,
  },
];

function buildOrder(s: Spec, idx: number): Order {
  const batch = batches.find((b) => b.id === s.batch)!;
  const totalMinor = s.items.reduce((sum, it) => sum + it.unitPriceMinor * it.quantity, 0);
  const created = new Date(now - s.createdDaysAgo * DAY).toISOString();
  const paidMinor = s.paid === "full" ? totalMinor : s.paid === "deposit" ? computeDeposit(totalMinor) : 0;

  const history: StatusEntry[] = [];
  if (s.paid !== "none") {
    const upTo = progressSteps.indexOf(s.step);
    progressSteps.slice(0, upTo + 1).forEach((st, i) => {
      history.push({
        status: st,
        at: addDays(created, i * Math.max(1, Math.floor(s.createdDaysAgo / (upTo + 1)))),
      });
    });
  }
  if (s.status === "delayed") history.push({ status: "delayed", note: s.note, at: addDays(created, 4) });
  if (s.status === "cancelled")
    history.push({
      status: "cancelled",
      note: "Cancelled at the customer's request.",
      at: addDays(created, 3),
    });

  const payments: Payment[] =
    paidMinor > 0
      ? [
          {
            id: `pay-${idx}`,
            kind: s.paid === "full" ? "full" : "deposit",
            amountMinor: paidMinor,
            method: "mtn_momo",
            status: "success",
            reference: `PAY-SEED${idx}`,
            createdAt: created,
          },
        ]
      : [];

  return {
    id: `o${idx + 1}`,
    orderNumber: `ORD-${s.num}`,
    customer: {
      name: s.name,
      phone: s.phone,
      email: s.email,
      area: s.area ?? "Accra",
      address: "East Legon, near the main junction",
    },
    items: s.items,
    totalMinor,
    paidMinor,
    status: s.status,
    step: s.step,
    delayNote: s.status === "delayed" ? s.note : undefined,
    delayedUntil: s.delayedUntilDays ? daysFromNow(s.delayedUntilDays) : undefined,
    history,
    payments,
    batchId: batch.id,
    batchName: batch.name,
    expectedArrival: batch.expectedArrival,
    balanceDueDate: balanceDueDate(batch.expectedArrival, businessRules.balance.dueDaysBeforeArrival),
    refund: s.refund ? { status: s.refund, amountMinor: paidMinor } : undefined,
    createdAt: created,
  };
}

export function seedOrders(): Order[] {
  return specs.map(buildOrder);
}

/**
 * Admin logins for the mock. Owner: owner@example.com / owner123. Ghana staff: staff@example.com / staff123.
 * (Passwords are plain text here because this is a mock; the real backend hashes them.)
 */
export const seedStaff: (StaffUser & { password: string })[] = [
  {
    id: "u1",
    name: "Bawuah Nuru-deen",
    email: "owner@example.com",
    password: "owner123",
    role: "owner",
    active: true,
  },
  {
    id: "u2",
    name: "Kwesi Adomako",
    email: "staff@example.com",
    password: "staff123",
    role: "ghana_staff",
    active: true,
  },
];
