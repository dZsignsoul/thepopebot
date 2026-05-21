// Inline SVG charts for the metrics dashboard. No client-side JS, no chart lib.
// All three components are pure server components that render an <svg>.

const COLOR = {
  succeeded: '#15803d',
  failed: '#b91c1c',
  running: '#1d4ed8',
  started: '#4b5563',
  axis: '#9ca3af',
  text: '#374151',
};

export function StackedBarByDay({ byDay }) {
  const W = 800, H = 220, PADL = 32, PADR = 16, PADT = 16, PADB = 32;
  const cols = byDay.length;
  if (cols === 0) return null;
  const innerW = W - PADL - PADR;
  const innerH = H - PADT - PADB;
  const colW = innerW / cols;
  const maxTotal = Math.max(1, ...byDay.map(d => d.total));
  const yScale = (v) => (v / maxTotal) * innerH;

  // Y-axis tick lines at 0, 25%, 50%, 75%, 100%
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PADT + innerH - f * innerH,
    label: Math.round(f * maxTotal),
  }));

  // Show every 5th day's label (so 30d = 6 labels).
  const labelEvery = Math.max(1, Math.floor(cols / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto' }}>
      {/* Y-axis tick lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PADL} x2={W - PADR} y1={t.y} y2={t.y} stroke={COLOR.axis} strokeWidth="0.5" strokeDasharray={i === 0 ? '' : '2 2'} />
          <text x={PADL - 4} y={t.y + 4} fontSize="10" fill={COLOR.text} textAnchor="end">{t.label}</text>
        </g>
      ))}

      {/* Stacked bars */}
      {byDay.map((d, i) => {
        const x = PADL + i * colW + colW * 0.15;
        const w = colW * 0.7;
        const succH = yScale(d.succeeded);
        const failH = yScale(d.failed);
        const succY = PADT + innerH - succH;
        const failY = succY - failH;
        return (
          <g key={d.date}>
            {d.succeeded > 0 && <rect x={x} y={succY} width={w} height={succH} fill={COLOR.succeeded} />}
            {d.failed > 0 && <rect x={x} y={failY} width={w} height={failH} fill={COLOR.failed} />}
            {i % labelEvery === 0 && (
              <text x={x + w / 2} y={H - PADB + 14} fontSize="9" fill={COLOR.text} textAnchor="middle">
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${PADL}, ${PADT - 8})`}>
        <rect width="10" height="10" fill={COLOR.succeeded} />
        <text x="14" y="9" fontSize="10" fill={COLOR.text}>succeeded</text>
        <rect x="80" width="10" height="10" fill={COLOR.failed} />
        <text x="94" y="9" fontSize="10" fill={COLOR.text}>failed</text>
      </g>
    </svg>
  );
}

export function DurationLine({ byDay }) {
  const W = 800, H = 200, PADL = 50, PADR = 16, PADT = 16, PADB = 32;
  const innerW = W - PADL - PADR;
  const innerH = H - PADT - PADB;
  const points = byDay.map((d, i) => ({ x: i, y: d.avg_duration_ms })).filter(p => p.y != null);
  if (points.length === 0) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        <text x={W / 2} y={H / 2} fontSize="12" fill={COLOR.text} textAnchor="middle">No completed runs in range</text>
      </svg>
    );
  }
  const cols = byDay.length;
  const colW = innerW / Math.max(1, cols - 1);
  const maxMs = Math.max(1, ...points.map(p => p.y));
  const yScale = (v) => PADT + innerH - (v / maxMs) * innerH;
  const xScale = (i) => PADL + i * colW;

  const yTicks = [0, 0.5, 1].map(f => ({ y: PADT + innerH - f * innerH, label: fmtMsShort(Math.round(f * maxMs)) }));
  const labelEvery = Math.max(1, Math.floor(cols / 6));

  const polyPoints = points.map(p => `${xScale(p.x)},${yScale(p.y)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PADL} x2={W - PADR} y1={t.y} y2={t.y} stroke={COLOR.axis} strokeWidth="0.5" strokeDasharray={i === 0 ? '' : '2 2'} />
          <text x={PADL - 4} y={t.y + 4} fontSize="10" fill={COLOR.text} textAnchor="end">{t.label}</text>
        </g>
      ))}
      <polyline points={polyPoints} fill="none" stroke={COLOR.running} strokeWidth="1.5" />
      {points.map((p, i) => (
        <circle key={i} cx={xScale(p.x)} cy={yScale(p.y)} r="2" fill={COLOR.running} />
      ))}
      {byDay.map((d, i) => i % labelEvery === 0 && (
        <text key={d.date} x={xScale(i)} y={H - PADB + 14} fontSize="9" fill={COLOR.text} textAnchor="middle">{d.date.slice(5)}</text>
      ))}
    </svg>
  );
}

export function RepoFailureBars({ byRepo }) {
  if (byRepo.length === 0) {
    return <div className="text-sm text-gray-500">No repo activity in range.</div>;
  }
  const max = Math.max(1, ...byRepo.map(r => r.total));
  return (
    <div className="space-y-2">
      {byRepo.map(r => {
        const succPct = (r.succeeded / max) * 100;
        const failPct = (r.failed / max) * 100;
        return (
          <div key={r.target_repo} className="text-sm">
            <div className="flex justify-between mb-0.5">
              <span className="font-mono text-xs text-gray-700">{r.target_repo}</span>
              <span className="text-xs text-gray-500">
                <span className="text-green-700">{r.succeeded}</span>
                {' / '}
                <span className="text-red-700">{r.failed}</span>
                {' / '}
                <span className="text-gray-600">{r.total}</span>
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded overflow-hidden flex">
              <div style={{ width: `${succPct}%` }} className="bg-green-600"></div>
              <div style={{ width: `${failPct}%` }} className="bg-red-600"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtMsShort(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
