import React from "react";
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";

function Reports() {
  usePageTitle("QCheckCITE - Reports");

  return (
    <BaseDashboard role="admin">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <div className="bg-white p-6 rounded shadow">
        <p className="text-gray-700 mb-4">
          This section will contain downloadable reports, such as request summaries, user statistics, and inventory logs.
        </p>
        <p className="text-sm text-gray-500 italic">
          (You can later add filters, chart components, or export to PDF/Excel functionality here.)
        </p>
      </div>
    </BaseDashboard>
  );
}

export default Reports;
