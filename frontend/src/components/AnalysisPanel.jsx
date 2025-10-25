import React, { useState } from "react";
import styled, { keyframes } from "styled-components";

// ----------------------------------------------------
// 스피너 애니메이션
// ----------------------------------------------------
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #f7a072;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
`;

// ----------------------------------------------------
// 패널 래퍼
// ----------------------------------------------------
const PanelWrapper = styled.div`
  width: 100%;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 18px;
  padding: 32px 36px;
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.35);
  color: #2f2920;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`;

const LoadingText = styled.p`
  font-size: 1.2em;
  color: #5b4a3c;
  margin: 0;
`;

const LoadingSubtext = styled.p`
  font-size: 0.95em;
  color: #8a7a6c;
  margin: 10px 0 0;
`;

// ----------------------------------------------------
// 일기 미리보기
// ----------------------------------------------------
const EntryPreview = styled.div`
  background: linear-gradient(135deg, #fffdf7 0%, #fff7e6 100%);
  border: 1px solid rgba(212, 165, 116, 0.4);
  border-left: 6px solid #e3a76f;
  border-radius: 14px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
`;

const EntryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
`;

const EntryDate = styled.span`
  font-weight: 600;
  color: #3a2e1f;
  font-size: 0.95em;
`;

const MoodBadge = styled.span`
  background: rgba(231, 127, 103, 0.15);
  color: #d46d57;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.95em;
`;

const EntryBody = styled.p`
  margin: 0;
  color: #3d3225;
  line-height: 1.6;
  white-space: pre-line;
`;

// ----------------------------------------------------
// 분석 결과
// ----------------------------------------------------
const AnalysisSection = styled.div`
  padding: 20px;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 12px;
  border: 1px solid rgba(212, 165, 116, 0.35);
`;

const SectionTitle = styled.h4`
  margin: 0 0 10px;
  color: #3a2e1f;
  font-size: 1.15em;
`;

const AnalysisList = styled.ul`
  margin: 0 0 16px;
  padding-left: 18px;
  color: #3d3225;
  line-height: 1.55;
`;

const Disclaimer = styled.p`
  margin: 10px 0 0;
  font-size: 0.85em;
  color: #5a4c38;
  padding-top: 10px;
  border-top: 1px dashed rgba(212, 165, 116, 0.3);
`;

const ToggleSourcesButton = styled.button`
  background: transparent;
  border: 1px dashed rgba(212, 165, 116, 0.8);
  color: #6a5844;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9em;
  margin-top: 8px;
  font-family: 'IsYun', sans-serif;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(212, 165, 116, 0.1);
  }
`;

// ----------------------------------------------------
// 헬퍼 함수
// ----------------------------------------------------
const renderList = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  return (
    <AnalysisList>
      {items.map((item, index) => {
        if (typeof item === "string") {
          return <li key={index}>{item}</li>;
        }
        if (item && typeof item === "object") {
          const text =
            item.summary ||
            item.quote ||
            item.text ||
            item.description ||
            JSON.stringify(item);
          return <li key={index}>{text}</li>;
        }
        return null;
      })}
    </AnalysisList>
  );
};

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
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
const AnalysisPanel = ({ entry }) => {
  const [showSources, setShowSources] = useState(false);

  // 분석이 아직 없으면 로딩 상태
  if (!entry || !entry.analysis) {
    return (
      <PanelWrapper>
        <LoadingContainer>
          <Spinner />
          <LoadingText>AI가 일기를 분석하고 있습니다...</LoadingText>
          <LoadingSubtext>잠시만 기다려주세요. 곧 완료됩니다.</LoadingSubtext>
        </LoadingContainer>
      </PanelWrapper>
    );
  }

  const analysis = entry.analysis;
  const maternalFeedbackList = renderList(
    analysis?.maternal_feedback || analysis?.observations
  );
  const childInsightsList = renderList(
    analysis?.child_development_insights || analysis?.observations
  );
  const guidelinesList = renderList(
    analysis?.parenting_guidelines || analysis?.advice
  );
  const sources = Array.isArray(analysis?.sources)
    ? analysis.sources
    : Array.isArray(analysis?.citations)
    ? analysis.citations
    : [];

  return (
    <PanelWrapper>
      {/* 작성한 일기 미리보기 */}
      <EntryPreview>
        <EntryHeader>
          <EntryDate>{formatDateTime(entry.created_at)}</EntryDate>
          <MoodBadge>{entry.mood}</MoodBadge>
        </EntryHeader>
        <EntryBody>{entry.body}</EntryBody>
      </EntryPreview>

      {/* AI 분석 결과 */}
      <AnalysisSection>
        {maternalFeedbackList && (
          <>
            <SectionTitle>산모 감정에 대한 피드백</SectionTitle>
            {maternalFeedbackList}
          </>
        )}
        {childInsightsList && (
          <>
            <SectionTitle>아이의 행동분석에 대한 발달 인사이트</SectionTitle>
            {childInsightsList}
          </>
        )}
        {guidelinesList && (
          <>
            <SectionTitle>육아 가이드라인(이런 행동을 해주시면 좋아요)</SectionTitle>
            {guidelinesList}
          </>
        )}
        {Array.isArray(sources) && sources.length > 0 && (
          <div>
            <ToggleSourcesButton onClick={() => setShowSources(!showSources)}>
              {showSources ? "출처 숨기기" : "출처 보기"}
            </ToggleSourcesButton>
            {showSources && (
              <>
                <SectionTitle style={{ marginTop: "12px" }}>출처</SectionTitle>
                <AnalysisList>
                  {sources.map((item, idx) => {
                    const isObj = item && typeof item === "object";
                    const title = isObj ? item.title || item.text : null;
                    const url = isObj ? item.url : null;
                    const label = title || url || (isObj ? JSON.stringify(item) : String(item));
                    return (
                      <li key={idx}>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer noopener">
                            {label}
                          </a>
                        ) : (
                          label
                        )}
                      </li>
                    );
                  })}
                </AnalysisList>
              </>
            )}
          </div>
        )}
        {analysis.disclaimer && <Disclaimer>{analysis.disclaimer}</Disclaimer>}
      </AnalysisSection>
    </PanelWrapper>
  );
};

export default AnalysisPanel;
