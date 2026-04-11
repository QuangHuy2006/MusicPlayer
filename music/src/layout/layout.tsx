import { Link } from "react-router-dom";
import { FaHeadphones, FaGithub, FaHeart } from "react-icons/fa";
import { useState } from "react";
import AddSongPopup from "../client/addSong";

export default function Layout({ children }: { children: React.ReactNode }) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const API_BASE = import.meta.env.VITE_API_URL || '';
  return (
    <div className="min-h-screen bg-linear-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] flex flex-col z-20">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo / Brand */}
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <FaHeadphones className="text-2xl text-[#7ed957] group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold bg-linear-to-r from-[#7ed957] to-[#00bcd4] bg-clip-text text-transparent">
              Quang Huy Music
            </span>
          </Link>

          {/* Navigation */}
          <nav>
            <ul className="flex gap-6 text-white/80 font-medium">
              <li>
                <Link
                  to="/admin"
                  className="hover:text-[#7ed957] transition-colors duration-200"
                >
                 Admin
                </Link>
              </li>
              <li>
                <Link
                  to="/playlist"
                  className="hover:text-[#7ed957] transition-colors duration-200"
                >
                  Playlist
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="hover:text-[#7ed957] transition-colors duration-200"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="/my-songs"
                  className="hover:text-[#7ed957] transition-colors duration-200"
                >
                  My Songs
                </Link>
              </li>
              <li>
                <a
                  onClick={async (e) => {
                    e.preventDefault();
                    await fetch(`${API_BASE}/api/auth/logout`, {
                      method: "POST",
                      credentials: "include",
                    });
                    window.location.href = "/login";
                  }}
                  className="hover:text-[#7ed957] transition-colors duration-200"
                >
                  Log out
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 container mx-auto px-4 py-6 relative">
        <div className="absolute top-5 right-0 z-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Thêm nhạc
          </button>
        </div>
        {children}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-black/30 backdrop-blur-md border-t border-white/10 py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="text-white/60 text-sm">
              © 2024 Quang Huy Music. All rights reserved.
            </div>

            {/* Links */}
            <div className="flex gap-6">
              <a
                href="https://github.com/thucwebdev/MyMusicPlayer.com.git"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-[#7ed957] transition-colors flex items-center gap-1"
              >
                <FaGithub className="text-lg" />
                <span>GitHub</span>
              </a>
              <Link
                to="/privacy"
                className="text-white/60 hover:text-[#7ed957] transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-white/60 hover:text-[#7ed957] transition-colors"
              >
                Terms
              </Link>
            </div>

            {/* Made with love */}
            <div className="flex items-center gap-1 text-white/60 text-sm">
              <span>Made with</span>
              <FaHeart className="text-[#7ed957] animate-pulse" />
              <span>by Quang Huy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
    
  );
}
