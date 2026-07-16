import { LegalPage } from "@/components/LegalPage";

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="This Refund Policy explains how subscription refunds are handled for ClientPilot AI."
      sections={[
        {
          title: "Subscription payments",
          body: [
            "ClientPilot AI is sold as a monthly software subscription.",
            "Customers are responsible for reviewing the plan, features, and price before subscribing."
          ]
        },
        {
          title: "Refund requests",
          body: [
            "Refund requests may be reviewed on a case-by-case basis.",
            "To request a refund, contact info@makzora.com with your account email, plan name, payment date, and reason for the request."
          ]
        },
        {
          title: "Non-refundable situations",
          body: [
            "Refunds may not be available after substantial use of the service, repeated usage, abuse, or if the request is made after the billing period has passed.",
            "Partial refunds are not guaranteed."
          ]
        },
        {
          title: "Cancellations",
          body: [
            "You may cancel your subscription to avoid future renewal charges.",
            "Cancelling a subscription does not automatically refund past payments."
          ]
        },
        {
          title: "Payment provider",
          body: [
            "Refunds, when approved, may be processed through the original payment provider and may take time to appear depending on the bank or card provider."
          ]
        }
      ]}
    />
  );
}