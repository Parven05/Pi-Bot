export const LANGUAGES = [
    "C", "C++", "C#", "Rust", "Java", "JavaScript", "Python", "Bash", "Nix",
] as const;

export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_SET = new Set(LANGUAGES.map(l => l.toLowerCase()));

const OPTION_TYPE_STRING = 3;

export const DISCORD_COMMANDS = [
    {
        name: "ask",
        description: "Ask me anything",
        options: [
            {
                type: OPTION_TYPE_STRING,
                name: "question",
                description: "Your question",
                required: true,
            },
        ],
    },
    {
        name: "snippet",
        description: "Generate a short code snippet",
        options: [
            {
                type: OPTION_TYPE_STRING,
                name: "refer",
                description: "Describe the snippet you need",
                required: true,
            },
            {
                type: OPTION_TYPE_STRING,
                name: "language",
                description: "Choose the programming language",
                required: true,
                choices: LANGUAGES.map(lang => ({ name: lang, value: lang })),
            },
        ],
    },
] as const;