import React from 'react';
import styled from 'styled-components';

const Sidebar = styled.div`
  width: 240px;
  height: 100vh;
  background: linear-gradient(to bottom, #2a2a72, #009ffd);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 50px 20px 30px; /* 🔹 상단 여백 30→50으로 살짝 내려줌 */
  position: fixed;
  left: 0;
  top: 20px; /* 🔹 전체 사이드바를 화면 아래로 20px 내림 */
  border-radius: 12px; /* 🔹 위쪽 둥글게 만들어 자연스러운 느낌 */
  box-shadow: 4px 0 10px rgba(0, 0, 0, 0.25);
`;

const MenuList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const MenuItem = styled.li`
  font-size: 1.2em;
  font-family: 'IsYun', sans-serif;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    color: #ffde8a;
    transform: translateX(5px);
  }
`;

const Footer = styled.div`
  font-size: 0.85em;
  opacity: 0.7;
  text-align: center;
  margin-top: 40px; /* 🔹 하단 간격 확보 */
`;

const SidebarMenu = () => {
  return (
    <Sidebar>
      <div>
        <h2 style={{ fontSize: '1.5em', marginBottom: '30px' }}>📘 메뉴</h2>
        <MenuList>
          <MenuItem>🧷 나의 기록 관리</MenuItem>
          <MenuItem>💌 프로모션 구독</MenuItem>
          <MenuItem>📊 통계 보기</MenuItem>
          <MenuItem>⚙️ 설정</MenuItem>
        </MenuList>
      </div>
      <Footer>© 2025 DrawMind</Footer>
    </Sidebar>
  );
};

export default SidebarMenu;
