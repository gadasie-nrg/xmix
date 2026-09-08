import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ActivityKind,
  AdminRole,
  getGetAdminOverviewQueryKey,
  getGetInstitutionQueryKey,
  getListInstitutionsQueryKey,
  getListInstitutionUsersQueryKey,
  InstitutionStatus,
  UserStatus,
  useCreateInstitution,
  useEnrollMobileUser,
  useEnrollUser,
  useGetAdminOverview,
  useGetInstitution,
  useListInstitutions,
  useListInstitutionUsers,
  useRevokeUser,
  useUpdateInstitution,
  type Activity,
  type AdminOverview,
  type Institution,
  type User,
} from '@workspace/api-client-react';
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  GraduationCap,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Route, Switch, Link, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function formatDate(value?: string, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : { year: 'numeric' }),
  }).format(date);
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'XM';
}

function getErrorMessage(error: unknown) {
  if (!error) return 'Something went wrong. Please try again.';
  if (typeof error === 'object' && error !== null && 'message' in error) return String(error.message);
  return 'Something went wrong. Please try again.';
}

function Button({
  children, variant = 'primary', className = '', disabled, ...props
}: { children: ReactNode; variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; className?: string; disabled?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:brightness-95',
    secondary: 'border border-border bg-card text-foreground hover:bg-secondary',
    quiet: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
    danger: 'border border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10',
  };
  return (
    <button
      {...props}
      disabled={disabled}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-[12px] font-bold tracking-[.01em] transition-all duration-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status, type = 'institution' }: { status: string; type?: 'institution' | 'user' }) {
  const positive = status === (type === 'institution' ? InstitutionStatus.active : UserStatus.active);
  return (
    <span data-testid={`status-${type}-${status}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.12em] ${positive ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-accent-foreground'}`}>
      <span className={`size-1.5 rounded-full ${positive ? 'bg-primary' : 'bg-accent'}`} />
      {status}
    </span>
  );
}

function Avatar({ name, tone = 'green' }: { name?: string; tone?: 'green' | 'orange' | 'blue' }) {
  const tones = { green: 'bg-primary/12 text-primary', orange: 'bg-accent/15 text-accent-foreground', blue: 'bg-sky-500/12 text-sky-700' };
  return <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold ${tones[tone]}`} aria-label={name}>{initials(name)}</span>;
}

function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3" data-testid="loading-content">{Array.from({ length: rows }).map((_, i) => <div key={i} className="xm-skeleton h-14 w-full rounded-xl" />)}</div>;
}

function QueryError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-14 text-center" data-testid="error-state">
      <XCircle className="mb-3 size-7 text-destructive" />
      <h3 className="text-sm font-extrabold">We couldn’t load this view</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{getErrorMessage(error)}</p>
      <Button variant="secondary" className="mt-5" onClick={retry} data-testid="button-retry"><RefreshCw className="size-3.5" /> Try again</Button>
    </div>
  );
}

function Modal({ title, eyebrow, children, onClose, wide = false }: { title: string; eyebrow?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-2xl sm:rounded-2xl sm:p-7 ${wide ? 'max-w-2xl' : 'max-w-lg'}`} role="dialog" aria-modal="true" aria-label={title} data-testid="dialog-modal">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {eyebrow && <div className="font-mono text-[10px] font-medium uppercase tracking-[.16em] text-primary">{eyebrow}</div>}
            <h2 className="mt-1 text-xl font-extrabold tracking-[-.03em]">{title}</h2>
          </div>
          <button className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground" onClick={onClose} aria-label="Close dialog" data-testid="button-close-dialog"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, required = false, testId }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean; testId: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.1em] text-muted-foreground">{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} data-testid={testId} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
    </label>
  );
}

function CreateInstitutionDialog({ onClose }: { onClose: () => void }) {
  const createInstitution = useCreateInstitution();
  const [form, setForm] = useState({ name: '', adminName: '', adminEmail: '', licenseSeats: '30' });
  const [message, setMessage] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    createInstitution.mutate({ data: { ...form, licenseSeats: Number(form.licenseSeats) } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInstitutionsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() }); onClose(); },
      onError: (error) => setMessage(getErrorMessage(error)),
    });
  };
  return (
    <Modal title="Add an institution" eyebrow="New license pool" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Institution name" value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="e.g. Beacon Hill Learning Centre" required testId="input-institution-name" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Institution admin" value={form.adminName} onChange={(adminName) => setForm({ ...form, adminName })} placeholder="Full name" required testId="input-admin-name" />
          <Field label="Admin email" value={form.adminEmail} onChange={(adminEmail) => setForm({ ...form, adminEmail })} type="email" placeholder="admin@institution.org" required testId="input-admin-email" />
        </div>
        <Field label="License seats" value={form.licenseSeats} onChange={(licenseSeats) => setForm({ ...form, licenseSeats })} type="number" required testId="input-license-seats" />
        {message && <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs font-semibold text-destructive" data-testid="text-mutation-error">{message}</p>}
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="quiet" onClick={onClose} data-testid="button-cancel-institution">Cancel</Button><Button type="submit" disabled={createInstitution.isPending} data-testid="button-submit-institution">{createInstitution.isPending && <Loader2 className="size-3.5 animate-spin" />} Create institution</Button></div>
      </form>
    </Modal>
  );
}

