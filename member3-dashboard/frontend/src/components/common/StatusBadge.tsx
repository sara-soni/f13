import type { LeaveStatus } from "../../types/leave";

interface StatusBadgeProps {
  status: LeaveStatus | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  let kind = "pending-manager";

  if (status === "Approved") {
    kind = "approved";
  } else if (status === "Rejected") {
    kind = "rejected";
  } else if (status === "Pending HR") {
    kind = "pending-hr";
  } else if (status === "Cancelled") {
    kind = "cancelled";
  }

  return (
    <span className={`lf-status ${kind}`} role="status" aria-label={`Status: ${status}`}>
      <i aria-hidden="true" />
      {status}
    </span>
  );
}
