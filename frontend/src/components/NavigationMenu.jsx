import React, { useState } from "react";
import styled from "styled-components";

// ----------------------------------------------------
// 햄버거 메뉴 + 사이드바 스타일
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
// 메인 컴포넌트
// ----------------------------------------------------
const NavigationMenu = ({ onNavigate = () => {} }) => {
  const [open, setOpen] = useState(false);

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
            <SidebarItem
              onClick={() => {
                onNavigate("compose");
                setOpen(false);
              }}
            >
              새 일기 작성
            </SidebarItem>
            <SidebarItem
              onClick={() => {
                onNavigate("calendar");
                setOpen(false);
              }}
            >
              캘린더 보기
            </SidebarItem>
          </SidebarList>
        </div>
        <FooterText>© 2025 DrawMind</FooterText>
      </Sidebar>
    </>
  );
};

export default NavigationMenu;
