// App.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function App() {
  const navigate = useNavigate();

  // 오늘 날짜
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}.${mm}.${dd}`; // 예: 2025.10.25

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // ✅ localStorage에 저장
  const handleSave = () => {
    const newEntry = {
      date: todayStr,
      title,
      body,
    };

    // 기존 저장된 일기 불러오기
    const existing = JSON.parse(localStorage.getItem("diaryEntries") || "[]");

    // 같은 날짜에 이미 저장된 게 있으면 교체 / 없으면 추가
    const updated = [
      ...existing.filter((e) => e.date !== todayStr),
      newEntry,
    ];

    // 다시 저장
    localStorage.setItem("diaryEntries", JSON.stringify(updated));

    alert("일기가 저장되었습니다!");
  };

  return (
    <>
      {/* 오로라 키프레임 */}
      <style>
        {`
        @keyframes auroraMove {
          0%   { transform: translate(-10%, -10%) rotate(0deg); filter: blur(60px); opacity: 0.6; }
          50%  { transform: translate(10%, 10%) rotate(15deg);  filter: blur(80px); opacity: 0.8; }
          100% { transform: translate(-10%, -10%) rotate(0deg); filter: blur(60px); opacity: 0.6; }
        }

        @keyframes auroraShift {
          0%   { transform: translate(10%, -5%) rotate(0deg);   filter: blur(60px); opacity: 0.5; }
          50%  { transform: translate(-10%, 10%) rotate(-10deg); filter: blur(80px); opacity: 0.7; }
          100% { transform: translate(10%, -5%) rotate(0deg);   filter: blur(60px); opacity: 0.5; }
        }
      `}
      </style>

      {/* 상단 네비게이션 */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "60px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "rgba(255,240,225,0.7)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 2px 10px rgba(255,190,140,0.25)",
          padding: "0 2rem",
          zIndex: 1000,
          colorScheme: "light", // 🌟 상단바도 항상 라이트톤
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Pretendard", "Inter", system-ui, sans-serif',
        }}
      >
        <button
          style={{
            background:
              "linear-gradient(90deg, #ffd8b5 0%, #fff0d6 100%)",
            border: "1px solid rgba(255,170,120,0.4)",
            color: "#774e2e",
            fontWeight: 600,
            padding: "0.5rem 1.2rem",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 10px rgba(255,200,140,0.3)",
          }}
          onClick={() => navigate("/gallery")}
        >
          🌿 캘린더 보기
        </button>
      </div>

      {/* 전체 배경 */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          overflow: "hidden",

          background:
            "radial-gradient(circle at 40% 40%, #fff7f0 0%, #ffe8cc 40%, #ffd8b5 80%)",
          backgroundColor: "#fff7f0", // 기본 밝은 톤 고정
          colorScheme: "light",       // 🌟 시스템 다크모드가 어둡게 만들지 못하게

          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          paddingTop: "60px",
          boxSizing: "border-box",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Pretendard", "Inter", system-ui, sans-serif',
        }}
      >
        {/* 오로라 */}
        <div
          style={{
            position: "absolute",
            width: "80vw",
            height: "80vw",
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,210,160,0.6) 0%, rgba(255,190,140,0.4) 35%, rgba(255,230,200,0) 70%)",
            mixBlendMode: "screen",
            animation: "auroraMove 14s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "75vw",
            height: "75vw",
            background:
              "radial-gradient(circle at 70% 60%, rgba(255,230,180,0.6) 0%, rgba(255,210,150,0.4) 40%, rgba(255,255,255,0) 70%)",
            mixBlendMode: "screen",
            animation: "auroraShift 18s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "85vw",
            height: "85vw",
            background:
              "radial-gradient(circle at 20% 80%, rgba(255,230,200,0.4) 0%, rgba(255,250,230,0.3) 30%, rgba(255,255,255,0) 70%)",
            mixBlendMode: "screen",
            animation: "auroraMove 20s ease-in-out infinite reverse",
            pointerEvents: "none",
          }}
        />

        {/* 일기장 카드 */}
        <div
          style={{
            position: "relative",
            width: "90%",
            maxWidth: "800px",
            minHeight: "480px",
            background:
              "linear-gradient(145deg, #fffefb 0%, #fff7ed 40%, #fff0e0 100%)",
            borderRadius: "24px",
            boxShadow:
              "0 24px 60px rgba(255,210,150,0.45), 0 8px 20px rgba(255,170,120,0.25)",
            border: "1px solid rgba(255,200,150,0.3)",
            padding: "2rem",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            backdropFilter: "blur(10px)",
            zIndex: 10,
          }}
        >
          {/* 라벨 */}
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#9b6b3a",
              backgroundColor: "rgba(255,240,210,0.9)",
              border: "1px solid rgba(190,130,70,0.25)",
              alignSelf: "flex-start",
              padding: "0.3rem 0.6rem",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(255,180,100,0.15)",
            }}
          >
            baby daily journal
          </div>

          {/* 속지 */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#fffaf5",
              borderRadius: "16px",
              boxShadow:
                "0 8px 20px rgba(255,180,100,0.1), inset 0 0 6px rgba(255,180,100,0.05)",
              border: "1px solid rgba(255,200,150,0.25)",
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* 제본 라인 */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "33.33%",
                width: "2px",
                background:
                  "linear-gradient(to bottom, rgba(255,180,120,0) 0%, rgba(255,180,120,0.4) 20%, rgba(255,180,120,0.4) 80%, rgba(255,180,120,0) 100%)",
                boxShadow:
                  "0 0 6px rgba(255,180,100,0.25), inset 0 0 2px rgba(255,255,255,0.8)",
              }}
            />

            {/* 왼쪽 페이지 */}
            <div
              style={{
                padding: "1.5rem",
                background:
                  "repeating-linear-gradient(#fffaf5 0px, #fffaf5 28px, rgba(255,200,150,0.08) 29px)",
                borderRight: "1px solid rgba(255,180,120,0.15)",
              }}
            >
              {/* 날짜 */}
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#b97a42",
                  marginBottom: "0.5rem",
                  fontWeight: 500,
                }}
              >
                {todayStr}
              </div>

              {/* 제목 라벨 */}
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#b26824",
                  fontWeight: 600,
                  marginBottom: "0.25rem",
                }}
              >
                오늘의 한 줄
              </div>

              {/* 제목 입력 */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 햇살이 따뜻하게 비췄어요 ☀️"
                style={{
                  width: "100%",
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: "1rem",
                  lineHeight: 1.4,
                  fontWeight: 600,
                  color: "#5b3c1e",
                  outline: "none",
                  padding: "0.4rem 0.5rem",
                }}
              />

              {/* 기분 */}
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#b26824",
                  fontWeight: 600,
                  marginTop: "1.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                오늘의 기분
              </div>

              <input
                placeholder="행복 / 뿌듯 / 조금 피곤했어요 …"
                style={{
                  width: "100%",
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: "0.9rem",
                  lineHeight: 1.4,
                  color: "#5b3c1e",
                  outline: "none",
                  padding: "0.4rem 0.5rem",
                  borderRadius: "8px",
                }}
              />

              {/* 스티커 */}
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#fff",
                  background:
                    "linear-gradient(90deg, #ffb4c5 0%, #ffd29f 100%)",
                  display: "inline-block",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "10px",
                  fontWeight: 600,
                  boxShadow:
                    "0 6px 16px rgba(255,150,180,0.4), 0 2px 4px rgba(0,0,0,0.08)",
                  marginTop: "2rem",
                }}
              >
                baby step ✨
              </div>
            </div>

            {/* 오른쪽 페이지 */}
            <div
              style={{
                padding: "1.5rem",
                background:
                  "repeating-linear-gradient(#fffaf5 0px, #fffaf5 28px, rgba(255,200,150,0.08) 29px)",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#b26824",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span>오늘의 기록</span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 400,
                    color: "#c18a58",
                  }}
                >
                  사랑스러운 순간들을 자세히 적어주세요 🧡
                </span>
              </div>

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  "아기가 조용히 제 품 안에서 잠들었어요.\n숨 쉬는 소리까지 따뜻했어요 ☁️"
                }
                style={{
                  width: "100%",
                  height: "260px",
                  resize: "none",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "0.9rem",
                  lineHeight: "28px",
                  color: "#5b3c1e",
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Pretendard", "Inter", system-ui, sans-serif',
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* 버튼 영역 */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginTop: "1rem",
            }}
          >
            <button
              style={{
                backgroundColor: "transparent",
                color: "#8a5a2a",
                border: "1px solid rgba(0,0,0,0.1)",
                fontSize: "0.8rem",
                padding: "0.6rem 0.9rem",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 500,
              }}
              onClick={() => {
                setTitle("");
                setBody("");
              }}
            >
              초기화
            </button>

            <button
              onClick={handleSave}
              style={{
                background:
                  "linear-gradient(90deg, #ffe2b2 0%, #fff0d6 100%)",
                border: "1px solid rgba(255,190,140,0.4)",
                color: "#5b3c1e",
                fontWeight: 600,
                fontSize: "0.8rem",
                padding: "0.7rem 1rem",
                borderRadius: "10px",
                cursor: "pointer",
                boxShadow:
                  "0 10px 25px rgba(255,190,120,0.4), 0 4px 10px rgba(0,0,0,0.08)",
                minWidth: "90px",
              }}
            >
              저장하기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
