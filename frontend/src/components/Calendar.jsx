import React, { useState, useEffect } from "react";
import styled from "styled-components";
import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import NavigationMenu from "./NavigationMenu";
import { getEntries } from "../api/client";

// ----------------------------------------------------
// 캘린더 래퍼
// ----------------------------------------------------
const CalendarWrapper = styled.div`
  width: min(900px, 90vw);
  background: rgba(255, 255, 255, 0.88);
  border-radius: 18px;
  padding: 32px 36px;
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.35);
  color: #2f2920;

  .react-calendar {
    width: 100%;
    border: none;
    border-radius: 12px;
    font-family: 'IsYun', sans-serif;
    background: transparent;
  }

  .react-calendar__navigation {
    display: flex;
    margin-bottom: 20px;
    height: 50px;
  }

  .react-calendar__navigation button {
    min-width: 44px;
    background: none;
    border: none;
    font-size: 1.2em;
    color: #3a2e1f;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'IsYun', sans-serif;
  }

  .react-calendar__navigation button:enabled:hover,
  .react-calendar__navigation button:enabled:focus {
    background-color: rgba(231, 127, 103, 0.1);
    border-radius: 8px;
  }

  .react-calendar__month-view__weekdays {
    text-align: center;
    font-weight: 600;
    font-size: 0.9em;
    color: #5b4a3c;
    text-transform: uppercase;
  }

  .react-calendar__month-view__weekdays__weekday {
    padding: 10px 0;
  }

  .react-calendar__tile {
    max-width: 100%;
    padding: 16px 8px;
    background: none;
    text-align: center;
    border: none;
    font-size: 1em;
    color: #3d3225;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .react-calendar__tile:enabled:hover,
  .react-calendar__tile:enabled:focus {
    background-color: rgba(212, 165, 116, 0.2);
  }

  .react-calendar__tile--now {
    background: rgba(231, 127, 103, 0.15);
    font-weight: 600;
    color: #d46d57;
  }

  .react-calendar__tile--active {
    background: linear-gradient(135deg, #f7a072, #e77f67);
    color: white;
    font-weight: 600;
  }

  .react-calendar__tile--active:enabled:hover,
  .react-calendar__tile--active:enabled:focus {
    background: linear-gradient(135deg, #ffb088, #ea8f78);
  }

  /* 일기가 있는 날짜 스타일 */
  .react-calendar__tile.has-entry {
    background-color: rgba(247, 160, 114, 0.25);
    font-weight: 600;
  }

  .react-calendar__tile.has-entry:enabled:hover {
    background-color: rgba(247, 160, 114, 0.4);
  }

  .react-calendar__month-view__days__day--weekend {
    color: #d46d57;
  }

  .react-calendar__month-view__days__day--neighboringMonth {
    color: #bbb;
  }
`;

const Heading = styled.h2`
  margin: 0 0 24px;
  font-size: 1.8em;
  color: #3a2e1f;
  text-align: center;
`;

const LoadingText = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #5b4a3c;
  font-size: 1.1em;
`;

const ErrorBanner = styled.div`
  background: rgba(176, 0, 32, 0.1);
  color: #9b1b30;
  border: 1px solid rgba(176, 0, 32, 0.3);
  padding: 10px 14px;
  border-radius: 10px;
  margin-bottom: 18px;
`;

const InfoText = styled.p`
  margin: 16px 0 0;
  text-align: center;
  color: #5b4a3c;
  font-size: 0.95em;
`;

// ----------------------------------------------------
// 헬퍼 함수
// ----------------------------------------------------
const formatDateKey = (date) => {
  // YYYY-MM-DD 형식으로 변환
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isSameDay = (date1, date2) => {
  return formatDateKey(date1) === formatDateKey(date2);
};

// ----------------------------------------------------
// 메인 컴포넌트
// ----------------------------------------------------
const Calendar = ({ onDateSelect, onNavigate = () => {} }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entryDateMap, setEntryDateMap] = useState({});

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      setError("");
      try {
        // 충분히 많은 일기를 가져옴 (최대 100개)
        const data = await getEntries({ limit: 100 });
        setEntries(data);

        // 날짜별로 일기를 매핑
        const dateMap = {};
        data.forEach((entry) => {
          if (!entry.created_at) return;
          try {
            const entryDate = new Date(entry.created_at);
            const dateKey = formatDateKey(entryDate);
            if (!dateMap[dateKey]) {
              dateMap[dateKey] = [];
            }
            dateMap[dateKey].push(entry);
          } catch (err) {
            console.warn("Failed to parse entry date", entry.created_at, err);
          }
        });
        setEntryDateMap(dateMap);
      } catch (err) {
        setError(err?.message || "일기 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, []);

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dateKey = formatDateKey(date);
    const entriesOnDate = entryDateMap[dateKey] || [];

    if (entriesOnDate.length > 0) {
      // 가장 최근 일기를 선택 (첫 번째 항목)
      onDateSelect(entriesOnDate[0]);
    }
  };

  const tileClassName = ({ date, view }) => {
    // 월 뷰에서만 적용
    if (view !== "month") return null;

    const dateKey = formatDateKey(date);
    const hasEntry = entryDateMap[dateKey] && entryDateMap[dateKey].length > 0;

    return hasEntry ? "has-entry" : null;
  };

  if (loading) {
    return (
      <>
        <NavigationMenu onNavigate={onNavigate} />
        <CalendarWrapper>
          <LoadingText>캘린더를 불러오는 중...</LoadingText>
        </CalendarWrapper>
      </>
    );
  }

  return (
    <>
      <NavigationMenu onNavigate={onNavigate} />
      <CalendarWrapper>
        <Heading>나의 육아 캘린더</Heading>
        {error && <ErrorBanner>{error}</ErrorBanner>}

        <ReactCalendar
          onChange={handleDateClick}
          value={selectedDate}
          locale="ko-KR"
          formatDay={(locale, date) => date.getDate()}
          tileClassName={tileClassName}
          calendarType="gregory"
        />

        <InfoText>
          {Object.keys(entryDateMap).length > 0
            ? `총 ${Object.keys(entryDateMap).length}일의 기록이 있습니다.`
            : "아직 작성한 일기가 없습니다."}
        </InfoText>
      </CalendarWrapper>
    </>
  );
};

export default Calendar;
