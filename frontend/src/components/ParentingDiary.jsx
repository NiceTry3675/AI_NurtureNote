import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { postEntry } from "../api/client";

// ----------------------------------------------------
// 햄버거 메뉴 + 사이드바
// ----------------------------------------------------
const MenuIcon = styled.div`
  position: fixed;
  top: 25px;
  left: 25px;
  width: 35px;
  height: 30px;
  cursor: pointer;
  z-index: 20;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  div {
    height: 4px;
    background: #fff;
    border-radius: 2px;
    transition: 0.3s;
  }

  &:hover div:nth-child(1) {
    transform: translateY(10px) rotate(45deg);
  }
  &:hover div:nth-child(2) {
    opacity: 0;
  }
  &:hover div:nth-child(3) {
    transform: translateY(-10px) rotate(-45deg);
  }
`;

const Sidebar = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: ${(props) => (props.open ? "230px" : "0")};
  height: 100vh;
  background: linear-gradient(to bottom, #2a2a72, #009ffd);
  color: white;
  overflow: hidden;
  transition: width 0.4s ease;
  box-shadow: ${(props) => (props.open ? "4px 0 10px rgba(0,0,0,0.3)" : "none")};
  z-index: 15;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: ${(props) => (props.open ? "30px 20px" : "0")};
`;

const SidebarList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const SidebarItem = styled.li`
  margin-bottom: 20px;
  font-size: 1.1em;
  cursor: pointer;
  transition: 0.3s;
  &:hover {
    color: #ffde8a;
  }
`;

const FooterText = styled.div`
  font-size: 0.85em;
  opacity: 0.7;
  text-align: center;
`;

// ----------------------------------------------------
// 본문 내려가기 효과
// ----------------------------------------------------
const MainArea = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  width: 100%;
  transition: transform 0.4s ease;
  transform: ${(props) => (props.open ? "translateY(25px)" : "translateY(0)")};
`;

// ----------------------------------------------------
// 일기장 스타일
// ----------------------------------------------------
const floatIn = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

const SpiralArea = styled.div`
  width: 44px;
  background: linear-gradient(to right, #e8dfcc, #f1ead7);
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  padding: 20px 0;
`;

const SpiralRing = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #8b7758;
  background: radial-gradient(circle at 30% 30%, #cbb187, #9b8566);
`;

const DiaryContainer = styled.div`
  position: relative;
  display: flex;
  width: min(860px, 94vw);
  min-height: 720px;
  max-height: 86vh;
  background: linear-gradient(135deg, #fffaf0 0%, #fff3da 100%);
  border-radius: 16px;
  border: 1px solid #e6c9a8;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  animation: ${floatIn} 0.6s ease both;
  backdrop-filter: blur(2px);
`;

const DiaryContent = styled.div`
  flex-grow: 1;
  padding: 28px 40px 120px;
  background-image: linear-gradient(
      to right,
      rgba(139, 115, 85, 0.12) 1px,
      transparent 1px
    ),
    linear-gradient(rgba(139, 115, 85, 0.12) 1px, transparent 1px);
  background-size: 100% 28px, 100% 28px;
  overflow-y: auto;
  color: #3a2e1f;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.8em;
  color: #3a2e1f;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
`;

const SectionHeading = styled.h3`
  font-size: 1.05em;
  color: #5b4a3c;
  margin: 18px 0 10px;
  font-weight: 700;
`;

const DiaryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const DateBadge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #f7a072, #e77f67);
  color: #fff;
  font-size: 0.95em;
  box-shadow: 0 6px 14px rgba(231, 127, 103, 0.35);
`;

const FieldGroup = styled.div`
  margin-bottom: 18px;
`;

const Textarea = styled.textarea`
  /* 오른쪽을 살짝 덜 차도록 너비 감소 */
  width: calc(100% - 16px);
  box-sizing: border-box;
  padding: 14px 16px;
  border: 1px solid rgba(212, 165, 116, 0.35);
  background: rgba(255, 255, 255, 0.6);
  resize: none; /* 크기 고정 */
  font-size: 1.05em;
  line-height: 1.8;
  color: #3a2e1f;
  border-radius: 12px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
  height: ${(p) => (p.$size === 'large' ? '240px' : '160px')}; /* 기본 크기 확대 및 고정 */

  &::placeholder { color: rgba(58, 46, 31, 0.5); }

  &:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.85);
    border-color: #e7a571;
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12);
  }
`;

// ✅ “완료하기” 버튼 (오른쪽 하단 고정)
const CompleteButton = styled.button`
  position: absolute;
  bottom: 25px;
  right: 25px;
  padding: 13px 32px;
  border: none;
  border-radius: 12px;
  font-family: 'IsYun', sans-serif;
  font-size: 1.1em;
  cursor: pointer;
  color: white;
  background: linear-gradient(135deg, #f7a072, #e77f67);
  box-shadow: 0 10px 22px rgba(0,0,0,0.28);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px) scale(1.02);
    background: linear-gradient(135deg, #ffb088, #ea8f78);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
    transform: none;
  }

  &:disabled:hover {
    transform: none;
    background: linear-gradient(135deg, #f7a072, #e77f67);
  }
`;

const ErrorText = styled.div`
  margin-top: 10px;
  padding: 10px 12px;
  background: rgba(176, 0, 32, 0.08);
  color: #9b1b30;
  border-left: 4px solid rgba(176, 0, 32, 0.45);
  border-radius: 8px;
`;

const SuccessText = styled.div`
  margin-top: 10px;
  padding: 10px 12px;
  background: rgba(46, 125, 50, 0.08);
  color: #2e7d32;
  border-left: 4px solid rgba(46, 125, 50, 0.45);
  border-radius: 8px;
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  color: #4b3f30;
`;

const ToggleCheckbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #e77f67;
`;

// (빠른 선택 칩 제거)

// ----------------------------------------------------
// 메인 컴포넌트
// ----------------------------------------------------
const ParentingDiary = ({
  onEntrySaved = () => {},
  showCompleteButton = true,
  onNavigate = () => {},
}) => {
  const [open, setOpen] = useState(false);
  const [emotion, setEmotion] = useState("");
  const [event, setEvent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [useWebSearch, setUseWebSearch] = useState(true);

  // (빠른 선택 칩 데이터 제거)

  const today = new Date();
  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const handleComplete = async () => {
    setError("");
    setSuccess("");
    const mood = emotion.trim();
    const body = event.trim();
    if (!mood || !body) {
      setError("감정과 아이의 하루를 모두 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      const data = await postEntry({ mood, body, useWebSearch });
      setSuccess("일기가 저장되었습니다. 분석 결과는 잠시 후 목록에서 확인할 수 있어요.");
      setEmotion("");
      setEvent("");
      try {
        onEntrySaved(data);
      } catch (callbackError) {
        console.warn("onEntrySaved callback failed", callbackError);
      }
    } catch (e) {
      setError(e?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ☰ 햄버거 아이콘 */}
      <MenuIcon
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div></div>
        <div></div>
        <div></div>
      </MenuIcon>

      {/* 사이드 메뉴 */}
      <Sidebar
        open={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div>
          <h2 style={{ fontSize: "1.4em", marginBottom: "25px" }}>메뉴</h2>
          <SidebarList>
            <SidebarItem
              onClick={() => {
                onNavigate("compose");
                setOpen(false);
              }}
            >
              새 일기 작성
            </SidebarItem>
            <SidebarItem
              onClick={() => {
                onNavigate("calendar");
                setOpen(false);
              }}
            >
              캘린더 보기
            </SidebarItem>
            <SidebarItem
              onClick={() => {
                onNavigate("weekly");
                setOpen(false);
              }}
            >
              주간 대시보드
            </SidebarItem>
          </SidebarList>
        </div>
        <FooterText>© 2025 DrawMind</FooterText>
      </Sidebar>

      {/* 본문 */}
      <MainArea open={open}>
        <DiaryContainer>
          <SpiralArea>
            {[...Array(7)].map((_, i) => (
              <SpiralRing key={i} />
            ))}
          </SpiralArea>

          <DiaryContent>
            <DiaryHeader>
              <Title>오늘의 육아 일기</Title>
              <DateBadge>{formattedDate}</DateBadge>
            </DiaryHeader>

            <FieldGroup>
              <SectionHeading>오늘의 감정</SectionHeading>
              <Textarea
                placeholder="오늘 느낀 감정을 적어주세요."
                value={emotion}
                onChange={(e) => {
                  setEmotion(e.target.value);
                  if (error) {
                    setError("");
                  }
                  if (success) {
                    setSuccess("");
                  }
                }}
                $size="medium"
            />
            </FieldGroup>

            <FieldGroup>
              <SectionHeading>아이의 하루</SectionHeading>
              <Textarea
                placeholder="아이의 하루를 기록해주세요."
                value={event}
                onChange={(e) => {
                  setEvent(e.target.value);
                  if (error) {
                    setError("");
                  }
                  if (success) {
                    setSuccess("");
                  }
                }}
                $size="large"
            />
            </FieldGroup>
            {error && <ErrorText>{error}</ErrorText>}
            {success && <SuccessText>{success}</SuccessText>}

            <ToggleRow>
              <ToggleCheckbox
                id="useWebSearch"
                type="checkbox"
                checked={useWebSearch}
                onChange={(e) => setUseWebSearch(e.target.checked)}
              />
              <label htmlFor="useWebSearch">웹 출처 포함(공신력 있는 사이트만 검색해요)</label>
            </ToggleRow>

            {/* ✅ 오른쪽 하단 고정 버튼 */}
            {showCompleteButton && (
              <CompleteButton onClick={handleComplete} disabled={loading}>
                {loading ? "저장 중..." : "완료하기"}
              </CompleteButton>
            )}
          </DiaryContent>
        </DiaryContainer>
      </MainArea>
    </>
  );
};

export default ParentingDiary;
