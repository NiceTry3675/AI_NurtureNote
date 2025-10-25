// Gallery.jsx
import React, {
    useMemo,
    useEffect,
    useState,
    useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

export default function Gallery() {
    const navigate = useNavigate();

    // ✅ localStorage에서 불러온 전체 일기 목록
    const [entries, setEntries] = useState([]);

    // ✅ 오늘 (기준: "오늘이야?" 표시용)
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth(); // 0~11
    const todayDate = today.getDate();

    // ✅ "지금 보고 있는 달" (초기값: 오늘의 연/월)
    const [viewYear, setViewYear] = useState(todayYear);
    const [viewMonth, setViewMonth] = useState(todayMonth); // 0~11

    // ✅ 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null); // {date,title,body} 또는 null

    // localStorage에서 일기 불러오기
    useEffect(() => {
        const saved = JSON.parse(
            localStorage.getItem("diaryEntries") || "[]"
        );
        setEntries(saved);
    }, []);

    // 이 달에 어떤 날짜에 일기가 있는지 빠르게 lookup 하기
    // map["05"] = {date, title, body}
    const entriesByDay = useMemo(() => {
        const map = {};
        entries.forEach((entry) => {
            // entry.date 형식: "2025.10.25"
            const parts = entry.date.split(".");
            if (parts.length !== 3) return;
            const y = Number(parts[0]);
            const m = Number(parts[1]); // 1~12
            const d = parts[2]; // "01", "25", ...

            if (y === viewYear && m === viewMonth + 1) {
                map[d] = entry;
            }
        });
        return map;
    }, [entries, viewYear, viewMonth]);

    // 현재 보고 있는 달의 정보 계산
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0=일
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate(); // 마지막 날짜

    // 달력 셀 구성
    const calendarCells = useMemo(() => {
        const cells = [];

        // 지난달 정보
        const prevMonthLastDate = new Date(
            viewYear,
            viewMonth,
            0
        ).getDate();

        // 앞부분 (이전 달 날짜들)
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDate - i;
            cells.push({
                key: `prev-${dayNum}`,
                year: viewMonth === 0 ? viewYear - 1 : viewYear,
                month: viewMonth === 0 ? 11 : viewMonth - 1,
                day: dayNum,
                type: "prev",
                isToday: false,
                wrote: false,
                entry: null,
            });
        }

        // 이번 달 날짜들
        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = String(d).padStart(2, "0");
            const entryForDay = entriesByDay[dayStr] || null;
            const wrote = !!entryForDay;

            cells.push({
                key: `cur-${d}`,
                year: viewYear,
                month: viewMonth,
                day: d,
                type: "current",
                isToday:
                    viewYear === todayYear &&
                    viewMonth === todayMonth &&
                    d === todayDate,
                wrote,
                entry: entryForDay,
            });
        }

        // 뒷부분 (다음 달 날짜들)
        while (cells.length % 7 !== 0) {
            const nextDay =
                cells.length - (firstDayOfWeek + daysInMonth) + 1;
            const nextYear =
                viewMonth === 11 ? viewYear + 1 : viewYear;
            const nextMonth =
                viewMonth === 11 ? 0 : viewMonth + 1;

            cells.push({
                key: `next-${nextDay}`,
                year: nextYear,
                month: nextMonth,
                day: nextDay,
                type: "next",
                isToday: false,
                wrote: false,
                entry: null,
            });
        }

        // 42칸 (6주) 보장
        if (cells.length < 42) {
            const extra = 42 - cells.length;
            const baseDay = cells[cells.length - 1].day;
            const baseYear = cells[cells.length - 1].year;
            const baseMonth = cells[cells.length - 1].month;

            for (let i = 1; i <= extra; i++) {
                cells.push({
                    key: `next-extra-${i}`,
                    year: baseMonth === 11 ? baseYear + 1 : baseYear,
                    month: baseMonth === 11 ? 0 : baseMonth + 1,
                    day: baseDay + i,
                    type: "next",
                    isToday: false,
                    wrote: false,
                    entry: null,
                });
            }
        }

        return cells;
    }, [
        viewYear,
        viewMonth,
        todayYear,
        todayMonth,
        todayDate,
        firstDayOfWeek,
        daysInMonth,
        entriesByDay,
    ]);

    // 보기용 월 라벨 (예: "October 2025")
    const monthLabel = useMemo(() => {
        const tempDate = new Date(viewYear, viewMonth, 1);
        return tempDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
        });
    }, [viewYear, viewMonth]);

    // ◀ 이전 달, ▶ 다음 달 버튼 핸들러
    const goPrevMonth = useCallback(() => {
        if (viewMonth === 0) {
            setViewYear((y) => y - 1);
            setViewMonth(11);
        } else {
            setViewMonth((m) => m - 1);
        }
    }, [viewMonth]);

    const goNextMonth = useCallback(() => {
        if (viewMonth === 11) {
            setViewYear((y) => y + 1);
            setViewMonth(0);
        } else {
            setViewMonth((m) => m + 1);
        }
    }, [viewMonth]);

    // 날짜 셀 클릭 시 모달 띄우기
    const handleDayClick = (cell) => {
        // cell.entry가 있으면 그걸 모달에 띄우고,
        // 없으면 "작성된 일기가 없습니다" 메시지용 데이터 구성
        if (cell.entry) {
            setSelectedEntry(cell.entry);
        } else {
            // 보기 좋게 yyyy.mm.dd 형태로 만들어주기
            const y = cell.year;
            const m = String(cell.month + 1).padStart(2, "0");
            const d = String(cell.day).padStart(2, "0");
            setSelectedEntry({
                date: `${y}.${m}.${d}`,
                title: "",
                body: "",
                empty: true,
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedEntry(null);
    };

    //
    // ✅ 연간 작성 진척도 계산
    //
    const currentYearStr = String(viewYear); // 보고 있는 연도 기준
    const writtenDaysSet = new Set();

    entries.forEach((entry) => {
        // entry.date 예: "2025.10.25"
        const [y, m, d] = entry.date.split(".");
        if (y === currentYearStr) {
            writtenDaysSet.add(`${y}.${m}.${d}`);
        }
    });

    const writtenCountThisYear = writtenDaysSet.size; // 올해 작성한 서로 다른 날짜 수
    const totalDaysThisYear = 365; // 윤년 단순화
    const progressPercent = Math.min(
        100,
        Math.round(
            (writtenCountThisYear / totalDaysThisYear) * 100
        )
    );

    return (
        <>
            {/* 상단 네비게이션 바 */}
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "60px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 1.5rem",
                    background: "rgba(255,240,225,0.7)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 2px 10px rgba(255,190,140,0.25)",
                    zIndex: 1000,
                    colorScheme: "light",
                    fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Pretendard", "Inter", system-ui, sans-serif',
                }}
            >
                {/* 돌아가기 버튼 */}
                <button
                    style={{
                        background:
                            "linear-gradient(90deg, #ffd8b5 0%, #fff0d6 100%)",
                        border: "1px solid rgba(255,170,120,0.4)",
                        color: "#774e2e",
                        fontWeight: 600,
                        padding: "0.5rem 1rem",
                        borderRadius: "10px",
                        cursor: "pointer",
                        boxShadow: "0 4px 10px rgba(255,200,140,0.3)",
                    }}
                    onClick={() => navigate("/")}
                >
                    ← 돌아가기
                </button>

                {/* 페이지 타이틀 */}
                <div
                    style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: "#774e2e",
                        textAlign: "center",
                        flex: 1,
                        pointerEvents: "none",
                    }}
                >
                    기록 캘린더
                </div>

                {/* 오른쪽 균형 맞추기용 */}
                <div style={{ width: "88px" }} />
            </div>

            {/* 배경 + 메인 컨텐츠 (달력 + 진행도) */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    width: "100vw",
                    height: "100vh",
                    overflow: "hidden",

                    background:
                        "radial-gradient(circle at 40% 40%, #fff7f0 0%, #ffe8cc 40%, #ffd8b5 80%)",
                    backgroundColor: "#fff7f0",
                    colorScheme: "light",

                    paddingTop: "80px", // 네비게이션 아래 공간
                    paddingLeft: "2rem",
                    paddingRight: "2rem",
                    boxSizing: "border-box",
                    fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Pretendard", "Inter", system-ui, sans-serif',

                    display: "flex",
                    flexWrap: "wrap",
                    gap: "1.5rem",
                    justifyContent: "center", // ✅ 가운데로 묶어서
                    alignItems: "center",     // ✅ 수직도 가운데
                }}
            >
                {/* 왼쪽: 캘린더 카드 (기존 스타일 유지) */}
                <div
                    style={{
                        width: "90%",
                        maxWidth: "700px",
                        background:
                            "linear-gradient(145deg, #fffefb 0%, #fff7ed 40%, #fff0e0 100%)",
                        borderRadius: "24px",
                        border: "1px solid rgba(255,200,150,0.3)",
                        boxShadow:
                            "0 24px 60px rgba(255,210,150,0.45), 0 8px 20px rgba(255,170,120,0.25)",
                        padding: "2rem",
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column",

                        flex: "1 1 420px",
                        minWidth: "320px",
                    }}
                >
                    {/* 캘린더 헤더 영역: 월 이동 컨트롤 포함 */}
                    <div
                        style={{
                            textAlign: "center",
                            marginBottom: "1.5rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.5rem",
                        }}
                    >
                        {/* 이전 달 버튼 */}
                        <button
                            onClick={goPrevMonth}
                            style={{
                                background: "rgba(255,240,220,0.8)",
                                border: "1px solid rgba(200,140,80,0.2)",
                                color: "#a85f2a",
                                fontWeight: 600,
                                padding: "0.5rem 0.75rem",
                                borderRadius: "10px",
                                cursor: "pointer",
                                boxShadow:
                                    "0 2px 6px rgba(255,180,120,0.25)",
                                minWidth: "3rem",
                            }}
                        >
                            ◀
                        </button>

                        {/* 가운데 월/연도 라벨 */}
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: "0.8rem",
                                    fontWeight: 500,
                                    color: "#b97a42",
                                    marginBottom: "0.3rem",
                                }}
                            >
                                my baby diary
                            </div>
                            <div
                                style={{
                                    fontSize: "1.25rem",
                                    fontWeight: 600,
                                    color: "#a85f2a",
                                    lineHeight: 1.2,
                                }}
                            >
                                {monthLabel}
                            </div>
                        </div>

                        {/* 다음 달 버튼 */}
                        <button
                            onClick={goNextMonth}
                            style={{
                                background: "rgba(255,240,220,0.8)",
                                border: "1px solid rgba(200,140,80,0.2)",
                                color: "#a85f2a",
                                fontWeight: 600,
                                padding: "0.5rem 0.75rem",
                                borderRadius: "10px",
                                cursor: "pointer",
                                boxShadow:
                                    "0 2px 6px rgba(255,180,120,0.25)",
                                minWidth: "3rem",
                            }}
                        >
                            ▶
                        </button>
                    </div>

                    {/* 캘린더 본문 */}
                    <div
                        style={{
                            backgroundColor: "#fffaf5",
                            borderRadius: "16px",
                            border: "1px solid rgba(255,200,150,0.25)",
                            boxShadow:
                                "0 8px 20px rgba(255,180,100,0.1), inset 0 0 6px rgba(255,180,100,0.05)",
                            padding: "1rem 1rem 1.5rem",
                            boxSizing: "border-box",
                            display: "grid",
                            gridTemplateRows: "auto 1fr",
                            rowGap: "1rem",
                        }}
                    >
                        {/* 요일 헤더 */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(7, 1fr)",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "#b26824",
                                textAlign: "center",
                            }}
                        >
                            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                                <div key={d}>{d}</div>
                            ))}
                        </div>

                        {/* 날짜 그리드 */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(7, 1fr)",
                                gridAutoRows: "70px",
                                gap: "0.5rem",
                            }}
                        >
                            {calendarCells.map((cell) => {
                                const isDim = cell.type === "prev" || cell.type === "next";
                                const isToday = cell.isToday;
                                const wrote = cell.wrote;

                                // 셀 스타일 계산
                                let bgColor = "rgba(255,255,255,0.6)";
                                let borderColor = "1px solid rgba(0,0,0,0.05)";
                                let boxShadow = "0 4px 8px rgba(0,0,0,0.03)";
                                let bgHighlight =
                                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)";
                                let textColor = isDim
                                    ? "rgba(150,110,80,0.4)"
                                    : "#7a4a2a";

                                if (isToday) {
                                    bgColor = "rgba(255, 220, 180, 0.4)";
                                    borderColor =
                                        "1px solid rgba(200,120,60,0.4)";
                                    boxShadow =
                                        "0 8px 16px rgba(255,150,80,0.25)";
                                    bgHighlight =
                                        "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.8) 0%, rgba(255,230,200,0) 70%)";
                                }

                                if (wrote) {
                                    bgColor = "rgba(255, 210, 160, 0.45)";
                                    borderColor =
                                        "1px solid rgba(200,120,60,0.35)";
                                    boxShadow =
                                        "0 8px 16px rgba(255,170,100,0.25), 0 0 8px rgba(255,190,120,0.3)";
                                    bgHighlight =
                                        "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.8) 0%, rgba(255,240,210,0) 70%)";
                                    textColor = "#7a4a2a";
                                }

                                return (
                                    <button
                                        key={cell.key}
                                        onClick={() => handleDayClick(cell)}
                                        style={{
                                            appearance: "none",
                                            WebkitAppearance: "none",
                                            border: "none",
                                            padding: 0,
                                            cursor: "pointer",
                                            background: "transparent",
                                            textAlign: "right",
                                        }}
                                    >
                                        <div
                                            style={{
                                                backgroundColor: bgColor,
                                                border: borderColor,
                                                borderRadius: "12px",
                                                boxShadow: boxShadow,
                                                padding: "0.5rem",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "flex-start",
                                                alignItems: "flex-end",
                                                fontSize: "0.8rem",
                                                fontWeight: 500,
                                                color: textColor,
                                                lineHeight: 1.2,
                                                backgroundImage: bgHighlight,
                                                width: "100%",
                                                height: "100%",
                                            }}
                                        >
                                            {/* 날짜 숫자 */}
                                            <div>{cell.day}</div>

                                            {/* 작성됨 표시 */}
                                            {wrote && (
                                                <div
                                                    style={{
                                                        marginTop: "auto",
                                                        fontSize: "0.8rem",
                                                        lineHeight: 1,
                                                        fontWeight: 600,
                                                        color: "#4CAF50", // 연한 초록 체크면 이건 무시됨 (이모지는 자체 색)
                                                        background: "transparent",
                                                        boxShadow: "none",
                                                        padding: 0,
                                                    }}
                                                >
                                                    ✅
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 안내 문구 */}
                    <div
                        style={{
                            textAlign: "center",
                            marginTop: "1rem",
                            fontSize: "0.75rem",
                            lineHeight: 1.4,
                            color: "#a16632",
                            opacity: 0.7,
                        }}
                    >
                        날짜를 누르면 그 날의 육아일지를 볼 수 있어요.
                    </div>
                </div>

                {/* 오른쪽: 연간 진행도 카드 (하트 프로그래스바 버전) */}
                <div
                    style={{
                        background:
                            "linear-gradient(145deg, #fffefb 0%, #fffaf2 40%, #fff6e8 100%)",
                        borderRadius: "20px",
                        border: "1px solid rgba(255,200,150,0.4)",
                        boxShadow:
                            "0 20px 50px rgba(255,200,150,0.4), 0 6px 16px rgba(255,170,120,0.25)",
                        padding: "1.5rem",
                        boxSizing: "border-box",
                        width: "260px",
                        flex: "0 0 260px",
                        minWidth: "240px",
                        color: "#7a4a2a",
                        fontSize: "0.9rem",
                        lineHeight: 1.4,
                    }}
                >
                    {/* 타이틀 */}
                    <div
                        style={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: "#b26824",
                            marginBottom: "0.5rem",
                        }}
                    >
                        올해의 육아일지
                    </div>

                    {/* 숫자 / 퍼센트 */}
                    <div
                        style={{
                            fontSize: "1.25rem",
                            fontWeight: 600,
                            color: "#7a4a2a",
                            lineHeight: 1.2,
                        }}
                    >
                        {writtenCountThisYear}일
                        <span
                            style={{
                                fontSize: "0.8rem",
                                fontWeight: 500,
                                color: "#a16632",
                                marginLeft: "0.5rem",
                            }}
                        >
                            ({progressPercent}%)
                        </span>
                    </div>

                    {/* 💖 하트 프로그래스 바 */}
                    <div
                        style={{
                            width: "100%",
                            position: "relative",
                            marginBottom: "1rem",
                            marginTop: "1.5rem",
                            paddingTop: "20px",
                            paddingBottom: "10px",
                        }}
                    >
                        {/* 전체 트랙 */}
                        <div
                            style={{
                                width: "100%",
                                height: "16px",
                                borderRadius: "999px",
                                backgroundColor: "rgba(0,0,0,0.05)",
                                boxShadow:
                                    "inset 0 2px 4px rgba(0,0,0,0.06), 0 2px 6px rgba(255,200,150,0.35)",
                                border: "1px solid rgba(0,0,0,0.03)",
                                overflow: "hidden",
                            }}
                        >
                            {/* 채워진 부분 */}
                            <div
                                style={{
                                    width: `${progressPercent}%`,
                                    height: "100%",
                                    borderRadius: "999px",
                                    background:
                                        "linear-gradient(90deg, rgb(255,183,158) 0%, rgb(255,80,80) 100%)",
                                    boxShadow:
                                        "0 6px 12px rgba(255,120,80,0.4), 0 0 8px rgba(255,160,120,0.6)",
                                    transition: "width 0.3s ease",
                                }}
                            />
                        </div>

                        {/* 하트 마커 */}
                        <div
                            style={{
                                position: "absolute",
                                left: `calc(${progressPercent}% - 20px)`, // 진행률 위치
                                top: "12px",
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                backgroundColor: "#fff",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                boxShadow:
                                    "0 10px 20px rgba(0,0,0,0.08), 0 4px 8px rgba(255,160,120,0.4)",
                                border: "1px solid rgba(0,0,0,0.03)",
                                transition: "left 0.3s ease",
                            }}
                        >
                            {/* 하트 아이콘 */}
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                style={{ display: "block" }}
                            >
                                <defs>
                                    <linearGradient
                                        id="heartGradient"
                                        x1="0%"
                                        y1="0%"
                                        x2="100%"
                                        y2="100%"
                                    >
                                        <stop offset="0%" stopColor="rgb(255,120,90)" />
                                        <stop offset="100%" stopColor="rgb(255,60,90)" />
                                    </linearGradient>
                                </defs>
                                <path
                                    fill="url(#heartGradient)"
                                    d="M12 21s-1.45-1.32-2.9-2.64C6.2 15.77 4 13.74 4 10.9 4 8.5 5.8 7 7.7 7c1.2 0 2.3.6 3 1.6.7-1 1.8-1.6 3-1.6C15.9 7 18 8.5 18 10.9c0 2.84-2.2 4.87-5.1 7.46C13.45 19.68 12 21 12 21z"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* 응원 메시지 */}
                    <div
                        style={{
                            fontSize: "0.7rem",
                            lineHeight: 1.4,
                            color: "#b26824",
                            opacity: 0.8,
                            whiteSpace: "pre-line",
                        }}
                    >
                        조금씩 채워지는 중이에요.
                        {"\n"}
                        오늘도 한 칸 더 채워볼까요? ✍️
                    </div>
                </div>
            </div>

            {/* 📌 모달 (선택한 날짜의 일기 보기) */}
            {isModalOpen && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.25)",
                        backdropFilter: "blur(2px)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "2rem",
                        zIndex: 2000,
                    }}
                    onClick={closeModal} // 바깥 클릭하면 닫힘
                >
                    {/* 안쪽 카드 */}
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "400px",
                            background:
                                "linear-gradient(145deg, #fffefb 0%, #fff7ed 40%, #fff0e0 100%)",
                            borderRadius: "20px",
                            boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
                            border: "1px solid rgba(255,200,150,0.4)",
                            padding: "1.5rem",
                            boxSizing: "border-box",
                            fontFamily:
                                '-apple-system, BlinkMacSystemFont, "Pretendard", "Inter", system-ui, sans-serif',
                            color: "#5b3c1e",
                            position: "relative",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 닫기 버튼 */}
                        <button
                            onClick={closeModal}
                            style={{
                                position: "absolute",
                                top: "0.75rem",
                                right: "0.75rem",
                                background: "rgba(255,255,255,0.7)",
                                border: "1px solid rgba(0,0,0,0.05)",
                                borderRadius: "8px",
                                padding: "0.4rem 0.6rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "#7a4a2a",
                                cursor: "pointer",
                                boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                            }}
                        >
                            닫기
                        </button>

                        {/* 날짜 */}
                        <div
                            style={{
                                fontSize: "0.8rem",
                                fontWeight: 500,
                                color: "#b26824",
                                marginBottom: "0.25rem",
                                paddingRight: "3rem",
                            }}
                        >
                            {selectedEntry?.date}
                        </div>

                        {/* 제목 */}
                        <div
                            style={{
                                fontSize: "1rem",
                                fontWeight: 600,
                                color: "#7a4a2a",
                                lineHeight: 1.4,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                marginBottom: "0.75rem",
                            }}
                        >
                            {selectedEntry?.empty
                                ? "이 날의 일기가 아직 없어요"
                                : selectedEntry?.title || "(제목 없음)"}
                        </div>

                        {/* 본문 */}
                        {!selectedEntry?.empty && (
                            <div
                                style={{
                                    fontSize: "0.9rem",
                                    lineHeight: 1.6,
                                    color: "#5b3c1e",
                                    backgroundColor: "rgba(255,255,255,0.6)",
                                    border: "1px solid rgba(0,0,0,0.03)",
                                    borderRadius: "12px",
                                    padding: "1rem",
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    boxShadow:
                                        "inset 0 0 6px rgba(255,180,100,0.1)",
                                }}
                            >
                                {selectedEntry?.body || "내용 없음"}
                            </div>
                        )}

                        {/* 일기 없는 날일 경우 안내 */}
                        {selectedEntry?.empty && (
                            <div
                                style={{
                                    fontSize: "0.8rem",
                                    color: "#a16632",
                                    opacity: 0.8,
                                    lineHeight: 1.5,
                                }}
                            >
                                이 날의 기록은 아직 없어요.
                                일기장 화면에서 저장하면 여기 표시돼요 🧡
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
