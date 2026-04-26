"use client"

import { useState } from "react"
import AIAgentChat from "@/app/agent_chat/agent_chat"
import { MessageCircle, X } from "lucide-react"

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 flex items-center justify-center"
        aria-label="Toggle AI Agent Chat"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat Window Popup */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[450px] shadow-2xl z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-2xl relative">
            {/* We scale the existing chat component down slightly to fit a popup widget */}
            <div className="w-full">
              <AIAgentChat />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
