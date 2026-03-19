import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAllPlans } from "../actions"
import { PlanDialog } from "./plan-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Package, Check, X, ShieldCheck } from "lucide-react"

export default async function PlansPage() {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        redirect("/")
    }

    const plans = await getAllPlans()

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
                    <p className="text-muted-foreground">Manage dynamic feature sets and pricing for your tenants.</p>
                </div>
                <PlanDialog>
                    <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg transition-all active:scale-95">
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Plan
                    </Button>
                </PlanDialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan: any) => (
                    <div
                        key={plan.id}
                        className="relative group bg-card border rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                    >
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                            Active
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Package className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                            </div>

                            <p className="text-sm text-muted-foreground min-h-[40px]">
                                {plan.description || "No description provided."}
                            </p>

                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold">{plan.price}</span>
                                <span className="text-sm font-medium text-muted-foreground">{plan.currency} / month</span>
                            </div>

                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    <span>Unlocked Modules</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(plan.allowedModules as string[]).map((mod) => (
                                        <div
                                            key={mod}
                                            className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs font-medium flex items-center gap-1"
                                        >
                                            <Check className="h-3 w-3 text-green-500" />
                                            {mod}
                                        </div>
                                    ))}
                                    {(plan.allowedModules as string[]).length === 0 && (
                                        <p className="text-xs text-muted-foreground italic">No modules unlocked.</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-2">
                                <PlanDialog plan={plan}>
                                    <Button variant="outline" className="w-full">Edit Plan</Button>
                                </PlanDialog>
                            </div>
                        </div>
                    </div>
                ))}

                {plans.length === 0 && (
                    <div className="col-span-full py-20 bg-muted/30 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 bg-muted rounded-full">
                            <Package className="h-12 w-12 text-muted-foreground opacity-20" />
                        </div>
                        <h3 className="text-xl font-semibold opacity-60">No plans created yet</h3>
                        <p className="text-muted-foreground max-w-xs">Start by creating your first subscription plan to define tenant features.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
