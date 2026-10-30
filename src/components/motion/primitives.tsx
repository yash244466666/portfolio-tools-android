import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { useReducedMotion } from "./use-reduced-motion"
import { clamp01, fractionOf, shortestAngleDelta } from "./motion-math"

export function ResultReveal({
  token,
  children,
  className = "",
  variant = "reveal",
}: {
  token: string | number
  children: ReactNode
  className?: string
  /** Quick is for live-as-you-type results; reveal is for an explicit action. */
  variant?: "quick" | "reveal"
}) {
  const reduced = useReducedMotion()
  return (
    <div
      className={reduced ? className : `motion-reveal motion-reveal--${variant} ${className}`}
      key={reduced ? "static" : String(token)}
    >
      {children}
    </div>
  )
}

export function Meter({
  label,
  value,
  maximum,
  valueLabel,
  tone = "primary",
}: {
  label: string
  value: number
  maximum: number
  valueLabel: string
  tone?: "primary" | "success" | "danger"
}) {
  const ratio = fractionOf(value, 0, maximum)
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-mono text-[var(--text)]">{valueLabel}</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={maximum}
        aria-valuemin={0}
        aria-valuenow={Math.min(maximum, Math.max(0, value))}
        aria-valuetext={valueLabel}
        className="motion-meter"
        role="meter"
      >
        <div
          className={`motion-meter-fill motion-meter-fill--${tone}`}
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
    </div>
  )
}

function polar(centerX: number, centerY: number, radius: number, angleDegrees: number) {
  const radians = (angleDegrees * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  }
}

