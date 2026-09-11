import { SchoolDetail } from "@/components/admin/schools/school-detail";

export default async function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchoolDetail schoolId={id} />;
}
