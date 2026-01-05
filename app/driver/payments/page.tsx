import { Suspense } from "react"
import DriverPaymentsContent from "./payments-content"

export default function DriverPaymentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12">Loading...</div>}>
      <DriverPaymentsContent />
    </Suspense>
  )
}
