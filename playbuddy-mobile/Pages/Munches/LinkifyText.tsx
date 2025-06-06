import React from "react";
import { Text, Linking, StyleSheet, TextProps } from "react-native";

type LinkifyProps = TextProps & {
    children: string;
    platform?: "instagram" | "fetlife";
};

// Regex to match URLs (with or without protocol), including TLDs like .xxx, .io, .co, etc.
const urlRegex = /\b((?:https?:\/\/)?(?:www\.)?[^\s]+\.[A-Za-z]{2,}(?:\/[^\s]*)?)\b/g;
// Updated regex to match bare @handles including dashes
const handleRegex = /@([A-Za-z0-9._-]+)/g;

// Combined regex: matches either a URL or an @handle
const combinedRegex = new RegExp(`${urlRegex.source}|${handleRegex.source}`, "g");

export const LinkifyText: React.FC<LinkifyProps> = ({
    children,
    style,
    platform,
    ...rest
}) => {
    const text = children;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = combinedRegex.exec(text)) !== null) {
        const matchStart = match.index;
        const matchText = match[0];

        // Push preceding plain text
        if (matchStart > lastIndex) {
            elements.push(text.slice(lastIndex, matchStart));
        }

        // If URL matched (group 1)
        if (match[1]) {
            let urlText = match[1];
            // Ensure URL has a protocol for Linking.openURL
            let normalizedUrl = urlText;
            if (!/^https?:\/\//i.test(normalizedUrl)) {
                normalizedUrl = "https://" + normalizedUrl;
            }

            elements.push(
                <Text
                    key={`url-${matchStart}`}
                    style={styles.link}
                    onPress={() => {
                        Linking.openURL(normalizedUrl).catch(() =>
                            console.warn("Failed to open URL:", normalizedUrl)
                        );
                    }}
                >
                    {urlText}
                </Text>
            );
        }
        // Else if @handle matched (group 2)
        else if (match[2]) {
            const handle = match[0]; // includes "@"
            const username = match[2];

            let linkUrl: string;
            if (platform === "fetlife") {
                linkUrl = `https://fetlife.com/${username}`;
            } else if (platform === "instagram") {
                linkUrl = `https://instagram.com/${username}`;
            } else {
                // Fallback: check if any prior URL detection labeled it as Instagram
                linkUrl = `https://instagram.com/${username}`;
            }

            elements.push(
                <Text
                    key={`handle-${matchStart}`}
                    style={styles.link}
                    onPress={() => {
                        Linking.openURL(linkUrl).catch(() =>
                            console.warn(`Failed to open URL:`, linkUrl)
                        );
                    }}
                >
                    {handle}
                </Text>
            );
        }

        lastIndex = matchStart + matchText.length;
    }

    // Push any remaining text after the last match
    if (lastIndex < text.length) {
        elements.push(text.slice(lastIndex));
    }

    return (
        <Text style={style} {...rest}>
            {elements}
        </Text>
    );
};

const styles = StyleSheet.create({
    link: {
        color: "#007AFF",
    },
});
