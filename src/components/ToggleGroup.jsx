import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CsvEditor from "../components/CsvEditor";
import CSVEditorTeams from "../components/CSVEditorTeams";
import BidRuleSettings from "./BidRuleSettings";
import { handlePlayerSheetDownload } from "../utils/handlePlayerSheetDownload";

function ToggleGroup() {

  const [activeView, setActiveView] = useState("players");
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [sortType, setSortType] = useState("number");

  const navigate = useNavigate();

  const handleClearAuction = () => {
    if (window.confirm("Are you sure you want to clear the auction data? This cannot be undone.")) {
      localStorage.removeItem("auctionCurrent");
      localStorage.removeItem("auctionLog");
      localStorage.removeItem("auctionSold");
      localStorage.removeItem("auctionTeamState");
      localStorage.removeItem("auctionUnsold");
      alert("Auction data cleared. You can now start fresh.");
    }
  };

  const handleDownloadClick = () => {
    setShowDownloadOptions(true);
  };

  const handleDownloadConfirm = () => {
    handlePlayerSheetDownload(sortType);
    setShowDownloadOptions(false);
  };

  return (
    <div className="flex-1 overflow-auto w-full p-4">

      {/* Toggle Buttons */}
      <div className="flex gap-3 mb-4 flex-wrap">

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
          onClick={() => setActiveView("bidRules")}
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

        <button
          className="px-4 py-2 rounded font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
          onClick={handleDownloadClick}
        >
          Download Player Sheet
        </button>

      </div>

      {/* Download Sort Toggle */}
      {showDownloadOptions && (
        <div className="bg-[#1e2130] p-4 rounded mb-4 flex items-center gap-3 flex-wrap">

          <span className="text-slate-300 font-medium">Sort By:</span>

          <button
            className={`px-3 py-1 rounded ${
              sortType === "playingstyle"
                ? "bg-indigo-500 text-white"
                : "bg-[#252840] text-slate-400"
            }`}
            onClick={() => setSortType("playingstyle")}
          >
            Stlye
          </button>

          <button
            className={`px-3 py-1 rounded ${
              sortType === "name"
                ? "bg-indigo-500 text-white"
                : "bg-[#252840] text-slate-400"
            }`}
            onClick={() => setSortType("name")}
          >
            Name
          </button>

          <button
            className={`px-3 py-1 rounded ${
              sortType === "category"
                ? "bg-indigo-500 text-white"
                : "bg-[#252840] text-slate-400"
            }`}
            onClick={() => setSortType("category")}
          >
            Category
          </button>

          <button
            className="ml-2 px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
            onClick={handleDownloadConfirm}
          >
            Download
          </button>

          <button
            className="px-3 py-1 text-slate-400 hover:text-white"
            onClick={() => setShowDownloadOptions(false)}
          >
            Cancel
          </button>

        </div>
      )}

      {/* Active View */}
      {activeView === "players" && <CsvEditor />}
      {activeView === "teams" && <CSVEditorTeams />}
      {activeView === "bidRules" && <BidRuleSettings />}

    </div>
  );
}

export default ToggleGroup;