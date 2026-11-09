import { club, initials, member } from "./demo-data";

// Decorative pseudo-QR (not scannable). Deterministic so SSR and client match.
function MockQr() {
  const n = 21;
  const cells: React.ReactNode[] = [];
  const finder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (finder(x, y)) continue;
      if ((x * 7 + y * 13 + x * y * 3) % 5 < 2) {
        cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
      }
    }
  }
  const eye = (x: number, y: number) => (
    <g key={`e${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="var(--qr-bg)" />
      <rect x={x + 2} y={y + 2} width="3" height="3" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="dk-qr" aria-hidden fill="currentColor">
      {cells}
      {eye(0, 0)}
      {eye(n - 7, 0)}
      {eye(0, n - 7)}
    </svg>
  );
}

export function IdCard() {
  return (
    <div className="dk-idcard" aria-label="Sample member ID card">
      <div className="dk-idcard-sheen" aria-hidden />
      <div className="dk-idcard-top">
        <span className="dk-logo">IW</span>
        <div>
          <p className="dk-idcard-club">{club.name}</p>
          <p className="dk-idcard-sub">{club.city}</p>
        </div>
        <span className="dk-badge">Active</span>
      </div>
      <div className="dk-idcard-body">
        <span className="dk-avatar dk-avatar-lg">{initials(member.name)}</span>
        <div className="dk-idcard-who">
          <p className="dk-idcard-name">{member.name}</p>
          <p className="dk-idcard-plan">{member.plan}</p>
          <p className="dk-idcard-meta">
            {member.id} · Valid till {member.expiry}
          </p>
        </div>
        <MockQr />
      </div>
    </div>
  );
}
