import { LegalPage } from "@/components/LegalPage";

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact"
      intro="Contact ClientPilot AI for support, billing questions, product questions, and account help."
      sections={[
        {
          title: "Support email",
          body: [
            "Email: info@makzora.com",
            "Please include your account email, plan name, and a clear description of the issue."
          ]
        },
        {
          title: "Billing support",
          body: [
            "For subscription or payment questions, include the email used during checkout and the plan you purchased.",
            "Never send card numbers, passwords, API keys, or private credentials by email."
          ]
        },
        {
          title: "Response time",
          body: [
            "We aim to respond as soon as possible. Response times may vary during weekends, holidays, or high workload."
          ]
        }
      ]}
    />
  );
}