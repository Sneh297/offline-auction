import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CsvEditor from "../components/CsvEditor";
import CSVEditorTeams from "../components/CSVEditorTeams";
import BidRuleSettings from "./BidRuleSettings";

function ToggleGroup() {
  const handleClearAuction = () => {
    if (window.confirm("Are you sure you want to clear the auction data? This cannot be undone.")) {
      localStorage.removeItem("auctionCurrent");
      localStorage.removeItem("auctionLog");
      localStorage.removeItem("auctionSold");
      localStorage.removeItem("auctionTeamState");
      localStorage.removeItem("auctionUnsold")
      alert("Auction data cleared. You can now start fresh.");
    }
  };



  const [activeView, setActiveView] = useState("players");
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-auto w-full p-4">

      {/* Toggle Buttons */}
      <div className="flex gap-3 mb-4">

        <button
          className={`px-4 py-2 rounded font-medium transition-colors ${
            activeView === "players"
              ? "bg-indigo-500 text-white"
              : "bg-[#1e2130] text-slate-400 hover:text-white hover:bg-[#252840]"
          }`}
          onClick={() => setActiveView("players")}
        >
          View Player List
        </button>

        <button
          className={`px-4 py-2 rounded font-medium transition-colors ${
            activeView === "teams"
              ? "bg-indigo-500 text-white"
              : "bg-[#1e2130] text-slate-400 hover:text-white hover:bg-[#252840]"
          }`}
          onClick={() => setActiveView("teams")}
        >
          View Team List
        </button>


            <button
          className="px-4 py-2 rounded font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
          onClick={()=>{setActiveView("bidRules")}}
        >
          Bid Rules
        </button>
        <button
          className="px-4 py-2 rounded font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
          onClick={() => navigate("/auction")}
        >
          Start Auction
        </button>

        
        <button
          className="px-4 py-2 rounded font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
          onClick={handleClearAuction}
        >
          Clear Auction
        </button>


       
      </div>

      {/* Active View */}
      {activeView === "players" && <CsvEditor />}
      {activeView === "teams" && <CSVEditorTeams />}
      {activeView === "bidRules" && <BidRuleSettings />}

    </div>
  );
}

export default ToggleGroup;