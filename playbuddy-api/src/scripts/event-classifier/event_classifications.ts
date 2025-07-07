import event_themes from "./event_themes.js"


export const getClassificationDetails = (classification: string) => {
    return event_classifications.find((c) => c.classification === classification);
}

export const event_classifications = [
    {
        "classification": "event_themes",
        "name": "Event Themes",
        "description": "5 specific themes or topics that the event focuses on",
        // TODO: Don't pick this category if munches, retreats etc but mark them
        "options": event_themes
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
    // {
    //     "classification": "inclusivity",
    //     "name": "Inclusivity",
    //     "description": "The groups or communities that the event is intended for.",
    //     "options": [
    //         {
    //             "id": "open_to_all_genders_and_orientations",
    //             "name": "Open to All Genders and Orientations",
    //             "description": "Inclusive of all gender identities and sexual orientations.",
    //             "related": ["diversity", "community_building"]
    //         },
    //         {
    //             "id": "specific_groups",
    //             "name": "Specific Groups",
    //             "description": "Targeted at specific communities (details provided in the event description).",
    //             "related": ["support_groups", "identity_specific"]
    //         },
    //         {
    //             "id": "couples_only",
    //             "name": "Couples Only",
    //             "description": "Only couples may attend, focusing on partnered activities.",
    //             "related": ["relationship_building", "polyamory"]
    //         },
    //         {
    //             "id": "women_only",
    //             "name": "Women Only",
    //             "description": "Exclusive to women, including cisgender and transgender women.",
    //             "related": ["women_in_kink", "safe_spaces"]
    //         },
    //         {
    //             "id": "men_only",
    //             "name": "Men Only",
    //             "description": "Exclusive to men, including cisgender and transgender men.",
    //             "related": ["men_in_kink", "support_groups"]
    //         },
    //         {
    //             "id": "lgbtq_focused",
    //             "name": "LGBTQ+ Focused",
    //             "description": "Focused on the LGBTQ+ community, but may be open to allies.",
    //             "related": ["queer_kink", "pride_events"]
    //         },
    //         {
    //             "id": "non_binary_only",
    //             "name": "Non-Binary Only",
    //             "description": "Exclusive to non-binary individuals.",
    //             "related": ["gender_identity_exploration", "safe_spaces"]
    //         },
    //         {
    //             "id": "bipoc_only",
    //             "name": "BIPOC Only",
    //             "description": "Exclusive to Black, Indigenous, and People of Color.",
    //             "related": ["diversity", "community_support"]
    //         }
    //     ]
    // },
]

