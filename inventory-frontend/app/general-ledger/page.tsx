"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { LedgerEntry2 } from "@/lib/types";

export default function GeneralLedgerPage() {
  const [ledger, setLedger] = useState<LedgerEntry2[]>([]);

  useEffect(() => {
    api.getLedger().then((data) => {
      setLedger(data || []);
    });
    // eslint-disable-next-line1
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 px-4 md:px-8 py-8 ml-0 md:ml-64">
        <div className="w-full">
          {/* Heading + Subtext */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center sm:text-left break-words">
              Financial Record
            </h1>
            <p className="text-gray-600 text-center sm:text-left text-sm sm:text-base mt-1">
              View and analyze your business's double-entry financial transactions in real time.
            </p>
          </div>

          {/* Ledger Table */}
          <Card className="w-full shadow-sm">
            <CardContent className="pt-0">
              <h2 className="text-xl font-semibold text-blue-700 mb-4">
                General Journal
              </h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-base divide-y divide-gray-200">
                  <colgroup>
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "42%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "20%" }} />
                  </colgroup>
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-bold text-gray-700 border-r border-gray-200">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left font-bold text-gray-700 border-r border-gray-200">
                        Account Title
                      </th>
                      <th className="px-6 py-3 text-right font-bold text-gray-700 border-r border-gray-200">
                        Debit
                      </th>
                      <th className="px-6 py-3 text-right font-bold text-gray-700 border-r border-gray-200">
                        Credit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ledger.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-10 text-gray-400 text-lg"
                        >
                          No ledger entries yet.
                        </td>
                      </tr>
                    ) : (
                      ledger.map((entry, i) => {
                        // Remove the date from every second row (even index)
                        const showDate = i % 2 === 0;
                        return (
                          <tr
                            key={i}
                            className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            <td
                              className={
                                "px-6 py-3 border-r border-gray-100 text-base align-middle" +
                                (i % 2 === 1 ? " pl-16" : "")
                              }
                            >
                              {showDate ? entry.date : ""}
                            </td>
                            <td
                              className={
                                "px-6 py-3 border-r border-gray-100 text-base align-middle" +
                                (i % 2 === 1 ? " pl-16" : "")
                              }
                            >
                              {entry.accountTitle}
                            </td>
                            <td
                              className={
                                "px-6 py-3 text-right border-r border-gray-100 text-green-700 font-semibold align-middle text-base" +
                                (i % 2 === 1 ? " pl-16" : "")
                              }
                            >
                              {entry.debit ? entry.debit.toFixed(2) : ""}
                            </td>
                            <td
                              className={
                                "px-6 py-3 text-right border-r border-gray-100 text-red-700 font-semibold align-middle text-base" +
                                (i % 2 === 1 ? " pl-16" : "")
                              }
                            >
                              {entry.credit ? entry.credit.toFixed(2) : ""}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
