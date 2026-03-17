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

  const borderColor = isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb';
  const headerBg = isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6';
  const textColor = isDark ? '#e5e7eb' : '#1f2937';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const accentColor = isDark ? '#FAFF69' : '#eab308';

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
            {showResults && results && (
              <button
                onClick={() => setShowResults(!showResults)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: mutedColor, fontSize: '12px', padding: '2px 4px',
                }}
              >
                {showResults ? '▼ Hide results' : '▲ Show results'}
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
        <div className="not-prose overflow-x-auto [contain:inline-size]"
          style={{
            marginTop: '8px',
            maxHeight: '350px',
            overflowY: 'auto',
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
            <table className="m-0 min-w-full max-w-none table [&_td]:min-w-[100px] [&_th]:text-left" style={{
              width: results.data.length <= 1 ? '100%' : undefined,
              borderCollapse: 'collapse',
              fontSize: '13px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            }}>
              <thead>
                <tr>
                  {results.meta.map((col, i) => (
                    <th key={i} style={{
                      position: 'sticky', top: 0,
                      padding: '6px 12px',
                      textAlign: 'left',
                      backgroundColor: headerBg,
                      borderBottom: `1px solid ${borderColor}`,
                      color: textColor,
                      fontWeight: 600,
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                    }}>
                      {col.name}
                      <span style={{ color: mutedColor, fontWeight: 400, marginLeft: '4px', fontSize: '10px' }}>
                        {col.type}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.data.map((row, ri) => (
                  <tr key={ri} style={{
                    borderBottom: `1px solid ${borderColor}`,
                    backgroundColor: ri % 2 === 0 ? 'transparent' : bgColor,
                  }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: '4px 12px',
                        color: textColor,
                        whiteSpace: 'nowrap',
                      }}>
                        {cell === null ? <span style={{ color: mutedColor }}>NULL</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {results && results.data && (
            <div style={{
              padding: '4px 12px',
              fontSize: '11px',
              color: mutedColor,
              borderTop: `1px solid ${borderColor}`,
              backgroundColor: headerBg,
            }}>
              {results.rows} row{results.rows !== 1 ? 's' : ''}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};