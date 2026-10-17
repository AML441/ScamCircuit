import type { ReactNode } from "react";

const icons = {
  circuit: <><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3" /><path d="m8 12 3 3 5-6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z" /></>,
  message: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-1 1v-9.5a8.5 8.5 0 1 1 18 0Z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>,
  phone: <path d="m7 3 3 4-2 3a15 15 0 0 0 6 6l3-2 4 3-1 4C10 22 2 14 3 4Z" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  arrowRight: <path d="M4 12h16m-6-6 6 6-6 6" />,
  arrowLeft: <path d="M20 12H4m6-6-6 6 6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  upload: <path d="M12 16V3m-5 5 5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8m-8 4h5" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  edit: <path d="m15 4 5 5M4 20l4-1L21 6a2 2 0 0 0-5-5L3 14l-1 6Z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.01" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h3" /></>,
};

export type IconName = keyof typeof icons;

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}

export function StepHeading({ step, title, description, optional = false }: { step: string; title: string; description: string; optional?: boolean }) {
  return <header className="step-heading"><div className="eyebrow"><span className="status-dot" />{step}</div><h1>{title}</h1><p>{description}</p><div className="heading-note">{optional ? "This step is optional" : "All fields are required unless marked optional"}</div></header>;
}

export function FormSection({ number, title, description, children, id }: { number: string; title: string; description: string; children: ReactNode; id: string }) {
  return <section className="form-section" aria-labelledby={id}><div className="section-heading"><span className="section-number">{number}</span><div><h2 id={id}>{title}</h2><p>{description}</p></div></div><div className="section-fields">{children}</div></section>;
}

export function Field({ id, label, optional = false, hint, children }: { id: string; label: string; optional?: boolean; hint?: string; children: ReactNode }) {
  return <div className="field"><label className="field-label" htmlFor={id}>{label}{optional && <span className="optional">Optional</span>}</label>{children}{hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}</div>;
}

export function ErrorNotice({ message }: { message: string }) {
  return <div role="alert" className="error-notice"><Icon name="info" /><span>{message}</span></div>;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceList({ files, onRemove }: { files: File[]; onRemove?: (index: number) => void }) {
  return <ul className="evidence-list">{files.map((file, index) => <li key={`${file.name}-${index}`} className="evidence-file"><span className="file-icon"><Icon name="file" /></span><div className="file-details"><span className="file-name">{file.name}</span><span className="file-size">{formatFileSize(file.size)}</span></div>{onRemove ? <button type="button" className="icon-button" onClick={() => onRemove(index)} aria-label={`Remove ${file.name}`}><Icon name="close" /></button> : <span className="file-ready"><Icon name="check" />Ready</span>}</li>)}</ul>;
}
