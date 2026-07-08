import { DashboardShell } from "@/components/DashboardShell";
import { RecycleBinManager } from "@/components/RecycleBinManager";

export default function RecycleBinPage() {
  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">Recycle Bin</span>
          <h1 style={{ fontSize: 46 }}>Recycle Bin</h1>
          <p className="muted">
            Recover deleted proposals or permanently remove them from your workspace.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>Safe</strong>
          <span>Delete</span>
        </div>
      </div>

      <RecycleBinManager />
    </DashboardShell>
  );
}