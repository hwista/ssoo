import { OpportunityWorkspace } from '@/components/pages/opportunities/OpportunityWorkspace';

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <OpportunityWorkspace query={{ ...params, sourceSurface: params.sourceSurface ?? 'workspace' }} />;
}
