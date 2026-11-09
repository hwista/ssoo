'use client';
import { MembershipManagementPanel } from './MembershipManagementPanel';
import { readProgramContext } from './program-context';
export function MembershipManagementPage({ path = '/memberships' }: { path?: string }) {
  return <MembershipManagementPanel key={path} standalone {...readProgramContext(path)} />;
}
