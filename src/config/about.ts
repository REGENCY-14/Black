/**
 * Copy for the About page. Everything here is a plain statement of how the store works, taken from
 * the client's own brief. Add the owner's story, years in business or team photos here when supplied.
 */
export const about = {
  headline: "We buy from the factory so you do not have to.",
  intro:
    "We find products at factories in China, ship them to Ghana in containers, and sell them to you at one clear price in cedis. You order before the goods land, pay in two steps if you like, and follow your order all the way to your door.",
  principles: [
    {
      title: "One price, no surprises",
      text: "The price you see includes shipping from China and import duty. Delivery inside Ghana is arranged directly with the rider.",
    },
    {
      title: "Pay in two steps",
      text: "Pay a deposit to lock your price, then pay the balance before the container arrives. Or pay in full and be done.",
    },
    {
      title: "See where your order is",
      text: "Every order has a number. Enter it with your phone or email to see each step, and get updates on WhatsApp.",
    },
    {
      title: "Real people, real deliveries",
      text: "We post photos of orders we have delivered. You can message us on WhatsApp or call at any time.",
    },
  ],
} as const;
