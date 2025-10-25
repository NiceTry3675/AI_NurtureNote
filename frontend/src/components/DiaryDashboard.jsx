import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import ParentingDiary from "./ParentingDiary";
import DiaryList from "./DiaryList";
import { getEntries } from "../api/client";

const DashboardWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 70px 24px 80px;
  box-sizing: border-box;
`;

const Brand = styled.h1`
  margin: 0 0 6px;
  font-size: 3.2em;
  letter-spacing: 3px;
  color: #fff5e6;
  text-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
`;

const Tagline = styled.p`
  margin: 0 0 32px;
  font-size: 1.15em;
  color: #f0ede9;
  text-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
`;

const NavBar = styled.nav`
  display: flex;
  gap: 14px;
  background: rgba(0, 0, 0, 0.35);
  padding: 10px;
  border-radius: 999px;
  margin-bottom: 32px;
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
`;

const TabButton = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== "active",
})`
  border: none;
  border-radius: 999px;
  padding: 12px 28px;
  font-family: 'IsYun', sans-serif;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ active }) => (active ? "rgba(255, 255, 255, 0.9)" : "transparent")};
  color: ${({ active }) => (active ? "#2e2a24" : "#f5f1eb")};
  box-shadow: ${({ active }) =>
    active ? "0 12px 22px rgba(0, 0, 0, 0.35)" : "0 6px 14px rgba(0, 0, 0, 0.2)"};

  &:hover {
    transform: translateY(-2px);
  }
`;

const ContentArea = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
`;

const DiaryDashboard = () => {
  const [view, setView] = useState("compose");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshEntries = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const data = await getEntries();
        setEntries(data);
        setError("");
      } catch (err) {
        const message = err?.message || "일기 목록을 불러오지 못했습니다.";
        setError(message);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  useEffect(() => {
    const hasPending = entries.some((entry) => !entry.analysis);
    if (!hasPending) {
      return undefined;
    }

    const interval = setInterval(() => {
      refreshEntries({ silent: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [entries, refreshEntries]);

  const handleEntrySaved = () => {
    refreshEntries({ silent: true });
    setView("list");
  };

  return (
    <DashboardWrapper>
      <Brand>MOMent</Brand>
      <Tagline>하루의 감정과 아이의 순간을 기록하고 AI 조언을 받아보세요.</Tagline>

      <NavBar>
        <TabButton
          type="button"
          active={view === "compose"}
          onClick={() => setView("compose")}
        >
          일기 작성
        </TabButton>
        <TabButton
          type="button"
          active={view === "list"}
          onClick={() => setView("list")}
        >
          일기 목록
        </TabButton>
      </NavBar>

      <ContentArea>
        {view === "compose" ? (
          <ParentingDiary onEntrySaved={handleEntrySaved} />
        ) : (
          <DiaryList
            entries={entries}
            loading={loading}
            error={error}
            onRefresh={() => refreshEntries()}
          />
        )}
      </ContentArea>
    </DashboardWrapper>
  );
};

export default DiaryDashboard;
