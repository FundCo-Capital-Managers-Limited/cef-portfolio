import Link from 'next/link';
import { getCurrentUserProfile, getAllAssetcoOptions } from '../../../../lib/data';
import UserManagementPanel from './UserManagementPanel';

export const metadata = { title: "User Management" };

export default async function AdminUsersPage() {
  const profile = await getCurrentUserProfile();
  const canManageUsers = ['it_admin', 'management'].includes(profile?.role);

  if (!canManageUsers) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Portfolio
        </Link>
        <p className="text-sm text-gray-600">
          Only IT Admin or Management can access User Management.
        </p>
      </div>
    );
  }

  const assetcos = await getAllAssetcoOptions();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Portfolio
        </Link>
        <h1 className="text-xl font-semibold mt-1">User Management</h1>
        <p className="text-sm text-gray-500">
          Create accounts for CEF staff and AssetCo admins, and see who currently has access.
        </p>
      </div>

      <UserManagementPanel assetcos={assetcos} />
    </div>
  );
}
