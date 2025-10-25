import React from "react";
import styled from "styled-components";
import NavigationMenu from "./NavigationMenu";

// ----------------------------------------------------
// 일기 표시 패널 스타일
// ----------------------------------------------------
const DisplayWrapper = styled.div`
  width: 100%;
  max-width: 600px;
  background: linear-gradient(135deg, #fffdf7 0%, #fff7e6 100%);
  border-radius: 18px;
  padding: 36px 40px;
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.35);
  color: #2f2920;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
  border: 2px solid rgba(212, 165, 116, 0.4);
  border-left: 6px solid #e3a76f;
`;

const EntryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px dashed rgba(212, 165, 116, 0.3);
`;

const EntryDate = styled.h3`
  margin: 0;
  font-weight: 600;
  color: #3a2e1f;
  font-size: 1.15em;
`;

const MoodBadge = styled.span`
  background: rgba(231, 127, 103, 0.15);
  color: #d46d57;
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 1em;
  font-weight: 500;
`;

const EntryTitle = styled.h2`
  margin: 0 0 20px;
  color: #3a2e1f;
  font-size: 1.5em;
  text-align: center;
`;

const EntryBody = styled.p`
  margin: 0;
  color: #3d3225;
  line-height: 1.8;
  white-space: pre-line;
  font-size: 1.05em;
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #5b4a3c;
  font-size: 1.1em;
`;

// ----------------------------------------------------
// 헬퍼 함수
// ----------------------------------------------------
const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return value;
  }
};

// ----------------------------------------------------
// 메인 컴포넌트
// ----------------------------------------------------
const EntryDisplay = ({ entry, onNavigate = () => {} }) => {
  if (!entry) {
    return (
      <>
        <NavigationMenu onNavigate={onNavigate} />
        <DisplayWrapper>
          <EmptyState>표시할 일기가 없습니다.</EmptyState>
        </DisplayWrapper>
      </>
    );
  }

  return (
    <>
      <NavigationMenu onNavigate={onNavigate} />
      <DisplayWrapper>
        <EntryTitle>오늘의 육아 일기</EntryTitle>
        <EntryHeader>
          <EntryDate>{formatDateTime(entry.created_at)}</EntryDate>
          <MoodBadge>{entry.mood}</MoodBadge>
        </EntryHeader>
        <EntryBody>{entry.body}</EntryBody>
      </DisplayWrapper>
    </>
  );
};

export default EntryDisplay;
