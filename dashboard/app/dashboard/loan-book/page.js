import Link from 'next/link';
import { getLoanBookDetail } from '../../../lib/data';
import { formatCurrency } from '../../../lib/format';
import LoanBookChart from '../charts/LoanBookChart';
import FacilityTable from './FacilityTable';

function StatCard({ label, value, tone }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 border-t-4 border-t-brand-blue p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${tone || 'text-brand-navy'}`}>{value}</p>
    </div>
  );
}

function repaymentRateTone(rate) {
  if (rate > 80) return 'text-green-600';
  if (rate >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default async function LoanBookPage() {
  const loanBook = await getLoanBookDetail();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Portfolio
        </Link>
        <h1 className="text-xl font-semibold mt-1">CEF Loan Book</h1>
        <p className="text-sm text-gray-500">
          Every facility CEF has extended to an AssetCo — principal, repayments, and outstanding balance.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Capital Deployed" value={formatCurrency(loanBook.totalFacilitiesNgn)} />
        <StatCard label="Total Repaid to CEF" value={formatCurrency(loanBook.totalRepaidNgn)} />
        <StatCard label="Outstanding Loan Book" value={formatCurrency(loanBook.totalOutstandingNgn)} />
        <StatCard
          label="Repayment Rate"
          value={`${loanBook.repaymentRatePercent.toFixed(1)}%`}
          tone={repaymentRateTone(loanBook.repaymentRatePercent)}
        />
      </div>

      <LoanBookChart byAssetCo={loanBook.byAssetCo} />

      {loanBook.bySeries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">By CEF Series</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="p-3">Series</th>
                  <th className="p-3">Deployed</th>
                  <th className="p-3">Repaid</th>
                  <th className="p-3">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loanBook.bySeries.map((s) => (
                  <tr key={s.seriesCode}>
                    <td className="p-3">{s.seriesName}</td>
                    <td className="p-3">{formatCurrency(s.totalDeployedNgn)}</td>
                    <td className="p-3">{formatCurrency(s.totalRepaidNgn)}</td>
                    <td className="p-3">{formatCurrency(s.outstandingNgn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">All Facilities</h2>
        <FacilityTable facilities={loanBook.facilities} />
      </div>
    </div>
  );
}
