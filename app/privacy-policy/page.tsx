import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This Privacy Policy explains how ClientPilot AI handles account, workspace, client, meeting, and billing-related information."
      sections={[
        {
          title: "Information we collect",
          body: [
            "We may collect account information such as your name, email address, login details, business profile, uploaded logo, client records, meeting notes, transcripts, proposals, and subscription information.",
            "We collect information that you enter into the platform or upload while using ClientPilot AI."
          ]
        },
        {
          title: "How we use information",
          body: [
            "We use your information to provide the ClientPilot AI service, manage your workspace, generate meeting summaries, create proposals, process subscriptions, improve the product, and provide support.",
            "We do not sell your personal information."
          ]
        },
        {
          title: "AI processing",
          body: [
            "When real AI features are enabled, meeting notes or audio may be processed by third-party AI providers to generate transcripts, summaries, tasks, and proposals.",
            "Do not upload highly sensitive, confidential, medical, legal, or financial information unless you have the right to process it."
          ]
        },
        {
          title: "Payments",
          body: [
            "Payments are processed by third-party payment providers such as Lemon Squeezy. ClientPilot AI does not store your full card details.",
            "Payment providers may process billing information according to their own privacy policies."
          ]
        },
        {
          title: "Data security",
          body: [
            "We use reasonable technical measures to protect your account and workspace data.",
            "No online service can guarantee complete security, so users should protect their login credentials and use strong passwords."
          ]
        },
        {
          title: "Contact",
          body: [
            "For privacy questions, contact us at info@makzora.com."
          ]
        }
      ]}
    />
  );
}