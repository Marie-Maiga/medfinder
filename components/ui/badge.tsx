import { cn } from '@/lib/utils/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'info'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger:  'bg-red-100 text-red-800',
  muted:   'bg-gray-100 text-gray-600',
  info:    'bg-purple-100 text-purple-800',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}

export function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    pending:   { label: 'En attente',  variant: 'warning' },
    sent:      { label: 'Envoyée',     variant: 'info' },
    partial:   { label: 'Partielle',   variant: 'warning' },
    completed: { label: 'Terminée',    variant: 'success' },
    failed:    { label: 'Échouée',     variant: 'danger' },
    cancelled: { label: 'Annulée',     variant: 'muted' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'muted' as BadgeVariant }
  return <Badge variant={variant}>{label}</Badge>
}

export function ResponseStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    pending:     { label: 'En attente',    variant: 'warning' },
    available:   { label: 'Disponible',    variant: 'success' },
    unavailable: { label: 'Indisponible',  variant: 'danger' },
    timeout:     { label: 'Timeout',       variant: 'muted' },
    error:       { label: 'Erreur',        variant: 'danger' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'muted' as BadgeVariant }
  return <Badge variant={variant}>{label}</Badge>
}
