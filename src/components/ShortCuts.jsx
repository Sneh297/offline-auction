import React from 'react'
import { shortcutsData } from '../constant/ShortcutsData'

function ShortCuts() {
  return (
      <div className="w-full shrink-0 bg-[#13161e] border-b border-[#1f2330] flex items-center px-6 gap-1 sticky top-0 z-50">

        {/* Label */}
        <div className="flex items-center gap-2 pr-5 mr-2 border-r border-[#1f2330] py-3">
          <span className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 shadow-[0_0_7px_rgba(99,102,241,0.7)]" />
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-500 font-mono whitespace-nowrap">
            Shortcuts
          </span>
        </div>

        {/* Shortcut Chips */}
        {shortcutsData.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-all duration-150 cursor-default select-none">

              {/* Icon */}
              <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${s.bg} ${s.color} transition-transform duration-200 group-hover:scale-110`}>
                {s.icon}
              </div>

              {/* Text */}
              <span className="text-[13px] font-medium text-slate-400 group-hover:text-slate-300 transition-colors whitespace-nowrap">
                {s.action}
              </span>

              {/* Keys */}
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <span key={j} className="flex items-center gap-1">
                    {j > 0 && (
                      <span className="text-[10px] text-slate-700 font-mono">+</span>
                    )}
                    <kbd className="inline-flex items-center font-mono text-[11px] font-medium px-1.5 py-0.5 rounded-[5px] bg-[#1a1d28] text-slate-500 border border-[#2a2f42] shadow-[0_2px_0_#10121a] group-hover:text-slate-300 group-hover:border-[#3a4060] transition-all">
                      {k}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>

            {i < shortcutsData.length - 1 && (
              <div className="w-px h-5 bg-[#1f2330] mx-1 shrink-0" />
            )}
          </div>
        ))}
      </div>
  )
}

export default ShortCuts