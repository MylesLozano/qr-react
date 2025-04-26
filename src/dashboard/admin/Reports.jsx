import React, { useState, useEffect } from "react"; // Added imports
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"; // Added imports
import { db } from "../../firebase"; // Added db import

function Reports() {
  usePageTitle("QCheckCITE - Reports");
  const [reportsList, setReportsList] = useState([]); // State for reports
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Hypothetical query for available reports
    const q = query(collection(db, "available_reports"), orderBy("generatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedReports = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReportsList(fetchedReports);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching reports list:", err);
        setError("Failed to load reports list.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <BaseDashboard role="admin">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <div className="bg-white p-6 rounded shadow">
        {loading ? (
           <p className="text-gray-700">Loading available reports...</p>
        ) : error ? (
           <p className="text-red-500">{error}</p>
        ) : reportsList.length === 0 ? (
          <p className="text-gray-500">No reports available currently.</p>
        ) : (
          <div>
            <p className="text-gray-700 mb-4">
              Downloadable reports:
            </p>
            <ul className="list-disc pl-5">
                {reportsList.map(report => (
                    <li key={report.id} className="mb-2">
                       {/* Assuming report doc has 'name' and 'downloadUrl' fields */}
                       <a href={report.downloadUrl} download className="text-blue-600 hover:underline">
                           {report.name} - {report.generatedAt?.toDate().toLocaleDateString()}
                       </a>
                    </li>
                ))}
            </ul>
          </div>
        )}
        <p className="text-sm text-gray-500 italic mt-4">
          (Functionality to generate new reports can be added here.)
        </p>
      </div>
    </BaseDashboard>
  );
}

export default Reports;