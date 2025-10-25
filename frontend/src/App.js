import React, { useState } from "react";
import DiaryDashboard from "./components/DiaryDashboard";
import styled, { createGlobalStyle, keyframes } from "styled-components";

// ----------------------------------------------------
// Global Style (폰트 + 배경)
// ----------------------------------------------------
const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: 'IsYun';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2202-2@1.0/LeeSeoyun.woff') format('woff');
    font-weight: normal;
    font-display: swap;
  }

  body {
    margin: 0;
    font-family: 'IsYun', sans-serif;
    background: url('/night.png') center/cover fixed no-repeat;
    color: #fff;
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
  }
`;

// ----------------------------------------------------
// 애니메이션
// ----------------------------------------------------
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ----------------------------------------------------
// 메인 시작 화면 스타일
// ----------------------------------------------------
const StartScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* ✅ 위쪽 정렬 */
  height: 100vh;
  text-align: center;
  animation: ${fadeIn} 1.2s ease forwards;
  padding-top: 220px; /* ✅ 화면 위에서부터 살짝 띄움 */
  position: relative;
`;

// 🍼 Hero 이미지
const HeroImage = styled.img`
  width: 420px; /* ✅ 더 커짐 */
  max-width: 80%;
  margin-bottom: 25px;
  position: relative;
  top: -30px; /* ✅ 위로 올림 */
  filter: drop-shadow(0 16px 28px rgba(0, 0, 0, 0.4));
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
`;

// ✨ MOMent 타이틀
const Title = styled.h1`
  font-size: 7.5em; /* ✅ 크게 강조 */
  margin: 0;
  letter-spacing: 5px;
  text-shadow: 5px 5px 15px rgba(0, 0, 0, 0.6);
  font-family: 'IsYun', sans-serif;
  color: #fff;
  position: relative;
  top: -20px; /* ✅ 이미지보다 살짝 위 */
`;

// 🌙 부제 문구
const Subtitle = styled.p`
  font-size: 1.55em;
  margin-top: 15px;
  margin-bottom: 50px;
  color: #f0f0f0;
  font-family: 'IsYun', sans-serif;
  position: relative;
  top: -15px; /* ✅ 타이틀과 버튼 사이 자연스러운 간격 */
`;

// 🎀 시작 버튼
const StartButton = styled.button`
  background: linear-gradient(135deg, #f7a072, #e77f67);
  color: white;
  border: none;
  border-radius: 14px;
  padding: 18px 52px;
  font-size: 1.4em;
  font-family: 'IsYun', sans-serif;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(0,0,0,0.35);
  transition: all 0.3s ease;
  position: relative;
  top: -10px;

  &:hover {
    transform: translateY(-3px) scale(1.04);
    background: linear-gradient(135deg, #ffb088, #ea8f78);
  }
`;

// ----------------------------------------------------
// App 컴포넌트
// ----------------------------------------------------
const App = () => {
  const [started, setStarted] = useState(false);

  return (
    <>
      <GlobalStyle />
      {!started ? (
        <StartScreen>
          <HeroImage src="/main_baby.png" alt="MOMent 메인 로고" />
          <Title>MOMent</Title>
          <Subtitle>오늘 하루를 기록하러 갈까요?</Subtitle>
          <StartButton onClick={() => setStarted(true)}>시작하기</StartButton>
        </StartScreen>
      ) : (
        <DiaryDashboard />
      )}
    </>
  );
};

export default App;
