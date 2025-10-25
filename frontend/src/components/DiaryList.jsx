import React, { useState } from "react";
import styled from "styled-components";

const ListWrapper = styled.section`
  width: min(960px, 90vw);
  background: rgba(255, 255, 255, 0.88);
  border-radius: 18px;
  padding: 32px 36px;
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.35);
  color: #2f2920;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const Heading = styled.h2`
  margin: 0;
  font-size: 1.8em;
  color: #3a2e1f;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const RefreshButton = styled.button`
  background: linear-gradient(135deg, #f7a072, #e77f67);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-family: 'IsYun', sans-serif;
  font-size: 0.95em;
  padding: 10px 20px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingText = styled.span`
  font-size: 0.95em;
  color: #5b4a3c;
`;

const ErrorBanner = styled.div`
  background: rgba(176, 0, 32, 0.1);
  color: #9b1b30;
  border: 1px solid rgba(176, 0, 32, 0.3);
  padding: 10px 14px;
  border-radius: 10px;
  margin-bottom: 18px;
`;

const EmptyState = styled.div`
  padding: 60px 0;
  text-align: center;
  font-size: 1.1em;
  color: #5b4a3c;
`;

const EntriesScroll = styled.div`
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  padding-right: 6px;
`;

const EntryCard = styled.article`
  background: linear-gradient(135deg, #fffdf7 0%, #fff7e6 100%);
  border: 1px solid rgba(212, 165, 116, 0.4);
  border-left: 6px solid #e3a76f;
  border-radius: 14px;
  padding: 20px 24px;
  margin-bottom: 20px;
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

const AnalysisSection = styled.div`
  margin-top: 18px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 12px;
  border: 1px solid rgba(212, 165, 116, 0.35);
`;

const SectionTitle = styled.h4`
  margin: 0 0 10px;
  color: #3a2e1f;
`;

const AnalysisList = styled.ul`
  margin: 0 0 12px;
  padding-left: 18px;
  color: #3d3225;
  line-height: 1.55;
`;

const PendingBadge = styled.span`
  display: inline-block;
  margin-top: 14px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.08);
  color: #5b4a3c;
  font-size: 0.9em;
`;

const Disclaimer = styled.p`
  margin: 10px 0 0;
  font-size: 0.85em;
  color: #5a4c38;
`;

const NoAnalysisText = styled.div`
  margin-top: 12px;
  color: #5b4a3c;
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
`;

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

const hasAnalysisContent = (analysis) => {
  if (!analysis) return false;
  // Prefer new keys; fallback to legacy if backend not yet updated
  const fields = [
    "maternal_feedback",
    "child_development_insights",
    "parenting_guidelines",
  ];
  const legacy = ["observations", "advice", "evidence"]; // legacy, not shown explicitly
  const anyNew = fields.some((key) => Array.isArray(analysis[key]) && analysis[key].length > 0);
  if (anyNew) return true;
  return legacy.some((key) => Array.isArray(analysis[key]) && analysis[key].length > 0);
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

const DiaryList = ({ entries = [], loading = false, error = "", onRefresh = () => {} }) => {
  const hasEntries = entries.length > 0;
  const [showSourcesMap, setShowSourcesMap] = useState({});

  const toggleSources = (entryId) => {
    setShowSourcesMap((prev) => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  return (
    <ListWrapper>
      <HeaderRow>
        <Heading>나의 일기 목록</Heading>
        <Controls>
          {loading && <LoadingText>불러오는 중...</LoadingText>}
          <RefreshButton onClick={onRefresh} disabled={loading}>
            {loading ? "갱신 중" : "새로고침"}
          </RefreshButton>
        </Controls>
      </HeaderRow>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {!hasEntries && !loading ? (
        <EmptyState>
          아직 작성한 일기가 없습니다. 오늘 하루를 따뜻하게 기록해 보세요.
        </EmptyState>
      ) : (
        <EntriesScroll>
          {entries.map((entry) => {
            const analysis = entry.analysis;
            const hasContent = hasAnalysisContent(analysis);
            // Prefer new keys; legacy fallbacks keep older data readable
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
              <EntryCard key={entry.id}>
                <EntryHeader>
                  <EntryDate>{formatDateTime(entry.created_at)}</EntryDate>
                  <MoodBadge>{entry.mood}</MoodBadge>
                </EntryHeader>
                <EntryBody>{entry.body}</EntryBody>

                {analysis ? (
                  hasContent ? (
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
                          <ToggleSourcesButton onClick={() => toggleSources(entry.id)}>
                            {showSourcesMap[entry.id] ? "출처 숨기기" : "출처 보기"}
                          </ToggleSourcesButton>
                          {showSourcesMap[entry.id] && (
                            <>
                              <SectionTitle>출처</SectionTitle>
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
                  ) : (
                    <NoAnalysisText>
                      분석이 완료되었지만 전달할 내용이 없었습니다. 필요하다면 질문을 더 구체적으로 적어보세요.
                    </NoAnalysisText>
                  )
                ) : (
                  <PendingBadge>AI 분석 준비 중입니다...</PendingBadge>
                )}
              </EntryCard>
            );
          })}
        </EntriesScroll>
      )}
    </ListWrapper>
  );
};

export default DiaryList;
