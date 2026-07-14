import Link from "next/link";

type DashboardHelpButtonProps = {
  userEmail?: string | null;
};

export function DashboardHelpButton({
  userEmail
}: DashboardHelpButtonProps) {
  return (
    <Link
      className="cp-dashboard-help-button"
      href="/dashboard/support"
      title={
        userEmail
          ? `Support for ${userEmail}`
          : "Open ClientPilot AI Support"
      }
    >
      <span className="cp-dashboard-help-icon">
        ?
      </span>

      <span>
        <small>Need any help?</small>
        <strong>Open Support Center</strong>
      </span>
    </Link>
  );
}