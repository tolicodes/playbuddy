import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaintBrush,
  faCompass,
  faHeart,
  faHandshake,
  faUserFriends,
  faGlobeAmericas,
  faFeather,
  faComments,
  faMask,
  faExclamationTriangle,
  faSpa,
  faBolt,
  faHandcuffs,
  faDragon,
  faShieldAlt,
  faLink,
  faLaughBeam,
  faEye,
  faFire,
  faStreetView,
  faHourglassHalf,
  faQuestionCircle,
  IconDefinition,
  faBandAid,
  faCampground,
  faChalkboardTeacher,
  faEyeSlash,
  faGamepad,
  faGifts,
  faHandHoldingHeart,
  faHeartbeat,
  faLockOpen,
  faPalette,
  faRunning,
  faSitemap,
  faStar,
  faTree,
  faUserNinja,
  faUserSecret,
  faUsers,
  faBlind,
  faHandSparkles,
  faHandsHelping,
  faLightbulb,
  faPuzzlePiece,
  faSeedling,
  faSwimmer,
  faTheaterMasks,
  faTrophy,
  faCompressArrowsAlt,
  faFeatherAlt,
  faGift,
  faHourglassEnd,
  faMicrophone,
  faPeopleArrows,
  faSkullCrossbones,
  faSmileBeam,
  faTransgender,
  faUnlockAlt,
  faAnchor,
  faArrowRight,
  faBalanceScale,
  faBan,
  faBath,
  faBed,
  faBeer,
  faBookOpen,
  faBrain,
  faBriefcase,
  faBriefcaseMedical,
  faCamera,
  faCameraRetro,
  faChessQueen,
  faClipboardList,
  faCloud,
  faCloudMoon,
  faCloudSun,
  faCommentDots,
  faCouch,
  faCut,
  faDeaf,
  faDice,
  faDigitalTachograph,
  faDizzy,
  faDog,
  faDoorClosed,
  faDove,
  faExchangeAlt,
  faExclamationCircle,
  faExpandArrowsAlt,
  faEyeDropper,
  faGem,
  faGhost,
  faGlobe,
  faGrinWink,
  faHandPeace,
  faHandRock,
  faHands,
  faHatWizard,
  faHome,
  faImages,
  faInfinity,
  faJournalWhills,
  faLaptopCode,
  faLaugh,
  faLeaf,
  faMagic,
  faMapSigns,
  faMemory,
  faMicrochip,
  faMountain,
  faMusic,
  faObjectGroup,
  faOm,
  faParachuteBox,
  faPaw,
  faPlane,
  faPlaneDeparture,
  faPlay,
  faPlug,
  faPray,
  faQuestion,
  faRedo,
  faRing,
  faRobot,
  faRuler,
  faRulerCombined,
  faSadCry,
  faSatelliteDish,
  faScroll,
  faSearch,
  faSearchPlus,
  faShareAlt,
  faSignal,
  faSmile,
  faSoap,
  faThermometerFull,
  faThermometerHalf,
  faThumbsDown,
  faThumbsUp,
  faTint,
  faToolbox,
  faTshirt,
  faUserCircle,
  faUserLock,
  faUserTie,
  faUsersSlash,
  faUtensils,
  faVenusMars,
  faVial,
  faVideo,
  faVolumeUp,
  faWalking,
  faWater,
  faWaveSquare,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';
import { styled } from '@mui/system';

