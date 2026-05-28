import React from 'react'
import { EmptyState } from '../../components/ui'
import { FileSignature } from 'lucide-react'

export default function Consents() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
          <FileSignature className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consents & Signatures</h1>
          <p className="text-slate-500 text-sm">Manage consent forms and digital signatures for service users.</p>
        </div>
      </div>
      <EmptyState 
        title="Consent Forms Coming Soon" 
        description="This section will hold the templates for consents and signatures." 
      />
    </div>
  )
}
