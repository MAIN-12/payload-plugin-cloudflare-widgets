// Shared widget styles — importable from both server and client components

export const widgetCard: React.CSSProperties = {
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '8px',
  padding: '20px',
  height: '100%',
}

export const widgetTitle: React.CSSProperties = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 600,
  color: 'var(--theme-text)',
}

export const widgetSubtext: React.CSSProperties = {
  margin: '2px 0 0',
  fontSize: '12px',
  color: 'var(--theme-elevation-500)',
}

export const loadingState: React.CSSProperties = {
  height: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--theme-elevation-500)',
  fontSize: '13px',
}

export const errorState: React.CSSProperties = {
  height: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--theme-error-500, #ef4444)',
  fontSize: '13px',
}
