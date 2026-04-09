import { useNavigate } from "react-router-dom";
import { FaHome, FaFrown, FaArrowLeft } from "react-icons/fa";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          textAlign: "center",
          zIndex: 2,
          padding: "2rem",
          maxWidth: "600px",
          animation: "fadeInUp 0.6s ease-out",
        }}
      >
        <div style={styles.iconWrapper}>
          <FaFrown style={styles.icon} />
        </div>
        <h1 style={styles.code}>404</h1>
        <h2 style={styles.title}>Trang không tồn tại</h2>
        <p style={styles.message}>
          Rất tiếc, trang bạn đang tìm kiếm không có hoặc đã bị di chuyển.
        </p>
        <div
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button style={styles.button} onClick={() => navigate(-1)}>
            <FaArrowLeft style={styles.btnIcon} /> Quay lại
          </button>
          <button
            style={{ ...styles.button, ...styles.buttonPrimary }}
            onClick={() => navigate("/")}
          >
            <FaHome style={styles.btnIcon} /> Về trang chủ
          </button>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          background:
            "radial-gradient(circle, rgba(245,158,11,0.1) 0%, rgba(0,0,0,0) 70%)",
          borderRadius: "50%",
          bottom: "-100px",
          left: "-100px",
          zIndex: 1,
        }}
      ></div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    position: "relative",
    overflow: "hidden",
  },
  content: {
    textAlign: "center",
    zIndex: 2,
    padding: "2rem",
    maxWidth: "600px",
    animation: "fadeInUp 0.6s ease-out",
  },
  iconWrapper: {
    marginBottom: "1.5rem",
  },
  icon: {
    fontSize: "80px",
    color: "#f59e0b",
    filter: "drop-shadow(0 0 10px rgba(245,158,11,0.3))",
  },
  code: {
    fontSize: "120px",
    fontWeight: "800",
    margin: "0",
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    letterSpacing: "8px",
  },
  title: {
    fontSize: "28px",
    margin: "16px 0 12px",
    color: "#f1f5f9",
    fontWeight: "500",
  },
  message: {
    fontSize: "16px",
    color: "#94a3b8",
    marginBottom: "32px",
    lineHeight: "1.5",
  },
  buttonGroup: {
    display: "flex",
    gap: "16px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 24px",
    fontSize: "16px",
    fontWeight: "500",
    borderRadius: "40px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#334155",
    color: "#e2e8f0",
    transition: "all 0.2s ease",
    textDecoration: "none",
  },
  buttonPrimary: {
    backgroundColor: "#f59e0b",
    color: "#0f172a",
  },
  btnIcon: {
    fontSize: "16px",
  },
  bgDecoration: {
    position: "absolute",
    width: "300px",
    height: "300px",
    background:
      "radial-gradient(circle, rgba(245,158,11,0.1) 0%, rgba(0,0,0,0) 70%)",
    borderRadius: "50%",
    bottom: "-100px",
    left: "-100px",
    zIndex: 1,
  },
};

// Thêm animation keyframes (có thể dùng CSS-in-JS hoặc global CSS)
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(styleSheet);

export default NotFound;