function InviteDialog({ institution, onClose }: { institution: Institution; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { if (!institution.joinCode) return; await navigator.clipboard?.writeText(institution.joinCode); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return (
    <Modal title="Institution join code" eyebrow={institution.name} onClose={onClose}>
      <p className="text-sm leading-6 text-muted-foreground">This is the permanent code for this institution. Give it to new users so they can enter it in the XmiX app and link themselves to this workspace.</p>
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Link2 className="size-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 font-mono text-2xl font-bold tracking-[.2em] text-foreground" data-testid="text-invite-code">{institution.joinCode}</span>
        <Button variant="secondary" onClick={copy} disabled={!institution.joinCode} data-testid="button-copy-invite">{copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy code'}</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">This code stays the same so every new user can use the code provided by the institution manager.</p>
      <div className="mt-6 flex justify-end"><Button variant="quiet" onClick={onClose} data-testid="button-close-invite">Done</Button></div>
    </Modal>
  );
}

function UserDialog({ institutionId, joinCode, mobile = false, onClose }: { institutionId: string; joinCode: string; mobile?: boolean; onClose: () => void }) {
  const enrollUser = useEnrollUser();
  const enrollMobile = useEnrollMobileUser();
  const mutation = mobile ? enrollMobile : enrollUser;
  const [form, setForm] = useState({ name: '', email: '', phone: '', deviceId: '' });
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const copyCode = async () => { await navigator.clipboard?.writeText(joinCode); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (mobile) {
      enrollMobile.mutate({ data: { institutionId, name: form.name, email: form.email, phone: form.phone, deviceId: form.deviceId } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInstitutionUsersQueryKey(institutionId) }); onClose(); }, onError: (error) => setMessage(getErrorMessage(error)) });
    } else {
      enrollUser.mutate({ institutionId, data: { name: form.name, email: form.email, phone: form.phone, deviceId: form.deviceId } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInstitutionUsersQueryKey(institutionId) }); queryClient.invalidateQueries({ queryKey: getGetInstitutionQueryKey(institutionId) }); onClose(); }, onError: (error) => setMessage(getErrorMessage(error)) });
    }
  };
  return (
    <Modal title={mobile ? 'Enroll from mobile' : 'Add a user'} eyebrow={mobile ? 'Mobile handoff' : 'User roster'} onClose={onClose}>
      <p className="text-sm leading-6 text-muted-foreground">{mobile ? 'Use this to validate a mobile enrollment handoff with a device identifier.' : 'Add a user directly when a link is not the right fit.'}</p>
      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-primary">For self-service mobile linking</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Give the new user this permanent institution code. They enter it in the XmiX app.</p>
          </div>
          <Button variant="secondary" onClick={copyCode} data-testid="button-copy-user-join-code">{copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy'}</Button>
        </div>
        <div className="mt-3 font-mono text-2xl font-extrabold tracking-[.2em] text-primary" data-testid="text-user-join-code">{joinCode}</div>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="User name" value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="Full name" required testId="input-user-name" />
        <Field label="Email address" value={form.email} onChange={(email) => setForm({ ...form, email })} type="email" placeholder="user@institution.org" required testId="input-user-email" />
        <Field label="Phone number" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} type="tel" placeholder="+1 555 123 4567" required testId="input-user-phone" />
        <Field label="Device ID" value={form.deviceId} onChange={(deviceId) => setForm({ ...form, deviceId })} placeholder="Provided by the XmiX app" required testId="input-device-id" />
        {message && <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs font-semibold text-destructive" data-testid="text-mutation-error">{message}</p>}
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="quiet" onClick={onClose} data-testid="button-cancel-user">Cancel</Button><Button type="submit" disabled={mutation.isPending} data-testid="button-submit-user">{mutation.isPending && <Loader2 className="size-3.5 animate-spin" />} Enroll user</Button></div>
      </form>
    </Modal>
  );
}