function arcPath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polar(centerX, centerY, radius, startAngle)
  const end = polar(centerX, centerY, radius, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

/** Semicircular-ish gauge; the value is also rendered as text by the caller. */
export function Gauge({
  value,
  minimum,
  maximum,
  label,
  valueLabel,
}: {
  value: number
  minimum: number
  maximum: number
  label: string
  valueLabel: string
}) {
  const ratio = fractionOf(value, minimum, maximum)
  const start = 150
  const sweep = 240
  const angle = start + sweep * ratio
  const needleEnd = polar(120, 120, 74, angle)
  const path = arcPath(120, 120, 84, start, start + sweep)
  return (
    <div className="grid justify-items-center gap-2">
      <div aria-hidden="true" className="relative">
        <svg className="motion-gauge" role="presentation" viewBox="0 0 240 170">
          <path
            className="motion-gauge-track"
            d={path}
            fill="none"
            stroke="var(--border-strong)"
            strokeLinecap="round"
            strokeWidth="14"
          />
          <path
            className="motion-gauge-value"
            d={path}
            fill="none"
            pathLength={1}
            stroke="var(--primary)"
            strokeDasharray={`${ratio} 1`}
            strokeLinecap="round"
            strokeWidth="14"
          />
          <line
            className="motion-gauge-needle"
            style={{
              transform: `rotate(${angle}deg)`,
              transformBox: "view-box",
              transformOrigin: "120px 120px",
            }}
            stroke="var(--text)"
            strokeLinecap="round"
            strokeWidth="3"
            x1="120"
            x2={needleEnd.x}
            y1="120"
            y2={needleEnd.y}
          />
          <circle cx="120" cy="120" fill="var(--primary)" r="7" />
        </svg>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="font-mono text-2xl font-semibold">{valueLabel}</p>
    </div>
  )
}

export function ProgressRing({
  progress,
  label,
  children,
  tone = "primary",
}: {
  progress: number
  label: string
  children: ReactNode
  tone?: "primary" | "danger"
}) {
  const ratio = clamp01(progress)
  const circumference = 2 * Math.PI * 42
  return (
    <div aria-label={label} className="relative inline-grid place-items-center" role="img">
      <svg aria-hidden="true" className="h-40 w-40 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" fill="none" r="42" stroke="var(--border)" strokeWidth="8" />
        <circle
          className="motion-ring"
          cx="50"
          cy="50"
          fill="none"
          r="42"
          stroke={tone === "danger" ? "var(--danger)" : "var(--primary)"}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <div className="absolute grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function Sparkline({ values, label }: { values: readonly number[]; label: string }) {
  if (values.length < 2) return null
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const span = maximum - minimum || 1
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 30 - ((value - minimum) / span) * 26
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
  return (
    <svg aria-label={label} className="h-10 w-full" role="img" viewBox="0 0 100 32">
      <polyline
        fill="none"
        points={points}
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function CoinFlip({
  result,
  flipping,
  flipId,
}: {
  result: "Heads" | "Tails" | null
  flipping: boolean
  flipId: number
}) {
  const reduced = useReducedMotion()
  return (
    <div aria-hidden="true" className="coin-scene" data-testid="coin-scene">
      <div
        className={`coin ${flipping && !reduced ? "coin--flipping" : ""}`}
        key={flipId}
        style={{ "--coin-result": result === "Tails" ? "180deg" : "0deg" } as CSSProperties}
      >
        <div className="coin-face coin-face--heads">
          <span className="text-3xl font-bold">H</span>
          <span className="text-xs uppercase tracking-wide">Heads</span>
        </div>
        <div className="coin-face coin-face--tails">
          <span className="text-3xl font-bold">T</span>
          <span className="text-xs uppercase tracking-wide">Tails</span>
        </div>
      </div>
    </div>
  )
}

export function CompassDial({
  heading,
  accuracy,
  interference,
}: {
  heading: number
  accuracy: number
  interference: boolean
}) {
  const needleRef = useRef<SVGGElement>(null)
  const current = useRef(heading)

  useEffect(() => {
    const delta = shortestAngleDelta(current.current, heading)
    current.current += delta
    needleRef.current?.style.setProperty("transform", `rotate(${current.current}deg)`)
  }, [heading])

  return (
    <svg
      aria-hidden="true"
      className={`motion-compass h-52 w-52 ${interference ? "motion-compass--interference" : ""}`}
      viewBox="0 0 240 240"
    >
      <circle
        cx="120"
        cy="120"
        fill="var(--surface-muted)"
        r="112"
        stroke="var(--border-strong)"
        strokeWidth="2"
      />
      {Array.from({ length: 36 }, (_, index) => {
        const angle = index * 10
        const major = angle % 30 === 0
        const outer = polar(120, 120, 104, angle - 90)
        const inner = polar(120, 120, major ? 92 : 98, angle - 90)
        return (
          <line
            key={angle}
            stroke="var(--border-strong)"
            strokeWidth={major ? 2 : 1}
            x1={inner.x}
            x2={outer.x}
            y1={inner.y}
            y2={outer.y}
          />
        )
      })}
      {(["N", "E", "S", "W"] as const).map((label, index) => {
        const point = polar(120, 120, 76, index * 90 - 90)
        return (
          <text
            fill={label === "N" ? "var(--text)" : "var(--text-secondary)"}
            fontSize={label === "N" ? 18 : 14}
            fontWeight={label === "N" ? 700 : 500}
            key={label}
            textAnchor="middle"
            x={point.x}
            y={point.y + 5}
          >
            {label}
          </text>
        )
      })}
      <g
        ref={needleRef}
        style={{
          transform: `rotate(${heading}deg)`,
          transformBox: "view-box",
          transformOrigin: "120px 120px",
        }}
      >
        <polygon fill="var(--primary)" points="120,34 130,120 110,120" />
        <polygon fill="var(--text-secondary)" points="120,206 110,120 130,120" />
      </g>
      <circle
        cx="120"
        cy="120"
        fill="var(--surface-raised)"
        r="10"
        stroke="var(--border-strong)"
        strokeWidth="2"
      />
      <circle
        cx="120"
        cy="120"
        fill="none"
        opacity={accuracy > 0 ? 0.9 : 0.35}
        r="92"
        stroke="var(--primary)"
        strokeDasharray={`${accuracy * 20} 8`}
        strokeWidth="2"
      />
    </svg>
  )
}

export function LevelBubble({
  roll,
  pitch,
  level,
}: {
  roll: number
  pitch: number
  level: boolean
}) {
  const offsetX = Math.max(-10, Math.min(10, roll)) * 7
  const offsetY = Math.max(-10, Math.min(10, pitch)) * 7
  return (
    <div aria-hidden="true" className={`motion-level ${level ? "motion-level--level" : ""}`}>
      <div className="motion-level-ring motion-level-ring--outer" />
      <div className="motion-level-ring motion-level-ring--inner" />
      <div className="motion-level-axis motion-level-axis--x" />
      <div className="motion-level-axis motion-level-axis--y" />
      <div
        className="motion-level-bubble"
        style={{ transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))` }}
      />
    </div>
  )
}

export function Waveform({ values, label }: { values: readonly number[]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return
    const width = 600
    const height = 120
    const ratio = typeof devicePixelRatio === "number" ? devicePixelRatio : 1
    canvas.width = width * ratio
    canvas.height = height * ratio
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, height)
    context.strokeStyle = "rgba(127,127,127,0.25)"
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(0, height / 2)
    context.lineTo(width, height / 2)
    context.stroke()
    if (values.length < 2) return
    context.strokeStyle = getComputedStyle(canvas).getPropertyValue("--primary") || "#4f7cff"
    context.lineWidth = 2
    context.beginPath()
    values.forEach((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height / 2 - clamp01(Math.abs(value)) * (height / 2 - 6)
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.stroke()
  }, [values])

  return (
    <canvas
      aria-label={label}
      className="h-28 w-full rounded-2xl bg-[var(--surface-muted)]"
      ref={canvasRef}
      role="img"
    />
  )
}

export function BeforeAfter({
  before,
  after,
  alt,
}: {
  before: string
  after: string
  alt: string
}) {
  const [position, setPosition] = useState(50)
  return (
    <div className="grid gap-2">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)]">
        <img alt={`${alt} — original`} className="block h-56 w-full object-contain" src={before} />
        <img
          alt={`${alt} — compressed`}
          className="absolute inset-0 block h-full w-full object-contain"
          src={after}
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        />
        <span className="absolute left-2 top-2 rounded-full bg-[var(--surface-raised)] px-2 py-1 text-xs">
          Compressed
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-[var(--surface-raised)] px-2 py-1 text-xs">
          Original
        </span>
      </div>
      <label className="grid gap-1 text-xs text-[var(--text-secondary)]">
        Reveal compressed image
        <input
          aria-label="Reveal compressed image"
          className="app-input"
          max={100}
          min={0}
          onChange={(event) => setPosition(Number(event.target.value))}
          type="range"
          value={position}
        />
      </label>
    </div>
  )
}

export function StackedBar({
  segments,
  label,
}: {
  segments: ReadonlyArray<{ label: string; value: number; tone?: "primary" | "success" | "danger" }>
  label: string
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
  if (total <= 0) return null
  return (
    <div aria-label={label} className="motion-stacked" role="img">
      {segments.map((segment) => (
        <span
          className={`motion-stacked-segment motion-stacked-segment--${segment.tone ?? "primary"}`}
          key={segment.label}
          style={{ width: `${(Math.max(0, segment.value) / total) * 100}%` }}
          title={`${segment.label}: ${segment.value}`}
        />
      ))}
    </div>
  )
}

export function SuccessMark({ label }: { label: string }) {
  return (
    <span className="motion-pop inline-flex items-center gap-2 text-sm font-semibold text-[var(--success-text)]">
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20">
        <circle cx="10" cy="10" fill="none" r="8.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M6 10.2l2.6 2.6L14.2 7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
      {label}
    </span>
  )
}
