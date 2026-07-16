import { LegalPage } from "@/components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These Terms explain the rules for using ClientPilot AI."
      sections={[
        {
          title: "Use of the service",
          body: [
            "ClientPilot AI is a SaaS platform for managing clients, meetings, summaries, proposals, tasks, and follow-ups.",
            "You agree to use the service lawfully and not to misuse, copy, attack, resell, or interfere with the platform."
          ]
        },
        {
          title: "Accounts",
          body: [
            "You are responsible for keeping your login details secure.",
            "You must provide accurate information when creating an account or subscribing to a plan."
          ]
        },
        {
          title: "User content",
          body: [
            "You remain responsible for the information, client data, meeting notes, files, and business content you upload.",
            "You confirm that you have permission to upload and process any client or business information you add to the platform."
          ]
        },
        {
          title: "AI outputs",
          body: [
            "AI-generated summaries, tasks, proposals, and recommendations may contain mistakes.",
            "You should review all AI output before sending it to clients or using it for business decisions."
          ]
        },
        {
          title: "Subscriptions",
          body: [
            "Paid plans may include limits such as monthly meeting uploads, users, and features.",
            "Subscription payments are processed by third-party payment providers. Access may be limited if payment fails, is cancelled, or is refunded."
          ]
        },
        {
          title: "Limitation of liability",
          body: [
            "ClientPilot AI is provided as a productivity tool. We are not responsible for business losses, lost revenue, client disputes, or decisions made based on platform output.",
            "Use the platform at your own discretion and review important information before relying on it."
          ]
        },
        {
          title: "Contact",
          body: [
            "For questions about these Terms, contact info@makzora.com."
          ]
        }
      ]}
    />
  );
}