import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { FileText, Download, ExternalLink, AlertCircle } from "lucide-react"

interface RevisionWorkspaceProps {
    revision: any
}

export function RevisionWorkspace({ revision }: RevisionWorkspaceProps) {
    if (!revision) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a revision to view details</p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50/30">
            <Tabs defaultValue="contractor" className="flex-1 flex flex-col">
                <div className="px-6 py-4 border-b bg-white flex justify-between items-center">
                    <TabsList className="bg-slate-100 p-1 rounded-lg">
                        <TabsTrigger value="contractor" className="px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <FileText className="w-4 h-4 mr-2 text-blue-600" />
                            مرفقات المقاول (Contractor)
                        </TabsTrigger>
                        <TabsTrigger value="consultant" disabled={!revision.consultantFile} className="px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <FileText className="w-4 h-4 mr-2 text-emerald-600" />
                            رد الاستشاري (Consultant)
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <a href={revision.contractorFile} target="_blank" rel="noreferrer">
                                <Download className="w-4 h-4 mr-2" />
                                تحميل الملف
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 relative bg-slate-200/50 p-4">
                    <TabsContent value="contractor" className="h-full m-0 data-[state=active]:flex flex-col">
                        {revision.contractorFile ? (
                            <iframe
                                src={revision.contractorFile.replace('/view', '/preview')}
                                className="w-full h-full rounded-xl border border-slate-200 bg-white shadow-sm"
                                title="Contractor Document"
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-400">
                                No attachment available
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="consultant" className="h-full m-0 data-[state=active]:flex flex-col">
                        {revision.consultantFile ? (
                            <iframe
                                src={revision.consultantFile.replace('/view', '/preview')}
                                className="w-full h-full rounded-xl border border-slate-200 bg-white shadow-sm"
                                title="Consultant Response"
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-400">
                                No response document
                            </div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
