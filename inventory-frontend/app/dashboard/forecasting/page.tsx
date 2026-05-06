"use client";

import React, { useState, useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine
} from "recharts";
import { AlertCircle, ArrowUpRight, CheckCircle2, Package } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";

interface ForecastData {
    product_id: string;
    product_name: string;
    confidence_score?: number;
    history?: number[];
    forecast?: Record<string, number>;
    error?: string;
    insights: {
        current_stock: number;
        needs_restock: boolean;
        recommended_order: number;
        threshold: number;
    };
}

export default function ForecastDashboard() {
    const [data, setData] = useState<{ dashboard_forecasts: ForecastData[] } | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<ForecastData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        const fetchForecasts = async () => {
            try {
                const res = await fetch("http://127.0.0.1:5006/api/DemandForecasting/All");
                if (!res.ok) throw new Error("Failed to fetch forecast data");
                const json = await res.json();
                setData(json);
                if (json.dashboard_forecasts && json.dashboard_forecasts.length > 0) {
                    setSelectedProduct(json.dashboard_forecasts[0]);
                }
            } catch (err: any) {
                setError(err.message || "An error occurred");
            } finally {
                setIsLoading(false);
            }
        };
        fetchForecasts();
    }, []);

    const chartData = useMemo(() => {
        if (!selectedProduct || !selectedProduct.history || !selectedProduct.forecast) return [];

        const historyPoints = selectedProduct.history.map((val, i) => ({
            name: `Past ${selectedProduct.history.length - i}`,
            value: val,
            type: "Historical"
        }));

        const forecastPoints = Object.entries(selectedProduct.forecast).map(([month, val]) => ({
            name: month.replace("_", " "),
            value: val,
            type: "Forecast"
        }));

        return [...historyPoints, ...forecastPoints];
    }, [selectedProduct]);

    if (isLoading) return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading AI Forecasts...</div>;
    if (error) return <div className="p-6 text-center text-destructive">Error: {error}</div>;
    if (!data || !data.dashboard_forecasts || data.dashboard_forecasts.length === 0 || !selectedProduct) {
        return <div className="p-6 text-center text-muted-foreground">No forecast data available.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <div className="lg:pl-64">
                <main className="min-h-screen">
                    <div className="p-6 space-y-6 bg-background text-foreground">
                        <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Demand Forecasting</h1>
                    <p className="text-muted-foreground">AI-driven inventory optimization and sales predictions.</p>
                </div>
                <div className="flex gap-2">
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        <CheckCircle2 size={16} /> Confidence: {selectedProduct.confidence_score ? (selectedProduct.confidence_score * 100).toFixed(0) + '%' : "N/A"}
                    </span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar: Product List */}
                <div className="lg:col-span-1 space-y-2 overflow-y-auto max-h-[700px] pr-2">
                    {data.dashboard_forecasts.map((item) => (
                        <button
                            key={item.product_id}
                            onClick={() => setSelectedProduct(item)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${selectedProduct.product_id === item.product_id
                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                    : "border-border bg-card hover:bg-accent"
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <p className="font-semibold truncate">{item.product_name || "Unknown Product"}</p>
                                {item.insights?.needs_restock && (
                                    <AlertCircle size={16} className="text-destructive animate-pulse" />
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Stock: {item.insights?.current_stock ?? "N/A"}</p>
                        </button>
                    ))}
                </div>

                {/* Main Content: Charts and Stats */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Top Metric Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-6 rounded-2xl border border-border bg-card">
                            <p className="text-sm text-muted-foreground font-medium">Current Stock</p>
                            <p className={`text-2xl font-bold mt-1 ${selectedProduct.insights.current_stock < 0 ? 'text-destructive' : ''}`}>
                                {selectedProduct.insights.current_stock}
                            </p>
                        </div>
                        <div className="p-6 rounded-2xl border border-border bg-card">
                            <p className="text-sm text-muted-foreground font-medium">Stock Threshold</p>
                            <p className="text-2xl font-bold mt-1">{selectedProduct.insights.threshold}</p>
                        </div>
                        <div className="p-6 rounded-2xl border border-border bg-primary/10 border-primary/20">
                            <p className="text-sm text-primary font-bold">Recommended Restock</p>
                            <p className="text-2xl font-extrabold mt-1 text-primary">
                                + {selectedProduct.insights.recommended_order} units
                            </p>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="p-6 rounded-2xl border border-border bg-card shadow-sm h-[450px]">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <ArrowUpRight size={20} className="text-primary" />
                            6-Month Sales Projection: {selectedProduct.product_name}
                        </h3>
                        {selectedProduct.error ? (
                            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground bg-muted/20 rounded-xl border border-dashed mt-4">
                                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                <p>{selectedProduct.error}</p>
                            </div>
                        ) : (
                        <ResponsiveContainer width="100%" height="90%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="name"
                                    stroke="var(--muted-foreground)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="var(--muted-foreground)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                                />
                                <Legend iconType="circle" />
                                <ReferenceLine y={selectedProduct.insights.threshold} label="Min Threshold" stroke="red" strokeDasharray="3 3" />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="var(--primary)"
                                    strokeWidth={4}
                                    dot={{ r: 6, fill: "var(--primary)" }}
                                    activeDot={{ r: 8 }}
                                    name="Projected Units"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </main>
      </div>
    </div>
  );
}