import React from "react";
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
  const fields = ["observations", "advice", "evidence", "citations"];
  return fields.some((key) => Array.isArray(analysis[key]) && analysis[key].length > 0);
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
            const observationsList = renderList(analysis?.observations);
            const adviceList = renderList(analysis?.advice);
            const evidenceList = renderList(analysis?.evidence);
            const citationsList = renderList(analysis?.citations);

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
                      {observationsList && (
                        <>
                          <SectionTitle>관찰</SectionTitle>
                          {observationsList}
                        </>
                      )}
                      {adviceList && (
                        <>
                          <SectionTitle>조언</SectionTitle>
                          {adviceList}
                        </>
                      )}
                      {evidenceList && (
                        <>
                          <SectionTitle>근거</SectionTitle>
                          {evidenceList}
                        </>
                      )}
                      {citationsList && (
                        <>
                          <SectionTitle>출처</SectionTitle>
                          {citationsList}
                        </>
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
