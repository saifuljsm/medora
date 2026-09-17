export default function ReturnPolicyPage() {
  return (
    <div className="max-w-2xl pt-4 text-foreground lg:px-0 lg:pt-6">
      <h1 className="text-lg font-bold">Return &amp; Refund Policy</h1>
      <p className="text-xs text-muted-foreground">Last updated {new Date().toLocaleDateString("en-BD", { dateStyle: "long" })}</p>

      <h2 className="mt-5 text-sm font-bold">Wrong or damaged items</h2>
      <p className="text-sm text-muted-foreground">
        If you receive the wrong item, a damaged item, or something missing from your order, contact us as soon as
        possible with your invoice number and we&apos;ll arrange a replacement or refund.
      </p>

      <h2 className="mt-5 text-sm font-bold">Medicine returns</h2>
      <p className="text-sm text-muted-foreground">
        For safety, we can only accept returns of unopened, unexpired medicine in its original packaging. Opened
        medicine or items past their expiry date cannot be returned or exchanged.
      </p>

      <h2 className="mt-5 text-sm font-bold">Refunds</h2>
      <p className="text-sm text-muted-foreground">
        Approved refunds are issued in cash, to your mobile banking account, or as store credit, depending on what
        works for you and how the original order was paid. Refunds are processed once the returned item is received
        and checked.
      </p>

      <h2 className="mt-5 text-sm font-bold">Contact us</h2>
      <p className="text-sm text-muted-foreground">
        To start a return, call or WhatsApp us using the number in the footer below with your invoice number.
      </p>
    </div>
  );
}
