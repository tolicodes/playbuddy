import event_themes from "./event_themes.js"
import tags from "./tags.js"

// Define the structure for Event Classifications
export interface EventClassifications {
    event_id: string;
    event_themes: string[];

    tags: string[];

    comfort_level: string;
    experience_level: string;
    inclusivity: string;
    interactivity_level: string;

    // consent_and_safety_policies: string[];
    // alcohol_and_substance_policies: string[];
    // venue_type: string;
    // dress_code: string[];
    // accessibility: string[];
}

export const getClassificationDetails = (classification: string) => {
    return event_classifications.find((c) => c.classification === classification);
}

export const event_classifications = [
    {
        "classification": "event_themes",
        "name": "Event Themes",
        "description": "Specific themes or topics that the event focuses on.",
        "options": event_themes
    },
    {
        "classification": "tags",
        "name": "Tags",
        "description": "Free form tags",
        "options": tags
    },
    {
        "classification": "comfort_level",
        "name": "Comfort Level",
        "description": "The level of intimacy or intensity expected at the event.",
        "options": [
            {
                "id": "no_touch",
                "name": "No Touch",
                "description": "Events where no physical contact is expected or allowed between participants.",
                "related": ["social", "discussion_based"]
            },
            {
                "id": "intimate",
                "name": "Intimate",
                "description": "Events involving close interactions without overt sensuality, suitable for those comfortable with proximity but not necessarily touch.",
                "related": ["workshop", "hands_on_participation"]
            },
            {
                "id": "sensual",
                "name": "Sensual",
                "description": "Events that engage the senses and may involve touch, focusing on sensual experiences without explicit sexual activity.",
                "related": ["sensual_massage", "tantra", "sensual_dance"]
            },
            {
                "id": "erotic",
                "name": "Erotic",
                "description": "Events with sexually suggestive elements, possibly involving partial nudity or erotic performances.",
                "related": ["burlesque", "erotic_readings", "strip_tease_workshops"]
            },
            {
                "id": "sexual",
                "name": "Sexual",
                "description": "Events where sexual activities may occur, requiring a high level of comfort with sexual expression.",
                "related": ["play_party", "fetish_conventions", "swinger_events"]
            },
            {
                "id": "extreme",
                "name": "Extreme",
                "description": "Events involving intense activities that push boundaries, suitable for experienced participants.",
                "related": ["edge_play", "consent_and_safety_policies", "advanced_techniques"]
            }
        ]
    },
    {
        "classification": "experience_level",
        "name": "Experience Level",
        "description": "The level of prior knowledge or experience recommended for participants.",
        "options": [
            {
                "id": "beginner_friendly",
                "name": "Beginner Friendly",
                "description": "Suitable for those new to the topic or practice.",
                "related": ["education", "introductory_workshops"]
            },
            {
                "id": "intermediate",
                "name": "Intermediate",
                "description": "Participants should have some prior experience or knowledge.",
                "related": ["skill_building", "hands_on_participation"]
            },
            {
                "id": "advanced",
                "name": "Advanced",
                "description": "Designed for experienced individuals looking to deepen their expertise.",
                "related": ["advanced_techniques", "expert_discussions"]
            },
            {
                "id": "all_levels",
                "name": "All Levels",
                "description": "Open to participants of any experience level.",
                "related": ["inclusive", "community_building"]
            }
        ]
    },
    {
        "classification": "interactivity_level",
        "name": "Interactivity Level",
        "description": "The expected level of participant engagement during the event.",
        "options": [
            {
                "id": "hands_on_participation",
                "name": "Hands-On Participation",
                "description": "Participants actively engage in activities or exercises.",
                "related": ["workshops", "skill_building"]
            },
            {
                "id": "discussion_based",
                "name": "Discussion-Based",
                "description": "Focused on group discussions and sharing ideas.",
                "related": ["support_groups", "panel_discussion"]
            },
            {
                "id": "socializing",
                "name": "Socializing",
                "description": "Emphasis on casual interaction and networking.",
                "related": ["social_mixer", "community_building"]
            },
            {
                "id": "observational",
                "name": "Observational",
                "description": "Participants observe rather than engage directly.",
                "related": ["performance_show", "film_screening"]
            },
            {
                "id": "performance",
                "name": "Performance",
                "description": "Attendees watch performances by others.",
                "related": ["burlesque", "drag_performances"]
            },
            {
                "id": "interactive_workshops",
                "name": "Interactive Workshops",
                "description": "Combination of instruction and participant interaction.",
                "related": ["education", "hands_on_participation"]
            }
        ]
    },
    {
        "classification": "inclusivity",
        "name": "Inclusivity",
        "description": "The groups or communities that the event is intended for.",
        "options": [
            {
                "id": "open_to_all_genders_and_orientations",
                "name": "Open to All Genders and Orientations",
                "description": "Inclusive of all gender identities and sexual orientations.",
                "related": ["diversity", "community_building"]
            },
            {
                "id": "specific_groups",
                "name": "Specific Groups",
                "description": "Targeted at specific communities (details provided in the event description).",
                "related": ["support_groups", "identity_specific"]
            },
            {
                "id": "couples_only",
                "name": "Couples Only",
                "description": "Only couples may attend, focusing on partnered activities.",
                "related": ["relationship_building", "polyamory"]
            },
            {
                "id": "women_only",
                "name": "Women Only",
                "description": "Exclusive to women, including cisgender and transgender women.",
                "related": ["women_in_kink", "safe_spaces"]
            },
            {
                "id": "men_only",
                "name": "Men Only",
                "description": "Exclusive to men, including cisgender and transgender men.",
                "related": ["men_in_kink", "support_groups"]
            },
            {
                "id": "lgbtq_focused",
                "name": "LGBTQ+ Focused",
                "description": "Focused on the LGBTQ+ community, but may be open to allies.",
                "related": ["queer_kink", "pride_events"]
            },
            {
                "id": "non_binary_only",
                "name": "Non-Binary Only",
                "description": "Exclusive to non-binary individuals.",
                "related": ["gender_identity_exploration", "safe_spaces"]
            },
            {
                "id": "bipoc_only",
                "name": "BIPOC Only",
                "description": "Exclusive to Black, Indigenous, and People of Color.",
                "related": ["diversity", "community_support"]
            }
        ]
    },
    // ...otherClassifications
]


