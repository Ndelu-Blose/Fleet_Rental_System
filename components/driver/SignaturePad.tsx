"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")!
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.strokeStyle = "#111"
  }, [])

  function pos(e: PointerEvent, canvas: HTMLCanvasElement) {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function start(e: React.PointerEvent) {
    const canvas = canvasRef.current!
    canvas.setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = canvas.getContext("2d")!
    const p = pos(e.nativeEvent, canvas)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const p = pos(e.nativeEvent, canvas)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    if (!hasInk) setHasInk(true)
  }

  function end(e: React.PointerEvent) {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current!
    const dataUrl = hasInk ? canvas.toDataURL("image/png") : null
    onChange(dataUrl)
  }

  function clear() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange(null)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white p-2">
        <canvas
          ref={canvasRef}
          width={900}
          height={220}
          className="h-[160px] w-full"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={clear}>
          Clear
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Sign inside the box. Your signature will be stored with this contract.
      </p>
    </div>
  )
}
