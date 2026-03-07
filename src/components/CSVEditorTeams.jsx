import React, { useState, useEffect } from "react";
import Papa from "papaparse";

const imgProps = (url) => {
  if (url?.includes("googleusercontent.com") || url?.includes("drive.google.com")) {
    return { referrerPolicy: "no-referrer", crossOrigin: "anonymous" };
  }
  return {};
};

export default function CSVEditorTeams() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [modalUrl, setModalUrl] = useState(null);

  useEffect(() => {
    const csv = localStorage.getItem("teamDetails");
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); saveToLocalStorage(); }
      if (e.ctrlKey && e.key === "d") { e.preventDefault(); downloadCSV(); }
      if (e.ctrlKey && e.key === "c") { e.preventDefault(); clearLocalStorage(); window.location.reload(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data]);

  const getEmptyCells = () => {
    const empty = [];
    data.forEach((row, rowIndex) => {
      columns.forEach((col) => {
        if (!row[col] || row[col].toString().trim() === "") empty.push({ rowIndex, col });
      });
    });
    return empty;
  };

  const isEmptyCell = (rowIndex, col) =>
    !data[rowIndex][col] || data[rowIndex][col].toString().trim() === "";

  const clearLocalStorage = () => {
    localStorage.removeItem("teamDetails");
    alert("Team local storage cleared!");
  };

  const convertDriveUrl = (url) => {
    if (!url) return url;
    if (url.includes("lh3.googleusercontent.com")) return url;
    const fileIdMatch =
      url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    return url;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data.map((row) => ({
          ...row,
          ...(row.Logo ? { Logo: convertDriveUrl(row.Logo) } : {}),
        }));
        setData(parsedData);
        setColumns(Object.keys(parsedData[0]));
        localStorage.setItem("teamDetails", Papa.unparse(parsedData));
        alert("Team CSV uploaded and saved to local storage!");
      },
    });
  };

  const handleChange = (rowIndex, column, value) => {
    const updated = [...data];
    const isImageCol = column === "Logo" || column === "photourl";
    updated[rowIndex][column] = isImageCol ? convertDriveUrl(value) : value;
    setData(updated);
  };

  const saveToLocalStorage = () => {
    const emptyCells = getEmptyCells();
    if (emptyCells.length > 0) {
      alert(`❌ Cannot save — ${emptyCells.length} empty cell(s):\n\n${emptyCells.map(({ rowIndex, col }) => `Row ${rowIndex + 1} → "${col}"`).join("\n")}`);
      return;
    }
    localStorage.setItem("teamDetails", Papa.unparse(data));
    alert("✅ Team CSV data saved to local storage!");
  };

  const downloadCSV = () => {
    const emptyCells = getEmptyCells();
    if (emptyCells.length > 0) {
      alert(`❌ Cannot download — ${emptyCells.length} empty cell(s):\n\n${emptyCells.map(({ rowIndex, col }) => `Row ${rowIndex + 1} → "${col}"`).join("\n")}`);
      return;
    }
    const blob = new Blob([Papa.unparse(data)], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "updated_teams.csv";
    link.click();
  };

  const addRow = () => {
    const emptyRow = columns.reduce((acc, col) => ({ ...acc, [col]: "" }), {});
    emptyRow.No = data.length + 1;
    setData([...data, emptyRow]);
  };

  const deleteRow = (rowIndex) => {
    const filtered = data.filter((_, i) => i !== rowIndex);
    setData(filtered.map((row, i) => ({ ...row, No: i + 1 })));
  };

  const imageColumns = columns.filter((c) => c === "Logo" || c === "photourl");
  const hasImage = imageColumns.length > 0;
  const emptyCells = getEmptyCells();

  return (
    <div style={{ padding: 20 }}>
      {data.length === 0 && (
        <input type="file" accept=".csv" onChange={handleFileUpload} />
      )}

      {data.length > 0 && (
        <>
          {emptyCells.length > 0 && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span><strong>{emptyCells.length} empty cell{emptyCells.length > 1 ? "s" : ""}</strong> — fill all cells before saving or downloading.</span>
            </div>
          )}

          <table className="table">
            <thead>
              <tr>
                {columns.map((col) => <th key={col}>{col}</th>)}
                {hasImage && <th>Logo Preview</th>}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col) => (
                    <td key={col}>
                      <input
                        value={row[col] ?? ""}
                        onChange={(e) => handleChange(rowIndex, col, e.target.value)}
                        placeholder={imageColumns.includes(col) ? "Paste image URL..." : ""}
                        className={isEmptyCell(rowIndex, col) ? "border border-red-500/60 bg-red-500/5 placeholder-red-400/40" : ""}
                      />
                    </td>
                  ))}

                  {/* Logo Preview — separate column, click to enlarge */}
                  {hasImage && (
                    <td>
                      <div className="avatar">
                        <div
                          className="mask mask-squircle h-10 w-10 cursor-pointer hover:opacity-75 transition-opacity"
                          onClick={() => {
                            const url = row["Logo"] || row["photourl"];
                            if (url) setModalUrl(url);
                          }}
                          title="Click to enlarge"
                        >
                          {(row["Logo"] || row["photourl"]) ? (
                            <img
                              src={row["Logo"] || row["photourl"]}
                              alt="Team logo"
                              {...imgProps(row["Logo"] || row["photourl"])}
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

                  {/* Delete row */}
                  <td>
                    <button
                      onClick={() => deleteRow(rowIndex)}
                      title="Delete row"
                      className="flex items-center justify-center w-7 h-7 rounded-md bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={addRow}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-md transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Row
          </button>
          <br />
        </>
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
              alt="Team"
              {...imgProps(modalUrl)}
              className="w-full rounded-xl object-cover max-h-80"
            />
          </div>
        </div>
      )}
    </div>
  );
}