function Shell({ children, role, setRole, institutionId, setInstitutionId }: { children: ReactNode; role: AdminRole; setRole: (role: AdminRole) => void; institutionId: string; setInstitutionId: (value: string) => void }) {
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notice, setNotice] = useState('');
  const [location] = useLocation();
  const institutionsQuery = useListInstitutions();
  const institutions = institutionsQuery.data?.institutions ?? [];
  const isInstitutions = location.includes('/institutions');
  const showNotice = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 2600); };
  return (
    <div className="xm-shell flex min-h-[100dvh] text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[246px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0 ${collapsed ? 'lg:w-[78px]' : 'lg:w-[246px]'} ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`} data-testid="sidebar">
        <div className="xm-sidebar-pattern pointer-events-none absolute inset-0" />
        <div className="relative flex h-[82px] items-center border-b border-sidebar-border px-5">
          <Link href="/" className="group flex items-center gap-3" data-testid="link-brand">
            <span className="relative flex size-9 items-center justify-center rounded-[13px] bg-sidebar-primary text-sidebar-primary-foreground shadow-[3px_3px_0_hsl(16_80%_61%)]"><span className="text-[18px] font-black tracking-[-.14em]">xm</span></span>
            {!collapsed && <span className="text-[17px] font-extrabold tracking-[-.05em]">XmiX<span className="text-sidebar-primary">.</span></span>}
          </Link>
          <button className="ml-auto rounded-lg p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation" data-testid="button-close-navigation"><X className="size-4" /></button>
        </div>
        <div className="relative flex-1 px-3 py-6">
          {!collapsed && <div className="px-3 pb-3 font-mono text-[9px] font-medium uppercase tracking-[.17em] text-sidebar-foreground/45">Workspace</div>}
          <nav className="space-y-1">
            <Link href="/" onClick={() => setMobileNav(false)} className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-[12px] font-bold transition ${!isInstitutions ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`} data-testid="link-dashboard"><LayoutDashboard className="size-[17px] shrink-0" />{!collapsed && 'Overview'}</Link>
             <Link href="/institutions" onClick={() => setMobileNav(false)} className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-[12px] font-bold transition ${isInstitutions ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`} data-testid="link-institutions"><Building2 className="size-[17px] shrink-0" />{!collapsed && 'Institutions & licenses'}</Link>
          </nav>
          {!collapsed && <div className="mt-10 px-3 pb-3 font-mono text-[9px] font-medium uppercase tracking-[.17em] text-sidebar-foreground/45">Your account</div>}
          <div className={`flex items-center gap-3 rounded-xl px-3 py-3 ${collapsed ? 'justify-center' : ''} bg-sidebar-accent/60`}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary/15 text-[10px] font-extrabold text-sidebar-primary">AR</span>
            {!collapsed && <div className="min-w-0"><div className="truncate text-[11px] font-bold">Alex Rivera</div><div className="truncate text-[10px] text-sidebar-foreground/50">{role === AdminRole.super_admin ? 'Super Admin' : 'Institution Admin'}</div></div>}
          </div>
        </div>
        <div className="relative border-t border-sidebar-border p-3">
          <button onClick={() => showNotice('Workspace settings are managed by your organization owner.')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[11px] font-bold text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-sidebar-settings"><Settings2 className="size-4" />{!collapsed && 'Workspace settings'}</button>
          <button onClick={() => showNotice('Sign out is handled by your XmiX identity provider.')} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[11px] font-bold text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-sidebar-logout"><LogOut className="size-4" />{!collapsed && 'Sign out'}</button>
        </div>
      </aside>
      {mobileNav && <button className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close menu overlay" data-testid="button-menu-overlay" />}
      <main className="min-w-0 flex-1">
        <header className="flex h-[82px] items-center justify-between border-b border-border bg-card/75 px-4 backdrop-blur-md sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu className="size-5" /></button>
            <button className="hidden rounded-lg p-2 text-muted-foreground transition hover:bg-secondary lg:block" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} data-testid="button-toggle-sidebar">{collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}</button>
            <div className="hidden items-center gap-2 text-[11px] font-semibold text-muted-foreground sm:flex"><span>Workspace</span><ChevronDown className="size-3" /><span className="font-extrabold text-foreground">{isInstitutions ? 'Institutions & licenses' : 'Overview'}</span></div>
          </div>
          <div className="flex items-center gap-2.5">
            {role === AdminRole.institution_admin && institutions.length > 0 && <select value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} className="hidden h-9 max-w-[180px] rounded-lg border border-border bg-background px-2 text-[11px] font-bold outline-none focus:border-primary sm:block" data-testid="select-institution-context">{institutions.map((institution) => <option key={institution.id} value={institution.id}>{institution.name}</option>)}</select>}
            <div className="hidden items-center gap-1 rounded-lg border border-border bg-background p-1 sm:flex" data-testid="role-switcher">
              <button className={`rounded-md px-2.5 py-1.5 text-[10px] font-extrabold transition ${role === AdminRole.super_admin ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setRole(AdminRole.super_admin)} data-testid="button-role-super-admin">Super Admin</button>
              <button className={`rounded-md px-2.5 py-1.5 text-[10px] font-extrabold transition ${role === AdminRole.institution_admin ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setRole(AdminRole.institution_admin)} data-testid="button-role-institution-admin">Institution Admin</button>
            </div>
            <button onClick={() => showNotice('You’re all caught up.')} className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Notifications" data-testid="button-notifications"><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" /><ShieldCheck className="size-[18px]" /></button>
            <div className="hidden size-9 items-center justify-center rounded-xl bg-foreground text-[11px] font-extrabold text-background sm:flex" data-testid="avatar-current-user">AR</div>
          </div>
        </header>
        {notice && <div className="fixed bottom-5 right-5 z-30 rounded-xl border border-border bg-card px-4 py-3 text-xs font-bold text-foreground shadow-xl" role="status" data-testid="status-shell-notice">{notice}</div>}
        <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">{children}</div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, sub, icon, tone = 'green', index }: { label: string; value: string | number; sub: string; icon: ReactNode; tone?: 'green' | 'orange' | 'blue'; index: number }) {
  const accents = { green: 'bg-primary/10 text-primary', orange: 'bg-accent/13 text-accent-foreground', blue: 'bg-sky-500/10 text-sky-700' };
  return <div className={`xm-card xm-stagger xm-stagger-${index} rounded-2xl p-5`} data-testid={`card-metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-start justify-between"><div className={`flex size-9 items-center justify-center rounded-xl ${accents[tone]}`}>{icon}</div><MoreHorizontal className="size-4 text-muted-foreground/55" /></div><div className="mt-5 text-[28px] font-extrabold tracking-[-.06em]" data-testid={`value-metric-${index}`}>{value}</div><div className="mt-1 flex items-center justify-between gap-2"><span className="text-[11px] font-bold text-muted-foreground">{label}</span><span className="font-mono text-[10px] text-muted-foreground">{sub}</span></div></div>;
}

function ActivityFeed({ activities }: { activities: Activity[] }) {
  const iconFor = (kind: string) => kind === ActivityKind.institution_created ? <Building2 className="size-3.5" /> : kind === ActivityKind.user_revoked ? <XCircle className="size-3.5" /> : <UserPlus className="size-3.5" />;
  if (!activities.length) return <div className="py-10 text-center" data-testid="empty-activity"><Clipboard className="mx-auto size-6 text-muted-foreground/50" /><p className="mt-2 text-xs font-semibold text-muted-foreground">Activity will appear here as your workspace changes.</p></div>;
  return <div className="divide-y divide-border/70">{activities.map((activity, index) => <div key={activity.id} className="flex gap-3 py-4 first:pt-1 last:pb-1" data-testid={`row-activity-${activity.id}`}><div className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${index % 2 ? 'bg-accent/12 text-accent-foreground' : 'bg-primary/10 text-primary'}`}>{iconFor(activity.kind)}</div><div className="min-w-0 flex-1"><p className="text-xs font-semibold leading-5">{activity.message}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{formatDate(activity.createdAt, true)}</p></div></div>)}</div>;
}

