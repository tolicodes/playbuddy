
import React from 'react';
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from './config';
import * as amplitude from '@amplitude/analytics-browser';

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
  const handleClose = () => {
    amplitude.logEvent('store_modal_closed');
    setShowModal(false);
  }

  useEffect(() => {
    amplitude.logEvent('store_modal_shown', { platform });
  }, [platform])

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
        <Title>Download The App</Title>

        <StoreButton
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => amplitude.logEvent('app_store_clicked_ios')}
        >
          <img
            src={
              "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&releaseDate=1311120000&h=5b3127492d87ec2af62ff4d2a7492b70"
            }
            alt="Download on the App Store"
            width="150"
          />
        </StoreButton>
        <p>
          <StoreButton
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => amplitude.logEvent('app_store_clicked_android')}
          >
            <img
              style={{ transform: 'scale(1.3)' }}
              src={
                "https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
              }
              alt="Download on Google Play"
              width="150"
            />
          </StoreButton>
        </p>

      </ModalContent>
    </ModalOverlay>
  );
};

export default StoreModal;
