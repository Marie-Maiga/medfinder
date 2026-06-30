import { RequestForm } from '@/components/requests/RequestForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewRequestPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/requests"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nouvelle demande</h1>
          <p className="text-sm text-gray-500">Créer une demande de recherche de médicaments</p>
        </div>
      </div>

      <RequestForm />
    </div>
  )
}
