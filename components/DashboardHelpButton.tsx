type DashboardHelpButtonProps = {
  userEmail?: string | null;
};

export function DashboardHelpButton({
  userEmail
}: DashboardHelpButtonProps) {
  const subject = encodeURIComponent(
    "ClientPilot AI Support"
  );

  const body = encodeURIComponent(
    [
      "Hello Makzora Team,",
      "",
      "I need help with ClientPilot AI.",
      "",
      `Account email: ${userEmail || "Not available"}`,
      "",
      "My question:"
    ].join("\n")
  );

  const emailLink =
    `mailto:info@makzora.com?subject=${subject}&body=${body}`;

  return (
    <a
      className="cp-dashboard-help-button"
      href={emailLink}
    >
      <span className="cp-dashboard-help-icon">
        ?
      </span>

      <span>
        <small>Need any help?</small>
        <strong>Email Makzora</strong>
      </span>
    </a>
  );
}