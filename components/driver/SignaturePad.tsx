"use client"

import { useRef, useState } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "@/components/ui/button"

export function SignaturePad({
  onSigned,
}: {
  onSigned: (dataUrl: string) => Promise<void> | void
}) {
  const ref = useRef<SignatureCanvas | null>(null)
  const [saving, setSaving] = useState(false)

  const clear = () => ref.current?.clear()

  const save = async () => {
    if (!ref.current || ref.current.isEmpty()) {
      return
    }
    setSaving(true)
    try {
      // PNG data URL
      const dataUrl = ref.current.getTrimmedCanvas().toDataURL("image/png")
      await onSigned(dataUrl)
      clear()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-hidden bg-white">
        <SignatureCanvas
          ref={(r) => (ref.current = r)}
          penColor="black"
          canvasProps={{ className: "w-full h-40" }}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={clear}>
          Clear
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Signature"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Sign inside the box. Your signature will be stored with this contract.
      </p>
    </div>
  )
}
