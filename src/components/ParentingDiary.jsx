import React, { useState, useMemo } from 'react';
import styled, { keyframes, createGlobalStyle } from 'styled-components';

// ----------------------------------------------------
// 0. Global Style (폰트 + 배경)
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
    font-size: 18px;
    line-height: 1.7;
    color: #333;
    overflow: hidden;
  }

  #root {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(to bottom, #0a1128 0%, #1a2650 50%, #2d3561 100%);
    position: relative;
  }
`;

// ----------------------------------------------------
// 1. 별 반짝임 애니메이션
// ----------------------------------------------------
const twinkle = keyframes`
  0% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0.5; transform: scale(1); }
`;

// ----------------------------------------------------
// 2. Styled Components
// ----------------------------------------------------
const Star = styled.div`
  position: absolute;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: ${twinkle} ${props => props.duration}s ease-in-out infinite ${props => props.delay}s alternate;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  top: ${props => props.top}%;
  left: ${props => props.left}%;
  filter: blur(${props => props.size / 6}px);
`;

// 📎 스프링 영역
const SpiralArea = styled.div`
  width: 50px;
  background: linear-gradient(to right, #dcd4c2, #eae4d3);
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  padding: 20px 0;
  border-right: 2px solid rgba(120, 100, 80, 0.3);
  box-shadow: inset -2px 0 4px rgba(0,0,0,0.1);
`;

const SpiralRing = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #6b5a43;
  background: radial-gradient(circle at 30% 30%, #bfa87b, #8b7758);
  box-shadow: inset 1px 1px 3px rgba(255,255,255,0.4),
              inset -2px -2px 3px rgba(0,0,0,0.3);
`;

// ✨ 베이지톤 일기장
const DiaryContainer = styled.div`
  display: flex;
  flex-direction: row;
  position: relative;
  width: 650px;
  height: 850px;
  max-width: 90vw;
  max-height: 90vh;

  background: linear-gradient(135deg, #fff9e6 0%, #fff5d6 100%);
  border-radius: 10px;
  border: 2px solid #d4a574;

  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  overflow: hidden;
`;

const DiaryContent = styled.div`
  flex-grow: 1;
  padding: 35px 45px;
  position: relative;
  overflow-y: auto;
  font-family: 'IsYun', sans-serif;

  /* 줄선 효과 */
  background-image:
    linear-gradient(to right, rgba(139, 115, 85, 0.15) 1px, transparent 1px),
    linear-gradient(rgba(139, 115, 85, 0.2) 1px, transparent 1px);
  background-size: 100% 30px, 100% 30px;
  background-position: 0 0, 0 50px;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 115, 85, 0.4);
    border-radius: 4px;
  }
`;

const Title = styled.h2`
  text-align: center;
  font-size: 1.9em;
  margin-top: 15px;
  margin-bottom: 25px;
  color: #3a2e1f;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.15);
`;

const SectionHeading = styled.h3`
  font-size: 1.3em;
  color: #444;
  margin-top: 15px;
  margin-bottom: 8px;
  border-bottom: 1px dashed #e0e0e0;
  padding-bottom: 5px;
`;

const BaseDiaryTextarea = styled.textarea`
  width: 100%;
  padding: 10px 15px;
  border: none;
  background: transparent;
  resize: vertical;
  font-family: 'IsYun', sans-serif;
  font-size: 1.15em;
  line-height: 1.8;
  color: #333;
  box-sizing: border-box;
  &:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.4);
  }
`;

const DiaryEmotionTextarea = styled(BaseDiaryTextarea)`
  height: 120px;
  margin-bottom: 5px;
`;

const DiaryEventTextarea = styled(BaseDiaryTextarea)`
  height: 280px;
  margin-bottom: 5px;
`;

const CharCount = styled.div`
  text-align: right;
  font-size: 0.9em;
  color: #777;
  margin-bottom: 10px;
`;

const TotalCharCount = styled(CharCount)`
  font-weight: bold;
  color: #555;
  margin-top: 10px;
  border-top: 1px dashed #e0e0e0;
  padding-top: 5px;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 15px;
`;

const BaseButton = styled.button`
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-family: 'IsYun', sans-serif;
  font-size: 1.1em;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
  }

  &:disabled {
    background: #ccc;
    color: #666;
    cursor: not-allowed;
  }
`;

const ResetButton = styled(BaseButton)`
  background: #f0f0f0;
  color: #555;
`;

const AnalyzeButton = styled(BaseButton)`
  background: linear-gradient(135deg, #f7a072, #e77f67);
  color: #fff;
  font-weight: bold;
`;

// ----------------------------------------------------
// 3. Main Component
// ----------------------------------------------------
const ParentingDiary = () => {
  const [emotionalContent, setEmotionalContent] = useState('');
  const [eventContent, setEventContent] = useState('');

  const MAX_EMOTION_CHARS = 200;
  const MAX_EVENT_CHARS = 800;

  const handleEmotionChange = e => {
    if (e.target.value.length <= MAX_EMOTION_CHARS) setEmotionalContent(e.target.value);
  };

  const handleEventChange = e => {
    if (e.target.value.length <= MAX_EVENT_CHARS) setEventContent(e.target.value);
  };

  const handleReset = () => {
    if (window.confirm('정말 일기를 초기화하시겠습니까?')) {
      setEmotionalContent('');
      setEventContent('');
    }
  };

  const handleAnalyze = () => {
    if (!emotionalContent.trim() && !eventContent.trim()) {
      alert('일기 내용을 작성해주세요!');
      return;
    }
    console.log('AI 분석 시작:', { emotionalContent, eventContent });
    alert('AI 분석을 시작합니다! (API 연동 필요)');
  };

  const totalChars = emotionalContent.length + eventContent.length;
  const isAnalyzeButtonDisabled = totalChars === 0;

  const stars = useMemo(() => (
    Array.from({ length: 15 }).map((_, i) => (
      <Star
        key={i}
        top={Math.random() * 100}
        left={Math.random() * 100}
        size={Math.random() * 3 + 1}
        duration={Math.random() * 3 + 2}
        delay={Math.random() * 2}
      />
    ))
  ), []);

  const today = new Date();
  const formattedDate = today.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  return (
    <>
      <GlobalStyle />
      {stars}
      <DiaryContainer>
        <SpiralArea>
          {[...Array(7)].map((_, i) => <SpiralRing key={i} />)}
        </SpiralArea>

        <DiaryContent>
          <Title>🌙 오늘의 육아 일기</Title>

          <SectionHeading>🍼 {formattedDate} 육아일기</SectionHeading>

          <SectionHeading>오늘의 감정</SectionHeading>
          <DiaryEmotionTextarea
            placeholder="오늘 육아를 하며 느낀 감정을 적어주세요."
            value={emotionalContent}
            onChange={handleEmotionChange}
          />
          <CharCount>{emotionalContent.length} / {MAX_EMOTION_CHARS} 자</CharCount>

          <SectionHeading>아이의 하루</SectionHeading>
          <DiaryEventTextarea
            placeholder="아이의 행동, 말, 표정, 건강 상태 등을 적어주세요."
            value={eventContent}
            onChange={handleEventChange}
          />
          <CharCount>{eventContent.length} / {MAX_EVENT_CHARS} 자</CharCount>

          <TotalCharCount>총 {totalChars} 자</TotalCharCount>

          <ButtonGroup>
            <ResetButton onClick={handleReset}>다시 쓰기</ResetButton>
            <AnalyzeButton onClick={handleAnalyze} disabled={isAnalyzeButtonDisabled}>
              AI 분석받기
            </AnalyzeButton>
          </ButtonGroup>
        </DiaryContent>
      </DiaryContainer>
    </>
  );
};

export default ParentingDiary;
