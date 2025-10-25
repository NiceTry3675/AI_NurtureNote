import React from "react";
import styled from "styled-components";
import NavigationMenu from "./NavigationMenu";

// ----------------------------------------------------
// 레이아웃 컴포넌트
// ----------------------------------------------------
const PageWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
`;

const ContentWrapper = styled.div`
  width: min(1400px, 95vw);
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

// ----------------------------------------------------
// 상단: 피아제 발달 단계 섹션
// ----------------------------------------------------
const DevelopmentSection = styled.div`
  width: 100%;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 18px;
  padding: 24px 20px;
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.35);
  border: 2px solid rgba(212, 165, 116, 0.4);
`;

const SectionTitle = styled.h2`
  margin: 0 0 20px;
  font-size: 1.6em;
  color: #3a2e1f;
  text-align: center;
`;

const ImageContainer = styled.div`
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  min-height: 180px;
`;

const ProcessImage = styled.img`
  width: 90%;
  max-width: 90%;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
`;

const PositionMarker = styled.div`
  position: absolute;
  left: 20%;
  top: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% {
      transform: translateY(0);
      opacity: 1;
    }
    50% {
      transform: translateY(-8px);
      opacity: 0.8;
    }
  }
`;

const MarkerArrow = styled.div`
  width: 0;
  height: 0;
  border-left: 18px solid transparent;
  border-right: 18px solid transparent;
  border-top: 24px solid #e77f67;
  filter: drop-shadow(0 3px 8px rgba(231, 127, 103, 0.5));
`;

const MarkerLabel = styled.div`
  background: linear-gradient(135deg, #f7a072, #e77f67);
  color: white;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 1.1em;
  font-weight: 600;
  margin-bottom: 6px;
  box-shadow: 0 4px 12px rgba(231, 127, 103, 0.4);
`;

const StagesRow = styled.div`
  width: 90%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const StageLabel = styled.div`
  flex: 1;
  text-align: center;
  padding: 16px 12px;
  background: rgba(212, 165, 116, 0.1);
  border-radius: 8px;
  color: #3a2e1f;
  font-weight: 600;
  border: 1px solid rgba(212, 165, 116, 0.3);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(212, 165, 116, 0.2);
    transform: translateY(-2px);
  }
`;

const StageTitle = styled.div`
  font-size: 1.15em;
  margin-bottom: 6px;
`;

const StageAge = styled.div`
  font-size: 0.95em;
  color: #5b4a3c;
  font-weight: 400;
`;

// ----------------------------------------------------
// 하단: 좌우 분할 섹션
// ----------------------------------------------------
const BottomSection = styled.div`
  width: 100%;
  display: flex;
  gap: 24px;

  @media (max-width: 1024px) {
    flex-direction: column;
  }
`;

const ReassuranceCard = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 18px;
  padding: 28px 32px;
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.35);
  border: 2px solid rgba(212, 165, 116, 0.4);
  border-left: 6px solid #8bc34a;
`;

const RecommendCard = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 18px;
  padding: 28px 32px;
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.35);
  border: 2px solid rgba(212, 165, 116, 0.4);
  border-left: 6px solid #42a5f5;
`;

const ReportCard = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 18px;
  padding: 28px 32px;
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.35);
  border: 2px solid rgba(212, 165, 116, 0.4);
  border-left: 6px solid #f7a072;
`;

const AdviceCard = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 18px;
  padding: 28px 32px;
  box-shadow: 0 25px 45px rgba(0, 0, 0, 0.35);
  border: 2px solid rgba(212, 165, 116, 0.4);
  border-left: 6px solid #e77f67;
`;

const CardTitle = styled.h3`
  margin: 0 0 18px;
  font-size: 1.4em;
  color: #3a2e1f;
  font-weight: 600;
`;

const CardContent = styled.div`
  color: #3d3225;
  line-height: 1.8;
  font-size: 1.02em;
`;

const ContentBlock = styled.div`
  margin-bottom: 16px;
`;

const BlockTitle = styled.h4`
  margin: 0 0 8px;
  color: #5b4a3c;
  font-size: 1.05em;
  font-weight: 600;
`;

const BlockText = styled.p`
  margin: 0;
  color: #4a3f35;
  line-height: 1.7;
`;

const BulletList = styled.ul`
  margin: 8px 0;
  padding-left: 24px;
  color: #4a3f35;
`;

const BulletItem = styled.li`
  margin-bottom: 6px;
  line-height: 1.6;
