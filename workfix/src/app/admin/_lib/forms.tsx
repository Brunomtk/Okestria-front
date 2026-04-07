import { Input } from '@/components/ui/input';

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, name, defaultValue = '', required = false, placeholder = '', type = 'text' }: { label: string; name: string; defaultValue?: string | number; required?: boolean; placeholder?: string; type?: string }) {
  return <label className="space-y-2 block"><span className="text-sm font-medium text-foreground">{label}</span><Input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} /></label>;
}

export function SelectField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue?: string | number; options: { value: string | number; label: string }[] }) {
  return <label className="space-y-2 block"><span className="text-sm font-medium text-foreground">{label}</span><select name={name} defaultValue={String(defaultValue ?? '')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Selecione...</option>{options.map((option) => <option key={option.value} value={String(option.value)}>{option.label}</option>)}</select></label>;
}

export function TextareaField({ label, name, defaultValue = '', placeholder = '' }: { label: string; name: string; defaultValue?: string; placeholder?: string }) {
  return <label className="space-y-2 block"><span className="text-sm font-medium text-foreground">{label}</span><textarea name={name} defaultValue={defaultValue} placeholder={placeholder} className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>;
}
