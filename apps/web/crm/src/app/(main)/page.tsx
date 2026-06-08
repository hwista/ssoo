import { OpportunityWorkspace } from '@/components/pages/opportunities/OpportunityWorkspace';

export default async function MainPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <OpportunityWorkspace query={params} />;
}