function OverviewPage({ role, institutionId, onAddInstitution }: { role: AdminRole; institutionId: string; onAddInstitution: () => void }) {
  const overviewQuery = useGetAdminOverview(role === AdminRole.institution_admin ? { role, institutionId } : { role });
  const overview = overviewQuery.data as AdminOverview | undefined;
  const utilization = Math.min(100, Math.max(0, overview?.utilizationPercent ?? 0));
  if (overviewQuery.isLoading) return <><PageHeading title="Good morning, Alex" description="Here’s the pulse of your XmiX workspace." /><LoadingBlock rows={5} /></>;
  if (overviewQuery.isError) return <><PageHeading title="Good morning, Alex" description="Here’s the pulse of your XmiX workspace." /><QueryError error={overviewQuery.error} retry={() => overviewQuery.refetch()} /></>;
  return (
    <div className="space-y-7">
      <PageHeading title={role === AdminRole.super_admin ? 'Good morning, Alex' : overview?.institution?.name || 'Your institution workspace'} description={role === AdminRole.super_admin ? 'A clear view of every institution, seat, and user in your care.' : 'Keep your users connected and your private sharing moving.'}>
        {role === AdminRole.super_admin && <Button onClick={onAddInstitution} data-testid="button-add-institution"><Plus className="size-4" /> Add institution</Button>}
      </PageHeading>
       <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard index={1} label={role === AdminRole.super_admin ? 'Institutions' : 'Institution status'} value={role === AdminRole.super_admin ? overview?.totalInstitutions ?? 0 : overview?.institution?.status ?? '—'} sub={role === AdminRole.super_admin ? 'license pools' : 'workspace'} icon={<Building2 className="size-[18px]" />} />
        <MetricCard index={2} label="Total users" value={overview?.totalUsers ?? 0} sub={`${overview?.activeUsers ?? 0} active`} icon={<Users className="size-[18px]" />} tone="blue" />
        <MetricCard index={3} label="Active users" value={overview?.activeUsers ?? 0} sub="right now" icon={<GraduationCap className="size-[18px]" />} tone="orange" />
        <MetricCard index={4} label="Seat utilization" value={`${utilization}%`} sub={`${overview?.usedSeats ?? 0} / ${overview?.allocatedSeats ?? 0}`} icon={<ShieldCheck className="size-[18px]" />} />
      </div>
       {role === AdminRole.institution_admin && overview?.institution && (
         <section className="xm-card rounded-2xl border-primary/25 bg-primary/[.06] p-5 sm:p-6" data-testid="card-overview-permanent-code">
           <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
             <div>
               <div className="font-mono text-[10px] uppercase tracking-[.14em] text-primary">Activation for new users</div>
               <h2 className="mt-1 text-lg font-extrabold tracking-[-.04em]">Permanent institution code</h2>
               <p className="mt-1 text-xs text-muted-foreground">Share this six-character code with independent XmiX users so they can activate their devices.</p>
             </div>
             <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-card px-4 py-3">
               <span className="font-mono text-2xl font-extrabold tracking-[.2em] text-primary" data-testid="text-overview-permanent-code">{overview.institution.joinCode}</span>
               <Button variant="secondary" onClick={() => { void navigator.clipboard?.writeText(overview.institution!.joinCode); }} data-testid="button-copy-overview-code"><Copy className="size-3.5" /> Copy</Button>
             </div>
           </div>
         </section>
       )}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <section className="xm-card xm-stagger xm-stagger-3 rounded-2xl p-5 sm:p-6" data-testid="card-utilization">
          <div className="flex items-start justify-between gap-5"><div><div className="font-mono text-[10px] uppercase tracking-[.14em] text-primary">Capacity watch</div><h2 className="mt-1 text-lg font-extrabold tracking-[-.04em]">License utilization</h2><p className="mt-1 text-xs text-muted-foreground">Seats currently assigned across your workspace.</p></div><span className="font-mono text-2xl font-medium tracking-[-.08em] text-primary">{utilization}%</span></div>
          <div className="mt-8 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${utilization}%` }} data-testid="progress-utilization" /></div>
          <div className="mt-3 flex justify-between text-[11px] font-semibold text-muted-foreground"><span>{overview?.usedSeats ?? 0} used</span><span>{Math.max(0, (overview?.allocatedSeats ?? 0) - (overview?.usedSeats ?? 0))} seats available</span></div>
          {role === AdminRole.super_admin && <Link href="/institutions" className="mt-7 flex items-center justify-between rounded-xl bg-secondary/65 px-4 py-3 text-xs font-extrabold transition hover:bg-secondary" data-testid="link-manage-institutions"><span>Review license pools</span><ArrowRight className="size-4" /></Link>}
        </section>
        <section className="xm-card xm-stagger xm-stagger-4 rounded-2xl p-5 sm:p-6" data-testid="card-activity"><div className="flex items-center justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.14em] text-primary">Audit trail</div><h2 className="mt-1 text-lg font-extrabold tracking-[-.04em]">Recent activity</h2></div><div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Clipboard className="size-4" /></div></div><div className="mt-5"><ActivityFeed activities={overview?.recentActivity ?? []} /></div></section>
      </div>
    </div>
  );
}

function PageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.17em] text-primary"><span className="size-1.5 rounded-full bg-primary" />Operations cockpit</div><h1 className="text-[30px] font-extrabold tracking-[-.07em] sm:text-[36px]" data-testid="heading-page">{title}</h1><p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{description}</p></div>{children && <div className="shrink-0">{children}</div>}</div>;
}

function InstitutionsPage({ onAddInstitution }: { onAddInstitution: () => void }) {
  const query = useListInstitutions();
  const [search, setSearch] = useState('');
  const institutions = useMemo(() => (query.data?.institutions ?? []).filter((institution) => `${institution.name} ${institution.adminName} ${institution.adminEmail}`.toLowerCase().includes(search.toLowerCase())), [query.data?.institutions, search]);
  return <div className="space-y-7"><PageHeading title="Institutions & licenses" description="Manage institution workspaces, license pools, and access at a glance."><Button onClick={onAddInstitution} data-testid="button-add-institution"><Plus className="size-4" /> Add institution</Button></PageHeading>
      {query.isLoading ? <LoadingBlock rows={5} /> : query.isError ? <QueryError error={query.error} retry={() => query.refetch()} /> : institutions.length === 0 ? <div className="xm-card rounded-2xl py-16 text-center" data-testid="empty-institutions"><Building2 className="mx-auto size-8 text-muted-foreground/40" /><h3 className="mt-4 text-sm font-extrabold">{search ? 'No institutions match that search' : 'No institutions yet'}</h3><p className="mt-1 text-xs text-muted-foreground">{search ? 'Try another institution name or admin email.' : 'Create the first institution workspace to get started.'}</p>{!search && <Button className="mt-5" onClick={onAddInstitution} data-testid="button-empty-add-institution"><Plus className="size-4" /> Add institution</Button>}</div> : <div className="xm-card overflow-hidden rounded-2xl" data-testid="table-institutions"><div className="hidden grid-cols-[minmax(200px,1.35fr)_minmax(115px,.7fr)_minmax(140px,.7fr)_minmax(145px,1fr)_90px] gap-4 border-b border-border bg-secondary/45 px-5 py-3 font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground md:grid"><span>Institution</span><span>Permanent code</span><span>License pool</span><span>Admin</span><span>Status</span></div><div className="divide-y divide-border/70">{institutions.map((institution) => <InstitutionRow key={institution.id} institution={institution} />)}</div></div>}
  </div>;
}

