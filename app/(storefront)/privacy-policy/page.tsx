export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl pt-4 text-foreground lg:px-0 lg:pt-6">
      <h1 className="text-lg font-bold">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground">Last updated {new Date().toLocaleDateString("en-BD", { dateStyle: "long" })}</p>

      <h2 className="mt-5 text-sm font-bold">What we collect</h2>
      <p className="text-sm text-muted-foreground">
        To place an order, we collect your name, phone number, delivery address, and the items you order. If you sign
        in, your phone number is verified by a one-time code sent via SMS — we never ask for or store a password for
        customer accounts. If you upload a prescription, we store the photo you provide so our pharmacist can review
        it.
      </p>

      <h2 className="mt-5 text-sm font-bold">How we use it</h2>
      <p className="text-sm text-muted-foreground">
        Your information is used only to fulfil and deliver your order, verify prescription-required items with a
        licensed pharmacist, and contact you about that order (including a call to confirm before dispatch). We do
        not sell or share your information with third parties for marketing purposes.
      </p>

      <h2 className="mt-5 text-sm font-bold">Payment</h2>
      <p className="text-sm text-muted-foreground">
        We currently accept Cash on Delivery only — we do not collect or store any card or banking details.
      </p>

      <h2 className="mt-5 text-sm font-bold">Data storage</h2>
      <p className="text-sm text-muted-foreground">
        Order and account data is stored securely. Prescription photos are stored in access-controlled cloud storage
        and are only viewed by our pharmacist for the purpose of approving your order.
      </p>

      <h2 className="mt-5 text-sm font-bold">Contact us</h2>
      <p className="text-sm text-muted-foreground">
        For any question about your data, call or WhatsApp us using the number in the footer below.
      </p>
    </div>
  );
}
