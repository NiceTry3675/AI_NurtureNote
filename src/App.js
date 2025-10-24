import React, { useState } from "react";
import ParentingDiary from "./components/ParentingDiary";
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
    background: url('/night.png') center/cover no-repeat;
    color: #fff;
    overflow: hidden;
  }
`;

// ----------------------------------------------------
// 페이드인 애니메이션
// ----------------------------------------------------
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(25px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ----------------------------------------------------
// 메인 시작 화면 스타일
// ----------------------------------------------------
const StartScreen = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  text-align: center;
  animation: ${fadeIn} 1.2s ease forwards;
`;

const Title = styled.h1`
  font-size: 5em; /* 🔥 훨씬 커짐 */
  margin-bottom: 30px;
  letter-spacing: 4px;
  text-shadow: 4px 4px 12px rgba(0, 0, 0, 0.6);
  font-family: 'IsYun', sans-serif;
  color: #fff;
`;

const Subtitle = styled.p`
  font-size: 1.45em;
  margin-bottom: 50px;
  color: #f0f0f0;
  font-family: 'IsYun', sans-serif;
`;

const StartButton = styled.button`
  background: linear-gradient(135deg, #f7a072, #e77f67);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 18px 48px;
  font-size: 1.3em;
  font-family: 'IsYun', sans-serif;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(0,0,0,0.35);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px) scale(1.03);
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
          <Title>MOMent</Title>
          <Subtitle>오늘 하루를 기록하러 갈까요?</Subtitle>
          <StartButton onClick={() => setStarted(true)}>시작하기</StartButton>
        </StartScreen>
      ) : (
        <ParentingDiary />
      )}
    </>
  );
};

export default App;
