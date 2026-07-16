"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  ownerEmail?: string | null;
};

const products = [
  {
    name: "ClientPilot AI",
    href: "/makzora-owner/products/clientpilot-ai",
    status: "Active",
    icon: "CP"
  },
  {
    name: "Future CRM",
    href: "#",
    status: "Coming soon",
    icon: "CRM"
  },
  {
    name: "Future Product",
    href: "#",
    status: "Coming soon",
    icon: "+"
  }
];

export function MakzoraOwnerSidebar({
  ownerEmail
}: Props) {
  const pathname = usePathname() || "";

  return (
    <aside className="mk-owner-sidebar">
      <div className="mk-owner-brand">
        <img
          src="/clientpilotai/makzora-logo-official.png?v=official"
          alt="Makzora"
        />

        <div>
          <strong>Makzora</strong>
          <span>Owner Dashboard</span>
        </div>
      </div>

      <div className="mk-owner-profile">
        <span>M</span>

        <div>
          <strong>Makzora Owner</strong>
          <small>
            {ownerEmail || "Private workspace"}
          </small>
        </div>
      </div>

      <nav className="mk-owner-nav">
        <small>Workspace</small>

        <Link
          href="/makzora-owner"
          className={
            pathname === "/makzora-owner"
              ? "active"
              : ""
          }
        >
          <span>OV</span>

          <div>
            <strong>Overview</strong>
            <small>All Makzora products</small>
          </div>
        </Link>

        <small>Products</small>

        {products.map((product) => {
          const disabled =
            product.href === "#";

          if (disabled) {
            return (
              <div
                className="mk-owner-disabled"
                key={product.name}
              >
                <span>{product.icon}</span>

                <div>
                  <strong>{product.name}</strong>
                  <small>{product.status}</small>
                </div>
              </div>
            );
          }

          return (
            <Link
              href={product.href}
              className={
                pathname.startsWith(
                  product.href
                )
                  ? "active"
                  : ""
              }
              key={product.name}
            >
              <span>{product.icon}</span>

              <div>
                <strong>{product.name}</strong>
                <small>{product.status}</small>
              </div>
            </Link>
          );
        })}
        <Link
          href="/makzora-owner/products/clientpilot-ai/support"
          className={
            pathname.startsWith(
              "/makzora-owner/products/clientpilot-ai/support"
            )
              ? "active"
              : ""
          }
        >
          <span>CI</span>

          <div>
            <strong>Client Issues</strong>
            <small>Support tickets and replies</small>
          </div>
        </Link>
      </nav>

      <div className="mk-owner-sidebar-bottom">
        <Link href="/makzora-owner/login">
          Owner Login
        </Link>

        <small>
          Private Makzora management system
        </small>
      </div>
    </aside>
  );
}
