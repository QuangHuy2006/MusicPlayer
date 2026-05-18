import { useState, useEffect } from "react";
import { FaCrown, FaLock, FaTimes, FaCopy, FaDownload, FaWaveSquare, FaMusic } from "react-icons/fa";

export default function PremiumUpgradePrompt() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const userId = user?.id || user?._id || "VIP";
  const transferContent = `QHUY ${userId}`;
  const bankName = "MBBank";
  const accountNumber = "200619082006"; // User's customized bank info or template
  const amount = "19000";

  // VietQR Quick Link generation
  const qrUrl = `https://img.vietqr.io/image/MB-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=TON%20PHAM%20QUANG%20HUY`;

  const handleCopy = () => {
    navigator.clipboard.writeText(transferContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-[fade-in_0.5s_ease-out] relative">

      {/* Decorative ambient pulsing glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[80px] -z-10 animate-pulse"></div>

      <div className="max-w-2xl bg-slate-950/60 backdrop-blur-xl border border-amber-500/10 rounded-3xl p-8 md:p-12 shadow-2xl shadow-amber-950/10 relative overflow-hidden">

        {/* Border laser light */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>

        {/* Crown Icon Container */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 animate-[bounce-slow_4s_infinite_ease-in-out]">
          <FaCrown className="text-white text-4xl" />
        </div>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          Mở Khóa <span className="shimmer-gold-text">PREMIUM VIP</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto mb-8 font-medium">
          Nghe nhạc đẳng cấp không giới hạn và sở hữu những tính năng thời thượng nhất chỉ với <span className="text-amber-400 font-bold">19.000đ/tháng</span>.
        </p>

        {/* Features List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-10">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 hover:border-amber-500/20 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 text-amber-400 group-hover:scale-110 transition-transform">
              <FaDownload size={18} />
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
              Nghe Nhạc Offline
              <FaLock size={10} className="text-amber-500/70" />
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Tải bài hát trực tiếp về thiết bị của bạn. Nghe nhạc bất cứ lúc nào không cần mạng.
            </p>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 hover:border-amber-500/20 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 text-amber-400 group-hover:scale-110 transition-transform">
              <FaWaveSquare size={18} />
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
              Sóng Nhạc 3D VIP
              <FaLock size={10} className="text-amber-500/70" />
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Trình diễn sóng nhạc hình học động 3D chuyển động rực rỡ theo từng nhịp điệu của âm bass.
            </p>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 hover:border-amber-500/20 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 text-amber-400 group-hover:scale-110 transition-transform">
              <FaMusic size={16} />
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
              Âm Thanh Lossless
              <FaLock size={10} className="text-amber-500/70" />
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Trải nghiệm âm thanh chất lượng siêu cao 320kbps và Lossless cho chất lượng trung thực nhất.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setShowPaymentModal(true)}
          className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black uppercase text-xs tracking-widest px-10 py-4 rounded-2xl transition-all duration-300 hover:scale-[1.03] shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          Nâng Cấp Ngay - 19,000đ
        </button>
      </div>

      {/* ==========================================
          DYNAMIC PAYMENT MODAL (VietQR automated)
          ========================================== */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-[fade-in_0.3s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/25 rounded-3xl p-6 shadow-2xl relative">

            {/* Close Button */}
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <FaTimes size={18} />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <FaCrown className="text-amber-400 text-3xl mx-auto mb-2 animate-bounce" />
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Thanh Toán Premium</h3>
              <p className="text-xs text-slate-400 mt-1">Hệ thống kích hoạt tự động qua ngân hàng 24/7</p>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-3 rounded-2xl w-56 h-56 mx-auto mb-6 flex items-center justify-center shadow-lg border-2 border-amber-500/30">
              <img
                src={qrUrl}
                alt="VietQR Payment Code"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Bank details and dynamic content */}
            <div className="space-y-3 bg-white/5 border border-white/5 rounded-2xl p-4 text-left mb-6 text-sm font-semibold">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400 text-xs">Ngân hàng</span>
                <span className="text-white">{bankName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400 text-xs">Số tài khoản</span>
                <span className="text-white">{accountNumber}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400 text-xs">Số tiền</span>
                <span className="text-amber-400 font-bold">{parseInt(amount).toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 text-xs">Nội dung chuyển khoản</span>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-black tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{transferContent}</span>
                  <button
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Sao chép nội dung"
                  >
                    <FaCopy size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Alert / Notice */}
            <div className="text-center">
              <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                ⚠️ **Lưu ý:** Vui lòng chuyển khoản chính xác số tiền và **nội dung chuyển khoản** ở trên. Sau khi nhận được tiền, hệ thống Webhook sẽ tự động nâng cấp VIP cho bạn sau 5-10 giây!
              </p>
              {copied && (
                <p className="text-xs text-emerald-400 mt-2 font-bold animate-[fade-in-up_0.2s_ease-out]">
                  Đã sao chép nội dung chuyển khoản!
                </p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
