import { AdminLoading } from "./_components/AdminLoading";

export default function Loading() {
  return (
    <AdminLoading
      eyebrow="Overview"
      title="Loading dashboard"
      subtitle="Fetching companies, users, agents and runtime status."
    />
  );
}
