import { useState } from "react";
import CsvEditor from "../components/CsvEditor";
import ShortCuts from "../components/ShortCuts";
import CSVEditorTeams from "../components/CSVEditorTeams";
import ToggleGroup from "../components/ToggleGroup";

function DashBoard() {
 
  return (
    <div className="flex flex-col min-h-screen bg-[#0f1117]">

      {/* ── Sticky Shortcuts Bar ── */}
      <ShortCuts />

      {/* ── Main Content ── */}
     <ToggleGroup />
    </div>
  );
}

export default DashBoard;