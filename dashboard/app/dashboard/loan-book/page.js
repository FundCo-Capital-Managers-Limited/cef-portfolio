import { Landmark, PiggyBank, TrendingDown, ShieldCheck } from 'lucide-react';
import { getLoanBookDetail } from '../../../lib/data';
import { formatCurrency } from '../../../lib/format';
import LoanBookChart from '../charts/LoanBookChart';
import FacilityTable from './FacilityTable';
import RiskSummaryTiles from './RiskSummaryTiles';
import StatCard from '../StatCard';
import BackLink from '../BackLink';
import ExportLoanBookButton from './ExportLoanBookButton';

function repaymentRateTone(rate) {
  if (rate > 80) return 'text-green-600';
  if (rate >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export const metadata = { title: "CEF Loan Book" };

export default async function LoanBookPage() {
  const loanBook = await getLoanBookDetail();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <BackLink href="/dashboard">Portfolio</BackLink>
          <h1 className="text-xl font-semibold mt-1 flex items-center gap-2 dark:text-white">
            <Landmark size={22} className="text-brand-navy dark:text-brand-teal" />
            CEF Loan Book
          </h1>
          <p className="text-sm text-gray-500">
            Every facility CEF has extended to an AssetCo: principal, repayments, and outstanding balance.
          </p>
        </div>
        <ExportLoanBookButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Capital Deployed" value={formatCurrency(loanBook.totalFacilitiesNgn)} Icon={Landmark} iconTone="navy" />
        <StatCard label="Total Repaid to CEF" value={formatCurrency(loanBook.totalRepaidNgn)} Icon={PiggyBank} iconTone="green" />
        <StatCard label="Outstanding Loan Book" value={formatCurrency(loanBook.totalOutstandingNgn)} Icon={TrendingDown} iconTone="amber" />
        <StatCard
          label="Repayment Rate"
          value={`${loanBook.repaymentRatePercent.toFixed(1)}%`}
          tone={repaymentRateTone(loanBook.repaymentRatePercent)}
          Icon={ShieldCheck}
          iconTone="green"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 dark:text-white">Credit Risk Summary</h2>
        <RiskSummaryTiles />
      </div>

      <LoanBookChart byAssetCo={loanBook.byAssetCo} />

      {loanBook.bySeries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 dark:text-white">By CEF Series</h2>
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
        <h2 className="text-lg font-semibold mb-3 dark:text-white">All Facilities</h2>
        <FacilityTable facilities={loanBook.facilities} />
      </div>
    </div>
  );
}