export const categoryIcons: Record<string, IconDefinition> = {
  Exploration: faCompass,
  Intimacy: faHeart,
  Consent: faHandshake,
  Trust: faUserFriends,
  Adventure: faGlobeAmericas,
  'Sensation Play': faFeather,
  Communication: faComments,
  'Role Play': faMask,
  Risk: faExclamationTriangle,
  Sensual: faSpa,
  Thrill: faBolt,
  BDSM: faHandcuffs,
  Fantasy: faDragon,
  Safety: faShieldAlt,
  Connection: faLink,
  Playfulness: faLaughBeam,
  Exhibitionism: faEye,
  Intensity: faFire,
  Public: faStreetView,
  Anticipation: faHourglassHalf,
  Oral: faStar, // Example, choose an appropriate icon
  'Group Sex': faUserFriends, // Example, you might want to use a different icon
  'Creative Expression': faPaintBrush, // Assuming you import faPaintBrush for creativity
  'Sensory Exploration': faEyeSlash,
  Camp: faCampground,
  Comfort: faHeartbeat,
  Creativity: faPalette,
  Game: faGamepad,
  Outdoor: faTree,
  'Physical Play': faRunning,
  Polyamory: faUsers,
  Control: faLockOpen,
  Learning: faChalkboardTeacher,
  Primal: faHandHoldingHeart,
  'Role-Play': faMask,
  Roleplay: faUserSecret, // Similar to "Role Play", you might want to consolidate
  'Sensory Play': faSitemap,
  Bonding: faHandHoldingHeart,
  Cuckhold: faGifts,
  Emotional: faHeartbeat,
  'Pain Play': faBandAid, // Assuming you import faBandAid
  Stealth: faUserNinja, // Assuming you import faUserNinja
  Toys: faPuzzlePiece,
  Voyeurism: faEye,
  'Water Play': faSwimmer,
  Audience: faUsers,
  'Body Positivity': faHeart,
  Competition: faTrophy, // Assuming you import faTrophy
  DP: faUserFriends, // Symbolic for multiple partners
  'Emotional Connection': faHeartbeat, // Assuming you import faHeartbeat
  Excitement: faFire,
  Freedom: faSeedling, // Represents growth and freedom
  'Group Play': faUsers,
  Nature: faSeedling,
  Performance: faTheaterMasks,
  Pleasure: faHeart,
  Relaxation: faSpa, // Assuming you import faSpa
  Romantic: faHeart,
  Sensation: faHandSparkles, // Assuming you import faHandSparkles
  'Sensory Deprivation': faBlind, // Assuming you import faBlind
  Spontaneity: faBolt,
  Stimulation: faLightbulb,
  Affection: faHandHoldingHeart,
  'Age Gap': faHourglassEnd, // Assuming you import faHourglassEnd
  Arousal: faHeartbeat, // Assuming you import faHeartbeat again for symbolic reuse
  Artistic: faPaintBrush,
  Bondage: faUnlockAlt,
  Care: faHandHoldingHeart, // Reuse for symbolic representation
  Casual: faSmileBeam,
  Caution: faExclamationTriangle, // Assuming you import faExclamationTriangle
  Challenge: faUserNinja,
  'Confined Space': faCompressArrowsAlt, // Assuming you import faCompressArrowsAlt
  Danger: faSkullCrossbones, // Assuming you import faSkullCrossbones
  Desire: faHeart,
  Discretion: faUserSecret,
  Expression: faMicrophone, // Assuming you import faMicrophone for vocal expression
  Foreplay: faFeatherAlt, // Assuming you import faFeatherAlt
  'Gender Diversity': faTransgender, // Assuming you import faTransgender
  Group: faUsers,
  'Group Activity': faPeopleArrows,
  Imagination: faLightbulb,
  Lighthearted: faLaughBeam,
  Novelty: faGift, // Assuming you import faGift
  'Physical Activity': faWalking,
  'Play Parties': faMask,
  'Playful Competition': faDice,
  'Power Dynamics': faBolt,
  Remote: faSatelliteDish, // Assuming you import faSatelliteDish
  Respect: faHandPeace, // Assuming you import faHandPeace
  Romance: faHeart,
  Size: faRulerCombined, // Assuming you import faRulerCombined
  Spiritual: faOm, // Assuming you import faOm
  Tease: faGrinWink, // Assuming you import faGrinWink
  'Temperature Play': faThermometerHalf, // Assuming you import faThermometerHalf
  Therapy: faBrain, // Assuming you import faBrain
  'Trust Building': faHandsHelping, // Assuming you import faHandsHelping
  'Trust Dynamics': faBalanceScale, // Assuming you import faBalanceScale
  'Verbal Play': faComments,
  Visualization: faImages, // Assuming you import faImages
  Aesthetic: faEyeDropper, // Assuming you import faEyeDropper
  'Aesthetic Appreciation': faPalette, // Assuming you import faPalette
  Aftercare: faBandAid, // Assuming you import faBandAid
  'Anal Play': faPlug, // Assuming you import faPlug
  'Ancient Wisdom': faScroll, // Assuming you import faScroll
  Atmosphere: faCloudSun, // Assuming you import faCloudSun
  Beginning: faPlay, // Assuming you import faPlay
  Blindfolded: faBlind, // Assuming you import faBlind
  'Body Art': faPaintBrush,
  'Body Awareness': faUserNinja,
  'Body Modification': faCut, // Assuming you import faCut
  'Boundary Exploration': faExpandArrowsAlt, // Assuming you import faExpandArrowsAlt
  Cathartic: faSpa,
  Charm: faMagic,
  Cleanliness: faSoap, // Assuming you import faSoap
  Competitive: faTrophy,
  'Content Creation': faCameraRetro, // Assuming you import faCameraRetro
  'Continuous Play': faInfinity, // Assuming you import faInfinity
  Cosplay: faMask,
  Costuming: faHatWizard, // Assuming you import faHatWizard
  Cuckolding: faUserSecret,
  Cuddling: faHeart,
  Degradation: faThumbsDown, // Assuming you import faThumbsDown
  Devotion: faPray, // Assuming you import faPray
  Digital: faDigitalTachograph, // Assuming you import faDigitalTachograph
  'Digital Platform': faCloud, // Assuming you import faCloud
  Discovery: faSearch,
  Diversity: faGlobe,
  'Double Penetration': faGem, // Symbolic representation
  'Dress Up': faUserTie, // Assuming you import faUserTie
  'Emotional Exploration': faJournalWhills, // Assuming you import faJournalWhills
  'Emotional Reconnection': faHands, // Assuming you import faHands
  Energy: faBolt,
  Engagement: faRing, // Assuming you import faRing
  'Erotic Humiliation': faSadCry, // Assuming you import faSadCry
  Experience: faStar, // Symbolic use for 'star' experience
  Experimentation: faVial, // Assuming you import faVial
  Fear: faGhost, // Assuming you import faGhost
  Fetish: faMask, // Reuse for symbolic representation
  'Food Play': faUtensils, // Assuming you import faUtensils
  Forniphilia: faCouch, // Symbolic representation
  Fulfillment: faGift, // Symbolic use of 'gift' as fulfillment
  Fun: faLaugh, // Assuming you import faLaugh
  'Furry Lite': faDog, // Assuming you import faDog
  Fursona: faPaw, // Symbolic representation
  'Gender Norms': faVenusMars, // Assuming you import faVenusMars
  Guidance: faCompass, // Symbolic use for 'direction'
  Healing: faHeartbeat, // Assuming you import faHeartbeat
  Heights: faMountain, // Assuming you import faMountain
  'Hot and Cold': faThermometerFull, // Assuming you import faThermometerFull
  Hygiene: faBath, // Assuming you import faBath
  Insecurity: faQuestion, // Symbolic use of 'question' for doubts
  Limits: faRuler, // Assuming you import faRuler for 'boundaries'
  'Long Distance': faPlaneDeparture, // Assuming you import faPlaneDeparture
  Macabre: faSkullCrossbones, // Assuming you import faSkullCrossbones
  'Machine Play': faRobot, // Assuming you import faRobot
  'Medical Fantasy': faBriefcaseMedical, // Assuming you import faBriefcaseMedical
  Memento: faMemory, // Assuming you import faMemory
  Modeling: faCamera, // Assuming you import faCamera
  'Mute Sensation': faDeaf, // Assuming you import faDeaf
  Mutual: faHandsHelping, // Symbolic representation of cooperation
  Mystical: faMagic, // Reuse for symbolic representation
  Narrative: faBookOpen, // Assuming you import faBookOpen
  Natural: faLeaf, // Assuming you import faLeaf
  Objectification: faObjectGroup, // Assuming you import faObjectGroup
  'Oral Technique': faCommentDots, // Assuming you import faCommentDots
  'Orgasm Denial': faBan, // Assuming you import faBan
  Outdoors: faTree, // Reuse for symbolic representation
  'Partner Swapping': faExchangeAlt, // Assuming you import faExchangeAlt
  Party: faBeer, // Assuming you import faBeer
  Pegging: faArrowRight, // Symbolic use of 'arrow' for penetration
  'Physical Attraction': faFire, // Symbolic use of 'fire' for passion
  'Physical Engagement': faHandshake, // Reuse for symbolic representation of 'engagement'
  'Physical Intimacy': faBed, // Reuse for symbolic representation of 'intimacy'
  Playful: faLaughBeam, // Reuse for symbolic representation of 'playfulness'
  'Playful Exploration': faSearchPlus, // Assuming you import faSearchPlus
  'Power Play': faChessQueen, // Assuming you import faChessQueen
  Practicality: faToolbox, // Assuming you import faToolbox
  Preference: faThumbsUp, // Assuming you import faThumbsUp
  Preparation: faClipboardList, // Assuming you import faClipboardList
  'Primal Instincts': faPaw, // Reuse for symbolic representation
  Private: faDoorClosed, // Assuming you import faDoorClosed
  'Professional Boundaries': faBriefcase, // Assuming you import faBriefcase
  'Psychological Play': faBrain, // Reuse for symbolic representation
  'Public Play': faTheaterMasks, // Reuse for symbolic representation of 'performance'
  'Public Risk': faExclamationCircle, // Assuming you import faExclamationCircle
  Reconciliation: faHands, // Symbolic use for 'coming together'
  Rekindling: faRedo, // Assuming you import faRedo
  'Remote Play': faWifi, // Symbolic use of 'wifi' for distance
  Restraint: faHandcuffs, // Reuse for symbolic representation
  'Risk Taking': faUserSecret, // Reuse for symbolic representation of 'secrecy'
  'Role Reversal': faExchangeAlt, // Reuse for symbolic representation of 'exchange'
  Ropes: faAnchor, // Symbolic use of 'anchor' for bondage
  'Safe Word': faShieldAlt, // Reuse for symbolic representation of 'safety'
  'Safety Signals': faSignal, // Assuming you import faSignal
  Seclusion: faUserLock, // Assuming you import faUserLock
  Secret: faUserSecret, // Reuse for symbolic representation
  'Self Esteem Enhancement': faStar, // Symbolic use for 'star' quality
  'Self-Awareness': faUserCircle, // Assuming you import faUserCircle
  'Self-Esteem': faSmile, // Assuming you import faSmile
  'Semi-Private': faUsersSlash, // Assuming you import faUsersSlash
  'Sensory Experience': faEye, // Reuse for symbolic representation of 'observation'
  'Sensual Exploration': faHandSparkles, // Assuming you import faHandSparkles
  'Sensual Play': faFeatherAlt, // Reuse for symbolic representation
  Serenade: faMusic, // Assuming you import faMusic
  'Sex Toys': faPlug, // Reuse for symbolic representation
  'Sexual Freedom': faDove, // Assuming you import faDove
  Shared: faUsers, // Reuse for symbolic representation of 'community'
  'Shared Space': faHome, // Assuming you import faHome
  Sharing: faShareAlt, // Assuming you import faShareAlt
  'Skill Development': faChalkboardTeacher, // Assuming you import faChalkboardTeacher
  Slippery: faTint, // Assuming you import faTint
  'Social Navigation': faMapSigns, // Assuming you import faMapSigns
  Support: faHandsHelping, // Reuse for symbolic representation of 'aid'
  Surreal: faCloudMoon, // Assuming you import faCloudMoon
  Suspension: faDizzy, // Symbolic use of 'dizzy' for the sensation of being suspended
  'Taboo Challenging': faQuestionCircle, // Assuming you import faQuestionCircle
  'Team Building': faUsers, // Reuse for symbolic representation of 'group work'
  'Technological Exploration': faMicrochip, // Assuming you import faMicrochip
  Technology: faLaptopCode, // Assuming you import faLaptopCode
  Tension: faBolt, // Reuse for symbolic representation of 'energy'
  'Texture Play': faHandRock, // Symbolic use of 'hand' for tactile experience
  Travel: faPlane, // Reuse for symbolic representation of 'journey'
  'Trust Exercise': faParachuteBox, // Assuming you import faParachuteBox
  Uniform: faTshirt, // Assuming you import faTshirt
  Uninhibited: faUnlockAlt, // Assuming you import faUnlockAlt
  Vibrations: faWaveSquare, // Assuming you import faWaveSquare
  Visibility: faEyeSlash, // Symbolic use for 'hidden' or 'revealed'
  Vocal: faMicrophone, // Assuming you import faMicrophone
  'Vocal Expression': faVolumeUp, // Assuming you import faVolumeUp
  Water: faWater, // Reuse for symbolic representation
  'Webcam Modeling': faVideo, // Assuming you import faVideo
  Wellness: faSpa, // Reuse for symbolic representation of 'relaxation'
};

const StyledFontAwesomeIcon = styled(FontAwesomeIcon)({
  fontSize: '48px',
  marginBottom: '16px',
});

const CategoryIcon = ({
  category,
  size = 'big',
}: {
  category: keyof typeof categoryIcons;
  size?: 'big' | 'small';
}) => {
  const defaultIcon = faQuestionCircle;
  const categoryIcon =
    categoryIcons[category] || (defaultIcon as IconDefinition);

  return size === 'small' ? (
    <FontAwesomeIcon icon={categoryIcon} />
  ) : (
    <StyledFontAwesomeIcon icon={categoryIcon} />
  );
};

export default CategoryIcon;
