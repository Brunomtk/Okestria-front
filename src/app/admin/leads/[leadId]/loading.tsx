import { AdminLoading } from "../../_components/AdminLoading";
export default function Loading() {
  return <AdminLoading eyebrow="Loading detail" title="Pulling record" subtitle="Hold on — fetching the full payload from the back." sections={2} />;
}