function InstitutionRow({ institution }: { institution: Institution }) {
  const utilization = institution.licenseSeats ? Math.round((institution.activeUsers / institution.licenseSeats) * 100) : 0;
  return <Link href={`/institutions/${institution.id}`} className="group grid gap-3 px-5 py-4 transition hover:bg-secondary/35 md:grid-cols-[minmax(200px,1.35fr)_minmax(115px,.7fr)_minmax(140px,1fr)_minmax(145px,1fr)_90px] md:items-center md:gap-4" data-testid={`row-institution-${institution.id}`}><div className="flex min-w-0 items-center gap-3"><Avatar name={institution.name} /><div className="min-w-0"><div className="truncate text-sm font-extrabold">{institution.name}</div><div className="mt-0.5 font-mono text-[10px] text-muted-foreground">Added {formatDate(institution.createdAt)}</div><div className="mt-1 font-mono text-[10px] font-bold tracking-[.15em] text-primary md:hidden">CODE: {institution.joinCode}</div></div><ArrowRight className="ml-auto size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" /></div><div className="rounded-lg bg-primary/8 px-2.5 py-2 md:bg-transparent md:px-0 md:py-0"><div className="font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground md:hidden">Permanent code</div><div className="font-mono text-sm font-extrabold tracking-[.16em] text-primary" data-testid={`text-join-code-${institution.id}`}>{institution.joinCode}</div></div><div><div className="flex items-center justify-between text-[11px] font-bold"><span>{institution.activeUsers} / {institution.licenseSeats} seats</span><span className={utilization > 85 ? 'text-accent-foreground' : 'text-muted-foreground'}>{utilization}%</span></div><div className="mt-2 h-1.5 rounded-full bg-secondary"><div className={`h-full rounded-full ${utilization > 85 ? 'bg-accent' : 'bg-primary'}`} style={{ width: `${Math.min(100, utilization)}%` }} /></div></div><div className="min-w-0"><div className="truncate text-xs font-bold">{institution.adminName}</div><div className="truncate font-mono text-[10px] text-muted-foreground">{institution.adminEmail}</div></div><div className="flex items-center justify-between md:block"><StatusPill status={institution.status} /><span className="font-mono text-[10px] text-muted-foreground md:hidden">{utilization}% used</span></div></Link>;
}

