import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGlobe, FaCheck } from 'react-icons/fa';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'zh', label: '中文 (简体)', flag: '🇨🇳' },
  ];

  const currentLang = languages.find(l => i18n.language?.startsWith(l.code)) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-bold shadow-sm cursor-pointer"
        title="Language / Ngôn ngữ / 语言"
      >
        <span className="text-base">{currentLang.flag}</span>
        <span className="hidden sm:inline">{currentLang.label}</span>
        <FaGlobe className="text-slate-400 group-hover:text-white ml-0.5" size={13} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#121212] border border-white/10 shadow-2xl z-[999] overflow-hidden py-1.5 animate-[fade-in_0.15s_ease-out]">
          <div className="px-3 py-2 border-b border-white/5 text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
            Language / 语言
          </div>
          {languages.map(lang => {
            const isSelected = i18n.language?.startsWith(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-bold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.label}</span>
                </div>
                {isSelected && <FaCheck size={11} className="text-[var(--accent-gold)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
