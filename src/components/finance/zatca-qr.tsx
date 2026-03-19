"use client"

import { QRCodeSVG } from "qrcode.react"

export function ZatcaQR({ value, size = 120 }: { value: string; size?: number }) {
    return (
        <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
            <QRCodeSVG value={value} size={size} level="M" includeMargin={false} />
        </div>
    )
}
