import React, { useEffect, useState } from "react";
import Papa from "papaparse";

const imgProps = (url) => {
  if (url?.includes("googleusercontent.com") || url?.includes("drive.google.com")) {
    return { referrerPolicy: "no-referrer", crossOrigin: "anonymous" };
  }
  return {};
};

function ViewFromLocalStorage() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [modalUrl, setModalUrl] = useState(null);

  useEffect(() => {
    const csv = localStorage.getItem("playerDetails");
    if (csv) {
      Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data);
          setColumns(Object.keys(results.data[0]));
        },
      });
    }
  }, []);

  const hasPhoto = columns.includes("photourl");

  return (
    <div>
      {data.length > 0 && (
        <table className="table" style={{ marginTop: "20px", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} style={{ padding: "8px" }}>{col}</th>
              ))}
              {hasPhoto && <th style={{ padding: "8px" }}>Photo Preview</th>}
            </tr>
          </thead>

          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col) => (
                  <td key={col} style={{ padding: "8px" }}>
                    {row[col]}
                  </td>
                ))}

                {/* Separate Photo Preview column */}
                {hasPhoto && (
                  <td style={{ padding: "8px" }}>
                    <div className="avatar">
                      <div
                        className="mask mask-squircle h-10 w-10 cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => row["photourl"] && setModalUrl(row["photourl"])}
                        title="Click to enlarge"
                      >
                        {row["photourl"] ? (
                          <img
                            src={row["photourl"]}
                            alt="player"
                            {...imgProps(row["photourl"])}
                          />
                        ) : (
                          <div className="w-full h-full bg-[#1e2130] flex items-center justify-center text-slate-600">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Image Modal ── */}
      {modalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setModalUrl(null)}
        >
          <div
            className="relative bg-[#13161e] rounded-2xl shadow-2xl border border-[#1f2330] p-3 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalUrl(null)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-[#1e2130] hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors z-10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <img
              src={modalUrl}
              alt="Player"
              {...imgProps(modalUrl)}
              className="w-full rounded-xl object-cover max-h-80"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewFromLocalStorage;