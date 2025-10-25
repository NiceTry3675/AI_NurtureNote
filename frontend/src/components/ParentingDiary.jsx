import React, { useState } from "react";
import styled from "styled-components";
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
const SpiralArea = styled.div`
  width: 50px;
  background: linear-gradient(to right, #dcd4c2, #eae4d3);
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
  border: 2px solid #6b5a43;
  background: radial-gradient(circle at 30% 30%, #bfa87b, #8b7758);
`;

const DiaryContainer = styled.div`
  position: relative;
  display: flex;
  width: 650px;
  height: 850px;
  background: linear-gradient(135deg, #fff9e6 0%, #fff5d6 100%);
  border-radius: 10px;
  border: 2px solid #d4a574;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
`;

const DiaryContent = styled.div`
  flex-grow: 1;
  padding: 35px 45px;
  background-image: linear-gradient(
      to right,
      rgba(139, 115, 85, 0.15) 1px,
      transparent 1px
    ),
    linear-gradient(rgba(139, 115, 85, 0.2) 1px, transparent 1px);
  background-size: 100% 30px, 100% 30px;
  overflow-y: auto;
`;

const Title = styled.h2`
  text-align: center;
  font-size: 1.9em;
  color: #3a2e1f;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.15);
`;

const SectionHeading = styled.h3`
  font-size: 1.3em;
  color: #444;
  margin-top: 15px;
  border-bottom: 1px dashed #e0e0e0;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px 15px;
  border: none;
  background: transparent;
  resize: vertical;
  font-size: 1.1em;
  line-height: 1.8;
  color: #333;
  &:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.4);
  }
`;

// ✅ “완료하기” 버튼 (오른쪽 하단 고정)
const CompleteButton = styled.button`
  position: absolute;
  bottom: 25px;
  right: 25px;
  padding: 12px 30px;
  border: none;
  border-radius: 10px;
  font-family: 'IsYun', sans-serif;
  font-size: 1.1em;
  cursor: pointer;
  color: white;
  background: linear-gradient(135deg, #f7a072, #e77f67);
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
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
  color: #b00020;
  margin-top: 10px;
`;

const SuccessText = styled.div`
  color: #2e7d32;
  margin-top: 10px;
`;

// ----------------------------------------------------
// 메인 컴포넌트
// ----------------------------------------------------
const ParentingDiary = ({ onEntrySaved = () => {} }) => {
  const [open, setOpen] = useState(false);
  const [emotion, setEmotion] = useState("");
  const [event, setEvent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      const data = await postEntry({ mood, body });
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
            <SidebarItem>나의 기록 관리</SidebarItem>
            <SidebarItem>프로모션 구독</SidebarItem>
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
            <Title>오늘의 육아 일기</Title>
            <SectionHeading>{formattedDate} 육아일기</SectionHeading>

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
            />

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
            />
            {error && <ErrorText>{error}</ErrorText>}
            {success && <SuccessText>{success}</SuccessText>}

            {/* ✅ 오른쪽 하단 고정 버튼 */}
            <CompleteButton onClick={handleComplete} disabled={loading}>
              {loading ? "저장 중..." : "완료하기"}
            </CompleteButton>
          </DiaryContent>
        </DiaryContainer>
      </MainArea>
    </>
  );
};

export default ParentingDiary;