const otherClassifications = [
    {
        "classification": "consent_and_safety_policies",
        "name": "Consent and Safety Policies",
        "description": "Policies and practices in place to ensure participant safety and consent.",
        "options": [
            {
                "id": "consent_practices_reviewed",
                "name": "Consent Practices Reviewed",
                "description": "Consent practices are discussed and reviewed with participants.",
                "related": ["orientation", "education"]
            },
            {
                "id": "emphasis_on_mutual_opt_in_desire",
                "name": "Emphasis on Mutual Opt-In Desire",
                "description": "Focus on activities that both parties enthusiastically agree to.",
                "related": ["communication_skills", "ethical_play"]
            },
            {
                "id": "strict_consent_enforcement",
                "name": "Strict Consent Enforcement",
                "description": "Strong policies in place to enforce consent and address violations.",
                "related": ["safety_monitors", "code_of_conduct"]
            },
            {
                "id": "zero_tolerance_for_harassment",
                "name": "Zero Tolerance for Harassment",
                "description": "Harassment is not tolerated, and violations result in immediate action.",
                "related": ["safe_spaces", "community_guidelines"]
            },
            {
                "id": "orientation_includes_guidelines",
                "name": "Orientation Includes Guidelines",
                "description": "Event orientation covers rules and guidelines for behavior.",
                "related": ["education", "participant_responsibilities"]
            },
            {
                "id": "safety_monitors_present",
                "name": "Safety Monitors Present",
                "description": "Staff or volunteers are present to monitor safety and assist participants.",
                "related": ["event_staff", "support"]
            },
            {
                "id": "ask_first_policy",
                "name": "Ask First Policy",
                "description": "Participants must ask before initiating any interaction.",
                "related": ["consent_education", "communication_skills"]
            },
            {
                "id": "rules_enforced",
                "name": "Rules Enforced",
                "description": "Event rules are actively enforced by organizers.",
                "related": ["code_of_conduct", "participant_agreements"]
            },
            {
                "id": "consent_policy_enforced",
                "name": "Consent Policy Enforced",
                "description": "Specific consent policies are enforced to protect participants.",
                "related": ["safety", "ethical_play"]
            },
            {
                "id": "code_of_conduct_provided",
                "name": "Code of Conduct Provided",
                "description": "A code of conduct is given to participants outlining expectations.",
                "related": ["event_policies", "participant_responsibilities"]
            },
            {
                "id": "emphasis_on_safety_and_informed_consent",
                "name": "Emphasis on Safety and Informed Consent",
                "description": "Safety and informed consent are highlighted throughout the event.",
                "related": ["education", "participant_wellbeing"]
            },
            {
                "id": "safe_and_structured_environment",
                "name": "Safe and Structured Environment",
                "description": "The event environment is designed to be safe and well-organized.",
                "related": ["event_management", "participant_support"]
            },
            {
                "id": "consent_talk_at_opening_circle",
                "name": "Consent Talk at Opening Circle",
                "description": "Consent is discussed at the beginning of the event with all participants.",
                "related": ["orientation", "community_agreements"]
            },
            {
                "id": "community_agreements_reviewed",
                "name": "Community Agreements Reviewed",
                "description": "Group agreements are discussed and agreed upon by participants.",
                "related": ["group_dynamics", "shared_values"]
            },
            {
                "id": "participants_can_opt_out",
                "name": "Participants Can Opt Out",
                "description": "Participants are free to opt out of any activity without pressure.",
                "related": ["autonomy", "respect"]
            },
            {
                "id": "information_not_provided",
                "name": "Information Not Provided",
                "description": "No information on consent and safety policies is provided.",
                "related": ["unknown_policies"]
            }
        ]
    },
    {
        "classification": "alcohol_and_substance_policies",
        "name": "Alcohol and Substance Policies",
        "description": "Rules regarding the use of alcohol and other substances at the event.",
        "options": [
            {
                "id": "sober",
                "name": "Sober",
                "description": "No alcohol or substances allowed; participants are expected to remain sober.",
                "related": ["safety", "clarity"]
            },
            {
                "id": "byob",
                "name": "BYOB",
                "description": "Participants may bring their own alcoholic beverages.",
                "related": ["social_events", "responsible_drinking"]
            },
            {
                "id": "byob_byot",
                "name": "BYOB/BYOT",
                "description": "Participants may bring their own beverages and toys/tools.",
                "related": ["play_parties", "personal_equipment"]
            },
            {
                "id": "bar_provided",
                "name": "Bar Provided",
                "description": "Alcohol is provided or available for purchase at the venue.",
                "related": ["social_mixer", "entertainment"]
            },
            {
                "id": "not_specified",
                "name": "Not Specified",
                "description": "No information about alcohol and substance policies is provided.",
                "related": ["unknown_policies"]
            }
        ]
    },
    {
        "classification": "venue_type",
        "name": "Venue Type",
        "description": "The type of location where the event is held.",
        "options": [
            {
                "id": "public_space",
                "name": "Public Space",
                "description": "An open venue accessible to the general public, such as a park or restaurant.",
                "related": ["munch", "social"]
            },
            {
                "id": "private_residence",
                "name": "Private Residence",
                "description": "Held at someone's home or private property.",
                "related": ["intimate_events", "house_parties"]
            },
            {
                "id": "private_venue",
                "name": "Private Venue",
                "description": "A rented or owned space not open to the public, reserved for the event.",
                "related": ["workshops", "play_parties"]
            },
            {
                "id": "dungeon_play_space",
                "name": "Dungeon Play Space",
                "description": "A specialized venue equipped for BDSM or kink activities.",
                "related": ["play_party", "fetish_events"]
            },
            {
                "id": "online",
                "name": "Online",
                "description": "The event takes place virtually, accessible via the internet.",
                "related": ["webinars", "virtual_community"]
            },
            {
                "id": "outdoor",
                "name": "Outdoor",
                "description": "Held outdoors, possibly in nature or open-air settings.",
                "related": ["festivals", "outdoor_kink_events"]
            },
            {
                "id": "not_specified",
                "name": "Not Specified",
                "description": "Venue type is not specified.",
                "related": ["unknown_venue"]
            }
        ]
    },

    {
        "classification": "dress_code",
        "name": "Dress Code",
        "description": "Guidelines or requirements for attire at the event.",
        "options": [
            {
                "id": "casual",
                "name": "Casual",
                "description": "Informal attire acceptable.",
                "related": ["munch", "social"]
            },
            {
                "id": "comfortable_attire",
                "name": "Comfortable Attire",
                "description": "Emphasis on comfort; participants should wear what makes them feel at ease.",
                "related": ["workshops", "movement_classes"]
            },
            {
                "id": "dress_to_impress",
                "name": "Dress to Impress",
                "description": "Formal or stylish attire encouraged.",
                "related": ["social_events", "networking"]
            },
            {
                "id": "theme_encouraged",
                "name": "Theme Encouraged",
                "description": "Participants are encouraged to dress according to a specific theme.",
                "related": ["fetish_fashion", "costume_parties"]
            },
            {
                "id": "fetish_wear_required",
                "name": "Fetish Wear Required",
                "description": "Fetish attire is mandatory for attendance.",
                "related": ["play_party", "fetish_events"]
            },
            {
                "id": "clothing_optional",
                "name": "Clothing Optional",
                "description": "Participants may choose to be nude or partially clothed.",
                "related": ["nudist_events", "intimacy_building"]
            },
            {
                "id": "no_nudity",
                "name": "No Nudity",
                "description": "Nudity is not allowed at the event.",
                "related": ["public_space", "family_friendly"]
            },
            {
                "id": "all_black",
                "name": "All Black",
                "description": "Participants should wear black clothing.",
                "related": ["formal_events", "theme_parties"]
            },
            {
                "id": "white_attire",
                "name": "White Attire",
                "description": "Participants should wear white clothing.",
                "related": ["ceremonies", "theme_parties"]
            },
            {
                "id": "not_specified",
                "name": "Not Specified",
                "description": "No dress code information is provided.",
                "related": ["unknown_policies"]
            }
        ]
    },
    {
        "classification": "accessibility",
        "name": "Accessibility",
        "description": "Information about the event's accommodations for people with disabilities.",
        "options": [
            {
                "id": "venue_has_elevator",
                "name": "Venue Has Elevator",
                "description": "An elevator is available for multi-level venues.",
                "related": ["wheelchair_accessible"]
            },
            {
                "id": "wheelchair_accessible",
                "name": "Wheelchair Accessible",
                "description": "The venue is accessible by wheelchair.",
                "related": ["ada_compliance", "inclusive"]
            },
            {
                "id": "ada_accessible_bathroom",
                "name": "ADA Accessible Bathroom",
                "description": "Bathrooms meet ADA accessibility standards.",
                "related": ["inclusive", "participant_comfort"]
            },
            {
                "id": "not_wheelchair_accessible",
                "name": "Not Wheelchair Accessible",
                "description": "The venue is not accessible to those using wheelchairs.",
                "related": ["venue_limitations"]
            },
            {
                "id": "sign_language_interpreter",
                "name": "Sign Language Interpreter",
                "description": "Interpreter available for participants who are deaf or hard of hearing.",
                "related": ["inclusive", "communication_support"]
            },
            {
                "id": "assistive_listening_devices",
                "name": "Assistive Listening Devices",
                "description": "Devices available to aid hearing during the event.",
                "related": ["inclusive", "participant_support"]
            },
            {
                "id": "information_not_provided",
                "name": "Information Not Provided",
                "description": "No accessibility information is provided.",
                "related": ["unknown_accessibility"]
            }
        ]
    },
]