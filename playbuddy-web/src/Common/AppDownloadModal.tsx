
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from './config';
const KinkEventsMessage = () => <p><strong>Kinky Events:</strong> Some extra kinky events aren’t available in the app store. You can view them on the website while we work to resolve this.</p>;

// Styled components for Modal
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
  width: 100%;
  position: relative;
`;

const Title = styled.h2`
  margin: 0;
  padding-bottom: 10px;
  font-size: 24px;
`;

const Description = styled.p`
  font-size: 16px;
  margin-bottom: 20px;
`;

const ButtonsContainer = styled.div`
  display: flex;
  justify-content: space-around;
`;

const StoreButton = styled.a`
  display: inline-block;
  cursor: pointer;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
`;

// Main Component
const StoreModal = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [platform, setPlatform] = useState('');
  const [showModal, setShowModal] = useState(true);

  // Detect platform (iOS, Android)
  const detectMobilePlatform = () => {
    const userAgent = window.navigator.userAgent || window.navigator.vendor;

    if (/android/i.test(userAgent)) {
      setPlatform('android');
      return true;
    }

    if (/iPad|iPhone|iPod/.test(userAgent)) {
      setPlatform('ios');
      return true;
    }

    return false;
  };

  // Close modal
  const handleClose = () => setShowModal(false);

  useEffect(() => {
    if (detectMobilePlatform()) {
      setIsMobile(true);
    }
  }, []);

  if (!isMobile || !showModal) return null;

  return (
    <ModalOverlay>
      <ModalContent>
        <CloseButton onClick={handleClose}>&times;</CloseButton>
        <Title>Get a Better Experience</Title>
        <Description>
          You can get a much better experience by downloading the {platform === 'ios' ? 'iOS' : 'Android'} app.
        </Description>

        {platform === 'ios' ? (
          <>
            <p>
              The app is currently in beta, meaning you'll have to install it via the TestFlight app. Follow this link
              to download TestFlight and follow the instructions.
            </p>
            <KinkEventsMessage />
            <ButtonsContainer>
              <StoreButton
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&releaseDate=1311120000&h=5b3127492d87ec2af62ff4d2a7492b70"
                  alt="Download on the App Store"
                  width="150"
                />
              </StoreButton>
            </ButtonsContainer>
          </>
        ) : (
          <>
            <p>
              The app is currently in beta, meaning I have to <strong>add you to the super special invite-only list</strong>. Email me
              at <a href="mailto:toli@toli.me">toli@toli.me</a> and I will set you right up!
            </p>
            <p>
              Once you're on the list click the link below to download the app.
            </p>
            <KinkEventsMessage />
            <ButtonsContainer>
              <StoreButton
                href={GOOGLE_PLAY_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                  alt="Get it on Google Play"
                  width="150"
                />
              </StoreButton>
            </ButtonsContainer>
          </>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default StoreModal;
