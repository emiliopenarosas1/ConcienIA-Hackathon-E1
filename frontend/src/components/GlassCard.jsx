export default function GlassCard({ children, className = '', elevated = false, accent = false, style }) {
  const cls = [
    elevated ? 'glass-elevated' : accent ? 'glass-accent' : 'glass',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}
