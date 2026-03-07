import React, { useEffect, useState } from "react";
import Papa from "papaparse";

const defaultRules = [
  { max: 2000, increment: 500 },
  { max: 5000, increment: 1000 },
  { max: 10000, increment: 2000 },
  { max: 20000, increment: 5000 },
  { max: 50000, increment: 10000 },
  { max: null, increment: 25000 }
];

export default function BidRuleSettings() {

  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [basePrices, setBasePrices] = useState({});

  // ─── Load rules ─────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("auction_bid_rules");

    if (stored) setRules(JSON.parse(stored));
    else setRules(defaultRules);
  }, []);

  // ─── Load categories from players CSV ─────────────────
  useEffect(() => {

    const playerCsv = localStorage.getItem("playerDetails");

    if (!playerCsv) return;

    Papa.parse(playerCsv, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {

        const cats = [
          ...new Set(
            res.data
              .map(p => (p.category || p.Category || "").trim())
              .filter(Boolean)
          )
        ];

        setCategories(cats);

        const stored = localStorage.getItem("auction_category_base_prices");

        if (stored) {
          setBasePrices(JSON.parse(stored));
        } else {
          const defaults = {};
          cats.forEach(c => (defaults[c] = 500));
          setBasePrices(defaults);
        }
      }
    });

  }, []);

  // ─── Update bid rule ─────────────────────────────────
  const updateRule = (index, field, value) => {

    const updated = [...rules];

    updated[index][field] =
      field === "max" && value === ""
        ? null
        : Number(value);

    setRules(updated);
  };

  const addRule = () => {
    setRules([...rules, { max: 0, increment: 1000 }]);
  };

  const deleteRule = (index) => {
    const updated = rules.filter((_, i) => i !== index);
    setRules(updated);
  };

  const saveRules = () => {
    localStorage.setItem(
      "auction_bid_rules",
      JSON.stringify(rules)
    );

    localStorage.setItem(
      "auction_category_base_prices",
      JSON.stringify(basePrices)
    );
  };

  const resetRules = () => {

    setRules(defaultRules);

    localStorage.setItem(
      "auction_bid_rules",
      JSON.stringify(defaultRules)
    );
  };

  // ─── Update category base price ──────────────────────
  const updateBasePrice = (cat, value) => {

    setBasePrices(prev => ({
      ...prev,
      [cat]: Number(value)
    }));

  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Auction Settings
        </h1>
        <p className="text-base-content/70">
          Configure auction bid increments and category base prices.
        </p>
      </div>

      {/* ───────────────── Bid Increment Rules ───────────────── */}

      <div className="card bg-base-100 shadow-xl">

        <div className="card-body">

          <h2 className="card-title">
            Bid Increment Rules
          </h2>

          <div className="overflow-x-auto">

            <table className="table table-zebra">

              <thead>
                <tr>
                  <th>Max Bid (₹)</th>
                  <th>Increment (₹)</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>

                {rules.map((rule, index) => (

                  <tr key={index}>

                    <td>

                      <input
                        type="number"
                        className="input input-bordered w-full"
                        placeholder="Unlimited"
                        value={rule.max ?? ""}
                        onChange={(e) =>
                          updateRule(index, "max", e.target.value)
                        }
                      />

                    </td>

                    <td>

                      <input
                        type="number"
                        className="input input-bordered w-full"
                        value={rule.increment}
                        onChange={(e) =>
                          updateRule(index, "increment", e.target.value)
                        }
                      />

                    </td>

                    <td className="text-right">

                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => deleteRule(index)}
                      >
                        Delete
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          <div className="flex gap-3 mt-4">

            <button
              className="btn btn-primary"
              onClick={addRule}
            >
              + Add Rule
            </button>

            <button
              className="btn btn-outline"
              onClick={resetRules}
            >
              Reset Default
            </button>

          </div>

        </div>
      </div>

      {/* ───────────────── Category Base Prices ───────────────── */}

      <div className="card bg-base-100 shadow-xl">

        <div className="card-body">

          <h2 className="card-title">
            Category Base Prices
          </h2>

          <p className="text-sm text-base-content/70">
            Set the starting price for players based on category.
          </p>

          <div className="overflow-x-auto mt-4">

            <table className="table table-zebra">

              <thead>
                <tr>
                  <th>Category</th>
                  <th>Base Price (₹)</th>
                </tr>
              </thead>

              <tbody>

                {categories.map(cat => (

                  <tr key={cat}>

                    <td>

                      <span className="badge badge-primary">
                        {cat}
                      </span>

                    </td>

                    <td>

                      <input
                        type="number"
                        className="input input-bordered w-full"
                        value={basePrices[cat] || ""}
                        onChange={(e) =>
                          updateBasePrice(cat, e.target.value)
                        }
                      />

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* Save Button */}

      <div className="flex justify-end">

        <button
          className="btn btn-success btn-lg"
          onClick={saveRules}
        >
          Save Auction Settings
        </button>

      </div>

    </div>
  );
}