import React from 'react'

export default function LoadingPage({ title, subtitle }) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-70 rounded-2xl bg-white shadow-lg p-6 flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-full border-4 border-gray-200 border-t-[#FF5F25] animate-spin" />

                <div className="text-center">
                    <div className="font-bold text-lg mb-1">{title}</div>
                    <div className="text-sm text-gray-400">{subtitle}</div>
                </div>
            </div>
        </div>
    )
}