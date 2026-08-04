import FlagsPanel from '../FlagsPanel';

export const metadata = { title: 'Flags' };

export default function FlagsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Flags</h1>
        <p className="text-sm text-gray-500">
          Raise something for Finance, Management, or IT Admin to look at, and track the status of items you or
          others have flagged.
        </p>
      </div>
      <FlagsPanel />
    </div>
  );
}
