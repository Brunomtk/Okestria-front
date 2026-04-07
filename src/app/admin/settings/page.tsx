import {
  Settings,
  Globe,
  Shield,
  Database,
  Server,
  Key,
  Bell,
  Palette,
  Save,
  Link2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { getOkestriaApiBaseUrl, fetchRuntimeConfigStatus, fetchGatewaySettings } from '@/lib/auth/api';
import { requireAdminSession } from '../_lib/admin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function maskTokenPreview(token: string | undefined) {
  if (!token) return 'Nao disponivel';
  if (token.length <= 10) return token;
  return `${token.slice(0, 6)}••••${token.slice(-4)}`;
}

export default async function AdminSettingsPage() {
  const session = await requireAdminSession();
  const [runtimeStatus, gatewaySettings] = await Promise.all([
    fetchRuntimeConfigStatus(session.token!).catch(() => null),
    fetchGatewaySettings(session.token!).catch(() => null),
  ]);

  const apiUrl = getOkestriaApiBaseUrl();
  const gatewayConfigured = gatewaySettings?.configured === true || runtimeStatus?.configured === true;
  const gatewayBaseUrl = gatewaySettings?.baseUrl ?? runtimeStatus?.baseUrl ?? '';
  const hasGatewayToken = gatewaySettings?.hasUpstreamToken === true || runtimeStatus?.hasUpstreamToken === true;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Configuracoes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Painel de referencia do ambiente atual com base nas configuracoes disponiveis no backend.
          </p>
        </div>
        <Button className="gap-2" disabled>
          <Save className="h-4 w-4" />
          Salvar alteracoes
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${gatewayConfigured ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
              {gatewayConfigured ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-amber-500" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Gateway</p>
              <p className="text-xs text-muted-foreground">{gatewayConfigured ? 'Configurado' : 'Pendente'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">API base</p>
              <p className="text-xs text-muted-foreground break-all">{apiUrl}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Key className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Token upstream</p>
              <p className="text-xs text-muted-foreground">{hasGatewayToken ? 'Presente no backend' : 'Nao encontrado'}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="general" className="gap-2"><Settings className="h-4 w-4" />Geral</TabsTrigger>
          <TabsTrigger value="api" className="gap-2"><Server className="h-4 w-4" />API</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" />Seguranca</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" />Notificacoes</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />Configuracoes gerais</CardTitle>
              <CardDescription>Referencias do ambiente carregadas em runtime.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platform-name">Nome da plataforma</Label>
                  <Input id="platform-name" defaultValue="Okestria" readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-language">Idioma padrao</Label>
                  <Input id="default-language" defaultValue="pt-BR" readOnly />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-user">Sessao atual</Label>
                <Input id="session-user" defaultValue={`${session.fullName ?? 'Administrador'}${session.email ? ` · ${session.email}` : ''}`} readOnly />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Modo administracao</p>
                  <p className="text-sm text-muted-foreground">Painel ligado a dados reais do backend.</p>
                </div>
                <Switch checked disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Aparencia</CardTitle>
              <CardDescription>Preferencias visuais e informacoes de branding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Sidebar lateral fixa</p>
                  <p className="text-sm text-muted-foreground">Navegacao administrativa organizada por modulo.</p>
                </div>
                <Switch checked disabled />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Tema escuro habilitado</p>
                  <p className="text-sm text-muted-foreground">Interface alinhada com o visual atual do projeto.</p>
                </div>
                <Switch checked disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-primary" />API e gateway</CardTitle>
              <CardDescription>Status real das configuracoes consultadas no backend.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">URL da API backend</Label>
                <Input id="api-url" defaultValue={apiUrl} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gateway-url">URL do gateway</Label>
                <Input id="gateway-url" defaultValue={gatewayBaseUrl || 'Nao configurado'} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gateway-token">Token upstream</Label>
                <Input id="gateway-token" defaultValue={maskTokenPreview(gatewaySettings?.upstreamToken)} readOnly />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium text-foreground">Runtime configurado</p>
                    <p className="text-sm text-muted-foreground">Baseado em /api/Runtime/config-status</p>
                  </div>
                  <Switch checked={gatewayConfigured} disabled />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium text-foreground">Token presente</p>
                    <p className="text-sm text-muted-foreground">Disponibilidade retornada pelo backend</p>
                  </div>
                  <Switch checked={hasGatewayToken} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" />Conectividade</CardTitle>
              <CardDescription>Indicadores simples baseados nos endpoints acessados com sucesso.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center gap-3 rounded-lg border p-4 ${gatewayConfigured ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${gatewayConfigured ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                  <Link2 className={`h-5 w-5 ${gatewayConfigured ? 'text-emerald-500' : 'text-amber-500'}`} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{gatewayConfigured ? 'Gateway configurado' : 'Gateway pendente'}</p>
                  <p className="text-sm text-muted-foreground">{gatewayBaseUrl || 'Defina a URL e o token no backend para concluir a integracao.'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5 text-primary" />Autenticacao</CardTitle>
              <CardDescription>Leituras de referencia para o ambiente atual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Sessao autenticada</p>
                  <p className="text-sm text-muted-foreground">Acesso validado pelo guard do admin.</p>
                </div>
                <Switch checked disabled />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Token backend presente</p>
                  <p className="text-sm text-muted-foreground">Necessario para consultar todos os modulos administrativos.</p>
                </div>
                <Switch checked disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Perfil atual</Label>
                <Input id="role" defaultValue={session.role ?? (session.roleType === 1 ? 'admin' : 'user')} readOnly />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Politicas</CardTitle>
              <CardDescription>Itens visuais mantidos como referencia ate existir endpoint proprio de settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">2FA para admins</p>
                  <p className="text-sm text-muted-foreground">Placeholder visual. O back atual nao expõe endpoint dedicado para isso.</p>
                </div>
                <Switch disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-policy">Politica de senha</Label>
                <Input id="password-policy" defaultValue="A definir via endpoint /api/Admin/Settings futuramente" readOnly />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Notificacoes</CardTitle>
              <CardDescription>Seccao pronta visualmente, aguardando endpoints especificos de configuracao.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Alertas de erro</p>
                  <p className="text-sm text-muted-foreground">Mantido como referencia de UX para a camada futura de settings.</p>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Eventos de faturamento</p>
                  <p className="text-sm text-muted-foreground">Ligacao real ainda depende de endpoint administrativo proprio.</p>
                </div>
                <Switch disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
