/**
 * RunnableCode - A runnable SQL code block component for ClickHouse docs.
 *
 * Props:
 *   sql        - The SQL query string
 *   run        - If true, auto-run on mount (default: false)
 *   title      - Optional title above the code block
 *   showStats  - Show query statistics (default: true)
 */
export const RunnableCode = ({ sql, run = false, title, showStats = true }) => {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [stats, setStats] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(-1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const check = () => setIsDark(document.documentElement.classList.contains('dark'));
      check();
      const observer = new MutationObserver(check);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, []);

  const executeQuery = async () => {
    if (!sql) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setShowResults(true);

    try {
      const cleanQuery = sql.replace(/;$/, '').trim();
      const params = new URLSearchParams({
        query: cleanQuery,
        default_format: 'JSONCompact',
        result_overflow_mode: 'break',
        read_overflow_mode: 'break',
        allow_experimental_analyzer: '1',
      });

      const res = await fetch(`https://sql-clickhouse.clickhouse.com/?${params.toString()}`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${btoa(`demo:`)}` },
      });

      const text = await res.text();

      if (!res.ok) {
        setError(text || `HTTP ${res.status}`);
        setLoading(false);
        return;
      }

      const json = JSON.parse(text);
      setResults(json);
      setStats(json.statistics || null);
    } catch (err) {
      setError(err.message || 'Query execution failed');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (run) executeQuery();
  }, []);

  const formatRows = (n) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return String(n);
  };

  const formatBytes = (b) => {
    if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
    if (b >= 1e6) return `${(b / 1e6).toFixed(2)} MB`;
    if (b >= 1e3) return `${(b / 1e3).toFixed(2)} KB`;
    return `${b} B`;
  };

  const isNumericType = (type) => {
    return /^(UInt|Int|Float|Decimal)/.test(type);
  };

  const isHyperlink = (value) => {
    return typeof value === 'string' && /^https?:\/\//.test(value);
  };

  const computeColumnExtremes = (meta, data) => {
    const extremes = {};
    for (let i = 0; i < meta.length; i++) {
      if (isNumericType(meta[i].type)) {
        let min = Infinity, max = -Infinity;
        for (const row of data) {
          const v = Number(row[i]);
          if (!isNaN(v)) {
            if (v < min) min = v;
            if (v > max) max = v;
          }
        }
        if (max > -Infinity) {
          extremes[i] = { min, max };
        }
      }
    }
    return extremes;
  };

  const computeColumnWidths = (meta, data) => {
    const lengths = meta.map((col, i) => {
      const headerLen = col.name.length + col.type.length + 1;
      let maxData = 0;
      for (const row of data) {
        const v = row[i];
        const len = v === null ? 4 : String(v).length;
        if (len > maxData) maxData = len;
      }
      return Math.max(headerLen, maxData);
    });
    const total = lengths.reduce((s, l) => s + l, 0);
    return lengths.map(l => `${((l / total) * 100).toFixed(1)}%`);
  };

  const copyResultsAsTSV = () => {
    if (!results || !results.meta || !results.data) return;
    const header = results.meta.map(col => col.name).join('\t');
    const rows = results.data.map(row =>
      row.map(cell => (cell === null ? 'NULL' : String(cell))).join('\t')
    );
    const tsv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(tsv);
  };

  const borderColor = isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb';
  const headerBg = isDark ? '#2a2a2a' : '#f3f4f6';
  const textColor = isDark ? '#e5e7eb' : '#1f2937';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const accentColor = isDark ? '#FAFF69' : '#eab308';

  const barColor = isDark ? '#35372f' : '#d2d2d2';
  const cellBg = isDark ? '#1f201b' : '#ffffff';
  const cellBgHover = isDark ? 'lch(15.8 0 0)' : '#f0f0f0';

  const extremes = results && results.meta && results.data
    ? computeColumnExtremes(results.meta, results.data)
    : {};

  const colWidths = results && results.meta && results.data
    ? computeColumnWidths(results.meta, results.data)
    : [];

  const getCellBarStyle = (cell, ci, ri) => {
    if (cell === null) return null;
    const colMeta = results.meta[ci];
    if (!isNumericType(colMeta.type) || !extremes[ci] || results.data.length <= 1 || extremes[ci].max <= 0) return null;

    const ratio = (100 * Number(cell)) / extremes[ci].max;
    const bg = ri === hoveredRow ? cellBgHover : cellBg;
    return {
      background: `linear-gradient(to right, ${barColor} 0%, ${barColor} ${ratio}%, ${bg} ${ratio}%, ${bg} 100%)`,
    };
  };

  const renderCell = (cell, ci) => {
    if (cell === null) {
      return <span style={{ color: mutedColor, fontStyle: 'italic' }}>NULL</span>;
    }

    const value = String(cell);

    if (isHyperlink(value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: accentColor,
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          {value}
        </a>
      );
    }

    return value;
  };

  return (
    <div className="not-prose" style={{ margin: '1rem 0', width: '100%', boxSizing: 'border-box', contain: 'inline-size' }}>
      {title && (
        <div style={{ fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>
          {title}
        </div>
      )}

      {/* Code display */}
      <div style={{
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <pre style={{
          margin: 0,
          padding: '12px 16px',
          backgroundColor: isDark ? '#282828' : '#fff',
          color: textColor,
          fontSize: '13px',
          lineHeight: '1.6',
          overflowX: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        }}>
          <code>{sql}</code>
        </pre>

        {/* Action bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 12px',
          backgroundColor: headerBg,
          borderTop: `1px solid ${borderColor}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {results && (
              <button
                onClick={() => setShowResults(!showResults)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: mutedColor, fontSize: '12px', padding: '2px 4px',
                }}
              >
                {showResults ? '▼ Hide results' : '▶ Show results'}
              </button>
            )}
            {showStats && stats && (
              <span style={{ fontSize: '11px', color: mutedColor, fontStyle: 'italic' }}>
                Read {formatRows(stats.rows_read)} rows, {formatBytes(stats.bytes_read)} in {stats.elapsed.toFixed(3)}s
              </span>
            )}
          </div>
          <button
            onClick={() => executeQuery()}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 14px',
              borderRadius: '4px',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              backgroundColor: accentColor,
              color: '#000',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {loading ? (
              <span>Running...</span>
            ) : (
              <>
                <span style={{ fontSize: '10px' }}>▶</span>
                <span>Run</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {showResults && (
        <div className="not-prose"
          style={{
            marginTop: '8px',
            maxHeight: '350px',
            overflow: 'auto',
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
          }}>
          <div>
          {loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: mutedColor }}>
              Executing query...
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px 16px',
              color: '#ef4444',
              backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
              fontSize: '13px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
            }}>
              {error}
            </div>
          )}

          {results && results.meta && results.data && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: colWidths.join(' '),
              width: '100%',
              fontSize: '13px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            }}>
              {results.meta.map((col, i) => (
                <div key={`h-${i}`} style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  padding: '6px 12px',
                  textAlign: isNumericType(col.type) && results.meta.length > 1 ? 'right' : 'left',
                  backgroundColor: headerBg,
                  borderBottom: `1px solid ${borderColor}`,
                  color: textColor,
                  fontWeight: 600,
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {col.name}
                  <span style={{ color: mutedColor, fontWeight: 400, marginLeft: '4px', fontSize: '10px' }}>
                    {col.type}
                  </span>
                </div>
              ))}
              {results.data.map((row, ri) =>
                row.map((cell, ci) => (
                  <div
                    key={`${ri}-${ci}`}
                    onMouseEnter={() => setHoveredRow(ri)}
                    onMouseLeave={() => setHoveredRow(-1)}
                    style={{
                      padding: '4px 12px',
                      color: textColor,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textAlign: isNumericType(results.meta[ci].type) && results.meta.length > 1 ? 'right' : 'left',
                      borderBottom: `1px solid ${borderColor}`,
                      backgroundColor: ri === hoveredRow
                        ? cellBgHover
                        : ri % 2 === 0 ? 'transparent' : bgColor,
                      transition: 'background-color 0.1s',
                      ...getCellBarStyle(cell, ci, ri),
                    }}
                  >
                    {renderCell(cell, ci)}
                  </div>
                ))
              )}
            </div>
          )}

          {results && results.data && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 12px',
              fontSize: '11px',
              color: mutedColor,
              borderTop: `1px solid ${borderColor}`,
              backgroundColor: headerBg,
            }}>
              <span>
                {results.rows} row{results.rows !== 1 ? 's' : ''}
              </span>
              <button
                onClick={copyResultsAsTSV}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: mutedColor,
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                }}
                onMouseEnter={(e) => e.target.style.color = textColor}
                onMouseLeave={(e) => e.target.style.color = mutedColor}
              >
                ⧉ Copy TSV
              </button>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};