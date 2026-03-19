'use client'

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

export function FinanceFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Initialize state from URL params if present
    const defaultStart = searchParams.get('start') ? new Date(searchParams.get('start')!) : undefined
    const defaultEnd = searchParams.get('end') ? new Date(searchParams.get('end')!) : undefined

    const [date, setDate] = useState<DateRange | undefined>({
        from: defaultStart,
        to: defaultEnd,
    })

    const handleApply = () => {
        const params = new URLSearchParams(searchParams.toString())

        if (date?.from) {
            params.set('start', format(date.from, 'yyyy-MM-dd'))
        } else {
            params.delete('start')
        }

        if (date?.to) {
            params.set('end', format(date.to, 'yyyy-MM-dd'))
        } else {
            params.delete('end')
        }

        router.push(`/admin/finance?${params.toString()}`)
    }

    const handleClear = () => {
        setDate(undefined)
        router.push('/admin/finance')
    }

    return (
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 min-w-max">تصفية حسب التاريخ (Date Filter):</h3>

            <div className="flex-1 flex gap-2 w-full sm:w-auto">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal rounded-xl border-slate-200 h-11",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>

                <Button
                    onClick={handleApply}
                    className="h-11 rounded-xl bg-primary text-white font-bold px-6 shadow-md shadow-primary/20"
                >
                    Apply Filter
                </Button>

                {(date?.from || searchParams.has('start')) && (
                    <Button
                        onClick={handleClear}
                        variant="ghost"
                        className="h-11 rounded-xl text-slate-500 hover:bg-slate-100 font-bold px-4 flex items-center gap-2"
                        title="Clear Filter"
                    >
                        <X size={16} /> Clear
                    </Button>
                )}
            </div>
        </div>
    )
}