function InstitutionDetailPage() {
  const { institutionId = '' } = useParams<{ institutionId: string }>();
  const institutionQuery = useGetInstitution(institutionId);
  const usersQuery = useListInstitutionUsers(institutionId);
  const updateInstitution = useUpdateInstitution();
  const revokeUser = useRevokeUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const institution = institutionQuery.data as Institution | undefined;
  const users = useMemo(() => (usersQuery.data?.users ?? []).filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(userSearch.toLowerCase())), [usersQuery.data?.users, userSearch]);
  if (institutionQuery.isLoading) return <><PageHeading title="Loading institution" description="Fetching workspace details." /><LoadingBlock rows={5} /></>;
  if (institutionQuery.isError || !institution) return <><Link href="/institutions" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground" data-testid="link-back-institutions"><ArrowRight className="size-3 rotate-180" /> Back to institutions</Link><QueryError error={institutionQuery.error} retry={() => institutionQuery.refetch()} /></>;
  const utilization = institution.licenseSeats ? Math.round((institution.activeUsers / institution.licenseSeats) * 100) : 0;
  const toggleStatus = () => updateInstitution.mutate({ institutionId, data: { status: institution.status === InstitutionStatus.active ? InstitutionStatus.paused : InstitutionStatus.active } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetInstitutionQueryKey(institutionId) }) });
  return <div className="space-y-7">
    <Link href="/institutions" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-foreground" data-testid="link-back-institutions"><ArrowRight className="size-3 rotate-180" /> Back to institutions</Link>
     <PageHeading title={institution.name} description={`Workspace created ${formatDate(institution.createdAt)} · managed by ${institution.adminName}`}><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setEditOpen(true)} data-testid="button-edit-institution"><Settings2 className="size-3.5" /> Edit details</Button><Button onClick={() => setInviteOpen(true)} data-testid="button-open-invite"><Link2 className="size-3.5" /> Show permanent code</Button></div></PageHeading>
     <section className="xm-card rounded-2xl border-primary/25 bg-primary/[.06] p-5 sm:p-6" data-testid="card-permanent-join-code"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.14em] text-primary">Give this to new users</div><h2 className="mt-1 text-lg font-extrabold tracking-[-.04em]">Permanent institution code</h2><p className="mt-1 text-xs text-muted-foreground">Users enter this code in the XmiX app to link their device to this institution.</p></div><div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-card px-4 py-3"><span className="font-mono text-2xl font-extrabold tracking-[.2em] text-primary" data-testid="text-permanent-join-code">{institution.joinCode}</span><Button variant="secondary" onClick={() => { void navigator.clipboard?.writeText(institution.joinCode); }} data-testid="button-copy-permanent-code"><Copy className="size-3.5" /> Copy</Button></div></div></section>
    <div className="grid gap-4 sm:grid-cols-3"><MetricCard index={1} label="Active users" value={institution.activeUsers} sub={`${institution.licenseSeats - institution.activeUsers} available`} icon={<Users className="size-[18px]" />} /><MetricCard index={2} label="License utilization" value={`${utilization}%`} sub={`${institution.activeUsers} / ${institution.licenseSeats}`} icon={<ShieldCheck className="size-[18px]" />} tone="orange" /><div className="xm-card xm-stagger xm-stagger-3 flex items-center justify-between rounded-2xl p-5"><div><div className="font-mono text-[10px] uppercase tracking-[.14em] text-primary">Workspace state</div><div className="mt-2"><StatusPill status={institution.status} /></div></div><Button variant={institution.status === InstitutionStatus.active ? 'danger' : 'primary'} onClick={toggleStatus} disabled={updateInstitution.isPending} data-testid="button-toggle-institution-status">{updateInstitution.isPending && <Loader2 className="size-3.5 animate-spin" />}{institution.status === InstitutionStatus.active ? 'Pause access' : 'Resume access'}</Button></div></div>
     <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
       <section className="xm-card overflow-hidden rounded-2xl" data-testid="card-user-roster"><div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><div className="font-mono text-[10px] uppercase tracking-[.14em] text-primary">People with access</div><h2 className="mt-1 text-lg font-extrabold tracking-[-.04em]">User roster</h2></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setInviteOpen(true)} data-testid="button-share-join-code"><Link2 className="size-3.5" /> Share join code</Button><Button onClick={() => setUserOpen(true)} data-testid="button-add-user"><UserPlus className="size-3.5" /> Add user</Button></div></div><div className="border-b border-border p-4"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search roster" className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary" data-testid="input-search-users" /></div></div>{usersQuery.isLoading ? <div className="p-5"><LoadingBlock rows={4} /></div> : usersQuery.isError ? <div className="p-4"><QueryError error={usersQuery.error} retry={() => usersQuery.refetch()} /></div> : users.length === 0 ? <div className="py-14 text-center" data-testid="empty-users"><GraduationCap className="mx-auto size-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-extrabold">{userSearch ? 'No matching users' : 'No users enrolled'}</p><p className="mt-1 text-xs text-muted-foreground">Use an invite link or add a user directly.</p></div> : <div className="divide-y divide-border/70">{users.map((user) => <UserRow key={user.id} user={user} onRevoke={() => setConfirmRevoke(user.id)} />)}</div>}</section>
        <section className="xm-card rounded-2xl p-5 sm:p-6" data-testid="card-institution-contact"><div className="font-mono text-[10px] uppercase tracking-[.14em] text-primary">Workspace contact</div><h2 className="mt-1 text-lg font-extrabold tracking-[-.04em]">Institution admin</h2><div className="mt-6 flex items-center gap-3"><Avatar name={institution.adminName} tone="orange" /><div><div className="text-sm font-extrabold" data-testid="text-institution-admin">{institution.adminName}</div><div className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground" data-testid="text-institution-admin-email">{institution.adminEmail}</div></div></div><div className="mt-7 rounded-xl bg-secondary/60 p-4"><div className="flex items-center justify-between"><span className="text-[11px] font-bold text-muted-foreground">Permanent code</span><Link2 className="size-4 text-primary" /></div><p className="mt-2 font-mono text-xl font-bold tracking-[.2em] text-foreground">{institution.joinCode}</p><Button variant="secondary" className="mt-4 w-full" onClick={() => setInviteOpen(true)} data-testid="button-manage-invite">View sharing instructions <ArrowRight className="size-3.5" /></Button></div></section>
    </div>
     {inviteOpen && <InviteDialog institution={institution} onClose={() => setInviteOpen(false)} />}
      {userOpen && <UserDialog institutionId={institutionId} joinCode={institution.joinCode} onClose={() => setUserOpen(false)} />}
      {mobileOpen && <UserDialog institutionId={institutionId} joinCode={institution.joinCode} mobile onClose={() => setMobileOpen(false)} />}
     {editOpen && <EditInstitutionDialog institution={institution} onClose={() => setEditOpen(false)} onSaved={() => { queryClient.invalidateQueries({ queryKey: getGetInstitutionQueryKey(institutionId) }); queryClient.invalidateQueries({ queryKey: getListInstitutionsQueryKey() }); setEditOpen(false); }} />}
     {confirmRevoke && <ConfirmRevoke userId={confirmRevoke} isPending={revokeUser.isPending} onClose={() => setConfirmRevoke(null)} onConfirm={() => revokeUser.mutate({ userId: confirmRevoke }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInstitutionUsersQueryKey(institutionId) }); queryClient.invalidateQueries({ queryKey: getGetInstitutionQueryKey(institutionId) }); setConfirmRevoke(null); } })} />}
  </div>;
}

