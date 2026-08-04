type LogoAs = 'div' | 'h1' | 'span';

interface PowerJumpingLogoProps {
  as?: LogoAs;
  variant?: 'hero' | 'compact';
  subtitle?: string;
  context?: string;
  className?: string;
}

export default function PowerJumpingLogo({
  as: Tag = 'div',
  variant = 'compact',
  subtitle,
  context,
  className = '',
}: PowerJumpingLogoProps) {
  const classes = ['pj-logo', `pj-logo--${variant}`, className].filter(Boolean).join(' ');
  const label = ['파워점핑', context, subtitle].filter(Boolean).join(' ');

  return (
    <Tag className={classes} aria-label={label}>
      <span className="pj-logo__rope" aria-hidden="true" />
      <span className="pj-logo__word">파워점핑</span>
      {context && <span className="pj-logo__context">{context}</span>}
      {subtitle && <span className="pj-logo__subtitle">{subtitle}</span>}
    </Tag>
  );
}
