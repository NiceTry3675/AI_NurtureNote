// SidebarMenu.js

import React from 'react';
import styled from 'styled-components';

// 1. styled-component가 'open' prop을 받도록 수정합니다.
const SidebarContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  /* 'open' prop에 따라 너비 조절 */
  width: ${(props) => (props.open ? "240px" : "0")};
  height: 100vh;
  background: linear-gradient(to bottom, #2a2a72, #009ffd);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  /* 'open' prop에 따라 패딩 조절 */
  padding: ${(props) => (props.open ? "30px 20px" : "30px 0")};
  overflow: hidden;
  transition: width 0.4s ease;
  box-shadow: ${(props) => (props.open ? "4px 0 10px rgba(0,0,0,0.3)" : "none")};
  z-index: 15;
  box-sizing: border-box; /* 패딩이 너비에 포함되도록 */
`;

const MenuList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  /* 'open' prop에 따라 투명도 조절 */
  opacity: ${(props) => (props.open ? 1 : 0)};
  transition: opacity 0.2s ease 0.1s;
`;

const MenuItem = styled.li`
  font-size: 1.2em;
  font-family: 'IsYun', sans-serif;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap; /* 닫힐 때 텍스트 줄바꿈 방지 */

  &:hover {
    color: #ffde8a;
    transform: translateX(5px);
  }
`;

const Footer = styled.div`
  font-size: 0.85em;
  text-align: center;
  white-space: nowrap; /* 닫힐 때 텍스트 줄바꿈 방지 */
  /* 'open' prop에 따라 투명도 조절 */
  opacity: ${(props) => (props.open ? 0.7 : 0)};
  transition: opacity 0.2s ease 0.1s;
`;

// 2. 컴포넌트가 (open, onMouseEnter, onMouseLeave) props를 받도록 수정
const SidebarMenu = ({ open, onMouseEnter, onMouseLeave }) => {
  return (
    <SidebarContainer
      open={open}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div>
        <h2 style={{ 
          fontSize: '1.5em', 
          marginBottom: '30px', 
          opacity: open ? 1 : 0, 
          transition: 'opacity 0.2s ease 0.1s',
          whiteSpace: 'nowrap'
        }}>
          📘 메뉴
        </h2>
        {/* 3. 이전 단계에서 수정한 메뉴 리스트 반영 */}
        <MenuList open={open}>
          <MenuItem>나의 기록 관리</MenuItem>
          <MenuItem>주간 분석 리포트</MenuItem>
          <MenuItem>프로모션 구독</MenuItem>
        </MenuList>
      </div>
      <Footer open={open}>© 2025 DrawMind</Footer>
    </SidebarContainer>
  );
};

export default SidebarMenu;