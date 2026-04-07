import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Building2,
  Search,
  MoreHorizontal,
  Eye,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers3,
  Users,
  Bot,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  buildPageHref,
  filterBillingRows,
  getAdminBillingData,
  getPageNumber,
  getSearchTerm,
  paginate,
  requireAdminSession,
  type AdminSearchParams,
} from '../_lib/admin';

type PageProps = { searchParams?: Promise<AdminSearchParams> };

function getBillingStatus(status: string) {
  switch (status) {
    case 'active':
    case 'paid':
    case 'trialing':
      return { label: 'Ativa', variant: 'default' as const, icon: CheckCircle2, color: 'text-emerald-500' };
    case 'pending':
    case 'past_due':
      return { label: 'Pendente', variant: 'secondary' as const, icon: Clock, color: 'text-amber-500' };
    case 'overdue':
    case 'canceled':
    case 'cancelled':
    case 'inactive':
      return { label: 'Atrasada', variant: 'destructive' as const, icon: AlertCircle, color: 'text-destructive' };
    default:
      return { label: status || 'Sem status', variant: 'outline' as const, icon: Clock, color: 'text-muted-foreground' };
  }
}

function formatCurrency(value: number | null | undefined, currency = 'BRL') {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function formatUsage(used: number, limit: number | null) {
  if (limit == null || limit <= 0) return `${used} / ilimitado`;
  return `${used} / ${limit}`;
}

export default async function AdminBillingPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const billing = await getAdminBillingData(session.token!);
  const filtered = filterBillingRows(billing.rows, query);
  const pagination = paginate(filtered, page, 10);

  const activeRows = filtered.filter((row) => ['active', 'paid', 'trialing'].includes(row.subscriptionStatus)).length;
  const pendingRows = filtered.filter((row) => ['pending', 'past_due'].includes(row.subscriptionStatus)).length;
  const overdueRows = filtered.filter((row) => ['overdue', 'canceled', 'cancelled', 'inactive'].includes(row.subscriptionStatus)).length;
  const totalRevenue = filtered.reduce((acc, row) => acc + (row.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consolidado de planos, assinaturas e uso por company usando os endpoints atuais do back.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" disabled>
            <BarChart3 className="h-4 w-4" />
            Relatorio
          </Button>
          <Button variant="outline" className="gap-2" disabled>
            <CreditCard className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Volume listado</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">{activeRows}</p>
              <p className="text-xs text-muted-foreground">Subscriptions ativas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">{pendingRows}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">{overdueRows}</p>
              <p className="text-xs text-muted-foreground">Com atencao</p>
            </div>
          </div>
        </div>
      </div>

      <form className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Buscar por company, plano ou status..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="outline" size="sm">Aplicar busca</Button>
          <Link href="/admin/billing"><Button type="button" variant="ghost" size="sm">Limpar</Button></Link>
        </div>
      </form>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Company</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Agents</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.items.length > 0 ? (
              pagination.items.map((record) => {
                const statusInfo = getBillingStatus(record.subscriptionStatus);
                const StatusIcon = statusInfo.icon;
                return (
                  <TableRow key={record.companyId} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{record.companyName}</p>
                          <p className="text-xs text-muted-foreground">{record.companyEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.planName}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {formatCurrency(record.amount, record.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`h-3.5 w-3.5 ${statusInfo.color}`} />
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Layers3 className="h-3.5 w-3.5" />
                        {formatUsage(record.leadsUsed, record.leadsLimit)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {formatUsage(record.usersUsed, record.usersLimit)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Bot className="h-3.5 w-3.5" />
                        {formatUsage(record.agentsUsed, record.agentsLimit)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.periodEnd ? new Date(record.periodEnd).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2"><Eye className="h-4 w-4" />Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2"><CreditCard className="h-4 w-4" />Subscription</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum registro de billing encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Pagina {pagination.currentPage} de {pagination.pageCount} · {filtered.length} registros encontrados</p>
        <div className="flex items-center gap-2">
          <Link href={buildPageHref('/admin/billing', params, Math.max(1, pagination.currentPage - 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage <= 1}>Anterior</Button></Link>
          <Link href={buildPageHref('/admin/billing', params, Math.min(pagination.pageCount, pagination.currentPage + 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.pageCount}>Proxima</Button></Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <TrendingUp className="h-4 w-4 text-primary" />
          Billing consolidado no front a partir de <code>/api/Billing/plans</code>, <code>{'/api/Billing/subscription/{companyId}'}</code> e <code>{'/api/Billing/usage/{companyId}'}</code>.
        </div>
      </div>
    </div>
  );
}
