import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompass, faHeart, faHandshake, faUserFriends, faGlobeAmericas, faFeather, faComments, faMask, faExclamationTriangle, faSpa, faBolt, faHandcuffs, faDragon, faShieldAlt, faLink, faLaughBeam, faEye, faFire, faStreetView, faHourglassHalf, faQuestionCircle, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { styled } from '@mui/system';


export const categoryIcons: Record<string, IconDefinition> = {
  "Exploration": faCompass,
  "Intimacy": faHeart,
  "Consent": faHandshake,
  "Trust": faUserFriends,
  "Adventure": faGlobeAmericas,
  "Sensation Play": faFeather,
  "Communication": faComments,
  "Role Play": faMask,
  "Risk": faExclamationTriangle,
  "Sensual": faSpa,
  "Thrill": faBolt,
  "BDSM": faHandcuffs,
  "Fantasy": faDragon,
  "Safety": faShieldAlt,
  "Connection": faLink,
  "Playfulness": faLaughBeam,
  "Exhibitionism": faEye,
  "Intensity": faFire,
  "Public": faStreetView,
  "Anticipation": faHourglassHalf
};

const StyledFontAwesomeIcon = styled(FontAwesomeIcon)({
  fontSize: '48px',
  marginBottom: '16px'
})

const CategoryIcon = ({ category }: { category: keyof typeof categoryIcons }) => {
  const defaultIcon = faQuestionCircle;
  const categoryIcon = categoryIcons[category] as IconDefinition;

  return <StyledFontAwesomeIcon icon={categoryIcon || defaultIcon}  />
};

export default CategoryIcon;
