interface OrganizationPathRecord { orgId: bigint; orgName: string; orgCode: string; parentOrgId: bigint | null }

/** Include the code so even equal names in the same hierarchy stay identifiable. */
export function organizationPathMap(organizations: OrganizationPathRecord[]): Map<string, string> {
  const byId = new Map(organizations.map((organization) => [organization.orgId.toString(), organization]));
  return new Map(organizations.map((organization) => {
    const names: string[] = [];
    const visited = new Set<string>();
    let current: OrganizationPathRecord | undefined = organization;
    while (current && !visited.has(current.orgId.toString())) {
      visited.add(current.orgId.toString());
      names.unshift(current.orgName);
      current = current.parentOrgId ? byId.get(current.parentOrgId.toString()) : undefined;
    }
    return [organization.orgId.toString(), `${names.join(' › ')} (${organization.orgCode})`];
  }));
}