function UserRow({ user, onRevoke }: { user: User; onRevoke: () => void }) {
  return <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" data-testid={`row-user-${user.id}`}><div className="flex min-w-0 items-center gap-3"><Avatar name={user.name} tone="blue" /><div className="min-w-0"><div className="truncate text-sm font-extrabold" data-testid={`text-user-name-${user.id}`}>{user.name}</div><div className="truncate font-mono text-[10px] text-muted-foreground">{user.email}{user.phone ? ` · ${user.phone}` : ''}</div></div></div><div className="flex items-center gap-5 pl-12 sm:pl-0"><div className="hidden text-right sm:block"><div className="font-mono text-[10px] text-muted-foreground">Last active</div><div className="mt-0.5 text-[11px] font-bold">{formatDate(user.lastActiveAt, true)}</div></div><StatusPill status={user.status} type="user" />{user.status === UserStatus.active && <button className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/8 hover:text-destructive" onClick={onRevoke} aria-label={`Revoke ${user.name}`} data-testid={`button-revoke-user-${user.id}`}><XCircle className="size-4" /></button>}</div></div>;
}

function ConfirmRevoke({ userId, isPending, onClose, onConfirm }: { userId: string; isPending: boolean; onClose: () => void; onConfirm: () => void }) {
  return <Modal title="Revoke user access?" eyebrow="This cannot be undone" onClose={onClose}><p className="text-sm leading-6 text-muted-foreground">This user will no longer be able to access the institution workspace. Their existing photos will remain available.</p><div className="mt-7 flex justify-end gap-2"><Button variant="quiet" onClick={onClose} data-testid="button-cancel-revoke">Keep access</Button><Button variant="danger" onClick={onConfirm} disabled={isPending} data-testid="button-confirm-revoke">{isPending && <Loader2 className="size-3.5 animate-spin" />} Revoke access</Button></div></Modal>;
}

function EditInstitutionDialog({ institution, onClose, onSaved }: { institution: Institution; onClose: () => void; onSaved: () => void }) {
  const updateInstitution = useUpdateInstitution();
  const [form, setForm] = useState({ name: institution.name, adminName: institution.adminName, adminEmail: institution.adminEmail, licenseSeats: String(institution.licenseSeats) });
  const [message, setMessage] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); updateInstitution.mutate({ institutionId: institution.id, data: { ...form, licenseSeats: Number(form.licenseSeats) } }, { onSuccess: onSaved, onError: (error) => setMessage(getErrorMessage(error)) }); };
  return <Modal title="Edit institution details" eyebrow="Workspace settings" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Institution name" value={form.name} onChange={(name) => setForm({ ...form, name })} required testId="input-edit-institution-name" /><div className="grid gap-4 sm:grid-cols-2"><Field label="Institution admin" value={form.adminName} onChange={(adminName) => setForm({ ...form, adminName })} required testId="input-edit-admin-name" /><Field label="Admin email" value={form.adminEmail} onChange={(adminEmail) => setForm({ ...form, adminEmail })} type="email" required testId="input-edit-admin-email" /></div><Field label="License seats" value={form.licenseSeats} onChange={(licenseSeats) => setForm({ ...form, licenseSeats })} type="number" required testId="input-edit-license-seats" />{message && <p className="text-xs font-semibold text-destructive" data-testid="text-edit-error">{message}</p>}<div className="flex justify-end gap-2 pt-2"><Button type="button" variant="quiet" onClick={onClose} data-testid="button-cancel-edit">Cancel</Button><Button type="submit" disabled={updateInstitution.isPending} data-testid="button-save-edit">{updateInstitution.isPending && <Loader2 className="size-3.5 animate-spin" />} Save changes</Button></div></form></Modal>;
}

function Router() {
  const [role, setRole] = useState<AdminRole>(AdminRole.super_admin);
  const [institutionId, setInstitutionId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  return <RoutedErrorBoundary><Shell role={role} setRole={setRole} institutionId={institutionId} setInstitutionId={setInstitutionId}><Switch><Route path="/" component={() => <OverviewPage role={role} institutionId={institutionId} onAddInstitution={() => setCreateOpen(true)} />} /><Route path="/institutions" component={() => <InstitutionsPage onAddInstitution={() => setCreateOpen(true)} />} /><Route path="/institutions/:institutionId" component={InstitutionDetailPage} /><Route component={NotFound} /></Switch></Shell>{createOpen && <CreateInstitutionDialog onClose={() => setCreateOpen(false)} />}</RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><div id="toast-root" /></QueryClientProvider>;
}

export default App;