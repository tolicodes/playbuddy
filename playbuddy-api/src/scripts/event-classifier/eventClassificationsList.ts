import tags from "./tags.js"

export const getClassificationDetails = (classification: string) => {
    return event_classifications.find((c) => c.classification === classification);
}

export const event_classifications = [
    {
        classification: "type",
        name: "Event Type",
        description: "The primary format or nature of the event.",
        options: [
            {
                name: "play_party",
                description: "Type of event is play party, temple night, kink party, dungeon. Not a workshop",
                examples: ["Play Party", "Temple Night", "Kink Party", "Sex Party", "Dungeon"]
            },
            {
                name: "munch",
                description: "Munch, social, meetup, brunch, happy hour.",
                examples: ["Munch", "Social", "Meetup", "Brunch", "Happy Hour"]
            },
            {
                name: "retreat",
                description: "Retreat, immersion, residency, multi-day.",
                examples: ["Retreat", "Immersion", "Residency", "Multi-Day"]
            },
            {
                name: "festival",
                description: "Festival, camp, gathering, multi-day celebration.",
                examples: ["Festival", "Camp", "Gathering", "Celebration"]
            },
            {
                name: "conference",
                description: "Conference, convention, summit, congress.",
                examples: ["Conference", "Convention", "Summit", "Congress"]
            },
            {
                name: "workshop",
                description: "Workshop, class, skills training, demo, practice lab.",
                examples: ["Workshop", "Class", "Skills Training", "Demo", "Practice Lab"]
            },
            {
                name: "event",
                description: "Generic event when none of the other types are explicitly indicated.",
                examples: ["Event", "Community Night", "Open House"]
            }
        ]
    },

    {
        "classification": "short_description",
        "name": "Short Description",
        "description": `
         - short description of the event
         - should be specific about what's in the workshop like exercises. 
         - Attendee should know what they're into and whether this is hands on.
         - let them now simply what they in for without fancy marketing speak (ex: fire play)
         - list something unique about the event
         - should be 2 sentences`,
    },

    {
        "classification": "tags",
        "name": "Event Themes",
        "description": `
         - avoid making new tags
        - don't use tags that are already covered in category (ex: munch/social, play party)
         - specific themes or topics that the event focuses on
         - match more specific matches (ex: fire play will match before edge play)
         - low priority like Tantra will match after more specific matches.
         - should have 2-5 tags, only high confidence matches`,
        "options": tags
    },

    {
        "classification": "experience_level",
        "name": "Experience Level",
        "description": "The level of prior knowledge or experience recommended for participants.",
        "options": [
            {
                "name": "Beginner",
                "description": "Suitable for those new to the topic or practice.",
                "related": ["education", "introductory_workshops"]
            },
            {
                "name": "Intermediate",
                "description": "Participants should have some prior experience or knowledge.",
                "related": ["skill_building", "hands_on_participation"]
            },
            {
                "name": "Advanced",
                "description": "Designed for experienced individuals looking to deepen their expertise.",
                "related": ["advanced_techniques", "expert_discussions"]
            },
        ]
    },
    {
        classification: "interactivity_level",
        name: "Interactivity Level",
        description: "The level of interaction expected at the event.",
        options: [
            {
                name: "Social",
                description: "Casual mingling and open-ended conversation. Prioritize over no touch",
                examples: ["Munch", "Mixer", "Happy Hour", "Meet & Greet", "Game Night"]
            },
            {
                name: "Discussion",
                description: "Conversation-driven events and peer exchange. Unlike social there is a topic",
                examples: ["Kink 101 Circle", "Polyamory Q&A", "Panel Discussion"]
            },
            {
                name: "Intimate",
                description: "Close interactions without overt sensuality.",
                examples: ["Partner Yoga", "Cuddle Party", "Intimacy Building"]
            },
            {
                name: "Sensual",
                description: "Engaging the senses, often with touch, but not explicitly sexual.",
                examples: ["Sensual Massage", "Tantra", "Sensual Dance", "Guided Touch"]
            },
            {
                name: "Erotic",
                description: "Sexually suggestive content or performance.",
                examples: ["Burlesque", "Erotic Readings", "Strip Tease Workshop", "Exhibition Performance"]
            },
            {
                name: "Sexual",
                description: "Explicit sexual content and/or opportunities for play.",
                examples: ["Play Party", "Swinger Event", "Fetish Convention", "Group Scene"]
            },
            {
                name: "Extreme",
                description: "Intense physical or psychological engagement; edge territory.",
                examples: ["Edge Play Demo", "Needle Scene", "Fire Play Ritual", "Mindfuck Workshop"]
            },
            {
                name: "Hands-On",
                description: "Active participation in guided activities. Catch all for not sensual or erotic etc",
                examples: ["Bondage Lab", "Impact Workshop", "Tantric Breathwork", "Rope Jam"]
            },
            {
                name: "Performance",
                description: "Theatrical or artistic acts witnessed by attendees.",
                examples: ["Burlesque", "Drag Show", "Fetish Cabaret", "Erotic Theater"]
            },
            {
                name: "Observational",
                description: "Primarily watch-based events.  Catch ",
                examples: ["Performance Show", "Live Scene Viewing", "Film Screening", "Rope Exhibition"]
            },
        ],
    },
    {
        "classification": "inclusivity",
        "name": "Inclusivity",
        "description": `
        Only match with high confidence if it's only for those groups. That means ONLY queers or BIPOC allowed
        This is an array of strings
        `,
        options: [{
            name: "Queer",
            description: "is this event queer specific?",
            examples: ["LGBTQ+", "Sapphic", "Pansexual"]
        },
        {
            name: "BIPOC",
            description: "BIPOC specific",
            examples: ["Black", "Latino", "Asian", "Obsidian"]
        }]

    },
    {
        "classification": "vetted",
        "name": "Vetted",
        "description": `is this event vetted? Be SUPER CAREFUL to make sure this is a vetted event. It should say "vetted" or "membership required"`,
    },

    {
        "classification": "vetting_url",
        "name": "Vetting URL",
        "description": `the url to the vetting page`,
    },

    {
        "classification": "location",
        "name": "Location",
        "description": `address or some kind of indicator (Bushwick)`,
    },

    {
        "classification": "neighborhood",
        "name": "Neighborhood",
        "description": `NYC neighborhood inferred from the location (e.g., Bushwick or Midtown). Use common neighborhood names; if unclear or non-NY, leave empty string.`,
    },

    {
        "classification": "short_price",
        "name": "Short Price",
        "description": `Best-guess ticket price as "$<number>" or null if unknown. If a range is listed, use the lower bound.`,
    },

    {
        "classification": "non_ny",
        "name": "Non NY",
        "description": `is this event not in New York?`,
    },

    {
        "classification": "hosts",
        "name": "try to find the event hosts. the organizer (ex: Pagan's Paradise) is NOT the host but rather the organizer. take out any titles (ex: Erebus the Coach -> Erebus)",
        "description": `
            Output:
            string[] 
        `,
    },
]