`;

// ----------------------------------------------------
// 메인 컴포넌트
// ----------------------------------------------------
const WeeklyDashboard = ({ onNavigate = () => {} }) => {
  return (
    <>
      <NavigationMenu onNavigate={onNavigate} />
      <PageWrapper>
        <ContentWrapper>
          {/* 상단: 피아제 발달 단계 */}
          <DevelopmentSection>
            <SectionTitle>아이의 인지 발달 단계</SectionTitle>
            <ImageContainer>
              <PositionMarker>
                <MarkerLabel>현재 위치</MarkerLabel>
                <MarkerArrow />
              </PositionMarker>
              <ProcessImage src="/baby_process.png" alt="피아제 인지발달 4단계" />

              <StagesRow>
                <StageLabel>
                  <StageTitle>감각운동기</StageTitle>
                  <StageAge>0-2세</StageAge>
                </StageLabel>
                <StageLabel>
                  <StageTitle>전조작기</StageTitle>
                  <StageAge>2-7세</StageAge>
                </StageLabel>
                <StageLabel>
                  <StageTitle>구체적 조작기</StageTitle>
                  <StageAge>7-11세</StageAge>
                </StageLabel>
                <StageLabel>
                  <StageTitle>형식적 조작기</StageTitle>
                  <StageAge>11세 이상</StageAge>
                </StageLabel>
              </StagesRow>
            </ImageContainer>
          </DevelopmentSection>

          {/* 첫 번째 하단: 안심 메시지 & 추천 활동 */}
          <BottomSection>
            {/* 좌하단: 안심하셔도 좋아요 */}
            <ReassuranceCard>
              <CardTitle>💚 안심하셔도 좋아요</CardTitle>
              <CardContent>
                <ContentBlock>
                  <BlockTitle>정상적인 발달 행동</BlockTitle>
                  <BulletList>
                    <BulletItem>
                      <strong>낯가림 시작</strong>: 생후 6-8개월에 낯선 사람을 경계하는 것은 정상적인 발달 과정입니다. 이는 아이가 주 양육자와 다른 사람을 구별할 수 있게 되었다는 긍정적인 신호예요.
                    </BulletItem>
                    <BulletItem>
                      <strong>입으로 물건 탐색</strong>: 손에 잡히는 모든 것을 입으로 가져가는 행동은 이 시기의 정상적인 탐색 방법입니다. 감각운동기 아기들은 입으로 사물을 탐색하며 세상을 배워갑니다.
                    </BulletItem>
                    <BulletItem>
                      <strong>반복적인 소리 내기</strong>: "바바바", "다다다" 같은 반복 소리는 언어 발달의 중요한 단계입니다. 옹알이를 통해 발성 기관을 발달시키고 있어요.
                    </BulletItem>
                    <BulletItem>
                      <strong>물건 떨어뜨리기</strong>: 의도적으로 물건을 계속 떨어뜨리는 것은 중력과 인과관계를 학습하는 과정입니다. 놀이가 아니라 학습이에요!
                    </BulletItem>
                  </BulletList>
                </ContentBlock>

                <ContentBlock>
                  <BlockText style={{ marginTop: '12px', fontStyle: 'italic', color: '#5b4a3c' }}>
                    이러한 행동들은 모두 감각운동기의 정상적인 발달 과정입니다.
                    아이가 건강하게 성장하고 있다는 증거이니 안심하세요. 😊
                  </BlockText>
                </ContentBlock>
              </CardContent>
            </ReassuranceCard>

            {/* 우하단: 해주면 좋을 것들 */}
            <RecommendCard>
              <CardTitle>✨ 지금 해주면 좋을 활동</CardTitle>
              <CardContent>
                <ContentBlock>
                  <BlockTitle>감각운동기 발달을 위한 활동</BlockTitle>
                  <BulletList>
                    <BulletItem>
                      <strong>까꿍 놀이</strong>: 손이나 천으로 얼굴을 가렸다가 나타나며 "까꿍!" 하세요. 대상영속성(보이지 않아도 존재한다는 개념)을 발달시켜요.
                    </BulletItem>
                    <BulletItem>
                      <strong>다양한 질감 탐색</strong>: 부드러운 천, 거친 수건, 울퉁불퉁한 공 등 다양한 질감의 안전한 물건을 만지고 탐색하게 해주세요.
                    </BulletItem>
                    <BulletItem>
                      <strong>소리 따라하기</strong>: 아기가 내는 옹알이 소리를 그대로 따라해주세요. 대화의 기초를 배우고 언어 발달이 촉진됩니다.
                    </BulletItem>
                    <BulletItem>
                      <strong>물건 주고받기</strong>: 안전한 물건을 주고받으며 손의 협응력과 사회성을 발달시켜요.
                    </BulletItem>
                    <BulletItem>
                      <strong>거울 놀이</strong>: 거울 앞에서 함께 놀며 자아 인식의 기초를 만들어요. "이게 누구지?" 하며 함께 웃어보세요.
                    </BulletItem>
                  </BulletList>
                </ContentBlock>

                <ContentBlock>
                  <BlockText style={{ marginTop: '12px', fontStyle: 'italic', color: '#5b4a3c' }}>
                    하루 10-15분씩이라도 아이와 함께 이러한 활동을 해주시면
                    두뇌 발달과 정서적 안정에 큰 도움이 됩니다. 💙
                  </BlockText>
                </ContentBlock>
              </CardContent>
            </RecommendCard>
          </BottomSection>

          {/* 두 번째 하단: 성장 기록 & 육아 조언 */}
          <BottomSection>
            {/* 좌하단: 주간 보고서 */}
            <ReportCard>
              <CardTitle>이번 주 성장 기록</CardTitle>
              <CardContent>
                <ContentBlock>
                  <BlockTitle>📊 주요 발달 사항</BlockTitle>
                  <BulletList>
                    <BulletItem>
                      손으로 물건을 잡고 입으로 가져가는 행동이 더욱 정교해졌어요
                    </BulletItem>
                    <BulletItem>
                      낯선 사람과 익숙한 사람을 구별하기 시작했어요
                    </BulletItem>
                    <BulletItem>
                      "마마", "다다" 같은 반복 소리를 내기 시작했어요
                    </BulletItem>
                  </BulletList>
                </ContentBlock>

                <ContentBlock>
                  <BlockTitle>😴 수면 패턴</BlockTitle>
                  <BlockText>
                    평균 수면 시간: 하루 13-14시간 (야간 10시간, 낮잠 3-4시간)
                    <br />
                    낮잠은 오전/오후 2회로 안정화되고 있어요.
                  </BlockText>
                </ContentBlock>

                <ContentBlock>
                  <BlockTitle>🍼 식사 기록</BlockTitle>
                  <BlockText>
                    모유/분유 수유: 하루 4-5회<br />
                    이유식: 하루 2회 (아침, 저녁)
                    <br />
                    당근, 단호박, 바나나를 특히 좋아해요!
                  </BlockText>
                </ContentBlock>
              </CardContent>
            </ReportCard>

            {/* 우하단: AI 조언 */}
            <AdviceCard>
              <CardTitle>이번 주 육아 조언</CardTitle>
              <CardContent>
                <ContentBlock>
                  <BlockTitle>💡 부모님께 드리는 팁</BlockTitle>
                  <BlockText>
                    이 시기 아기는 주 양육자와의 애착이 강화되는 시기예요.
                    낯가림이 시작될 수 있지만 이는 정상적인 발달 과정이니
                    걱정하지 마세요. 일관된 반응과 따뜻한 스킨십으로
                    안정적인 애착을 형성해주세요.
                  </BlockText>
                </ContentBlock>

                <ContentBlock>
                  <BlockTitle>⚠️ 주의사항</BlockTitle>
                  <BlockText>
                    아기가 뒤집기를 시작하면서 높은 곳에서 떨어질 위험이 있어요.
                    기저귀를 갈거나 잠시라도 자리를 비울 때는 반드시 안전한
                    공간에 두세요. 작은 물건은 손이 닿지 않는 곳에 보관해주세요.
                  </BlockText>
                </ContentBlock>

                <ContentBlock>
                  <BlockTitle>🌱 다음 주 목표</BlockTitle>
                  <BulletList>
                    <BulletItem>
                      하루 1회 이상 까꿍 놀이로 상호작용 시간 갖기
                    </BulletItem>
                    <BulletItem>
                      다양한 질감의 물건 3가지 이상 탐색하게 하기
                    </BulletItem>
                    <BulletItem>
                      아기의 옹알이에 반응하며 대화 나누기
                    </BulletItem>
                  </BulletList>
                </ContentBlock>
              </CardContent>
            </AdviceCard>
          </BottomSection>
        </ContentWrapper>
      </PageWrapper>
    </>
  );
};

export default WeeklyDashboard;
