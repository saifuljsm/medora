export default function TermsPage() {
  return (
    <div className="max-w-2xl pt-4 text-foreground lg:px-0 lg:pt-6">
      <h1 className="text-lg font-bold">Terms of Service</h1>
      <p className="text-xs text-muted-foreground">Last updated {new Date().toLocaleDateString("en-BD", { dateStyle: "long" })}</p>

      <h2 className="mt-5 text-sm font-bold">Ordering</h2>
      <p className="text-sm text-muted-foreground">
        You can order as a guest or by signing in with your phone number. Placing an order does not guarantee
        fulfilment — we call every order to confirm before we pack it, and reserve the right to cancel an order (with
        a full refund of anything paid) if an item is unavailable or a prescription cannot be verified.
      </p>

      <h2 className="mt-5 text-sm font-bold">Prescription items</h2>
      <p className="text-sm text-muted-foreground">
        Medicines marked as prescription-required can only be sold after a licensed pharmacist reviews and approves
        a valid prescription. We may reject an order or item if the prescription is unclear, expired, or doesn&apos;t
        match what was ordered.
      </p>

      <h2 className="mt-5 text-sm font-bold">Payment and delivery</h2>
      <p className="text-sm text-muted-foreground">
        We currently accept Cash on Delivery only. Delivery fees and estimated timing are shown at checkout before
        you place your order.
      </p>

      <h2 className="mt-5 text-sm font-bold">Pricing and availability</h2>
      <p className="text-sm text-muted-foreground">
        Prices and stock levels can change. If something you ordered becomes unavailable after you place your order,
        we&apos;ll contact you before dispatch to adjust or cancel that item.
      </p>

      <h2 className="mt-5 text-sm font-bold">Contact us</h2>
      <p className="text-sm text-muted-foreground">
        For any question about an order, call or WhatsApp us using the number in the footer below.
      </p>
    </div>
  );
}
