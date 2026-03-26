export class UserProfileDto {
  id!: string;
  loginId!: string;
  userName!: string | null;
  displayName!: string | null;
  email!: string | null;
  phone!: string | null;
  avatarUrl!: string | null;
  roleCode!: string | null;
  userTypeCode!: string | null;
  departmentCode!: string | null;
  positionCode!: string | null;
  lastLoginAt!: Date | null;
  isAdmin!: boolean;
}
