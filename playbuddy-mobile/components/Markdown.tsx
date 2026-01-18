import React from 'react';
import FitImage from 'react-native-fit-image';
import Markdown, { type MarkdownProps, type RenderImageFunction } from 'react-native-markdown-display';

const renderImage: RenderImageFunction = (
    node,
    _children,
    _parentNodes,
    styles,
    allowedImageHandlers,
    defaultImageHandler,
) => {
    const src = node.attributes?.src;
    if (!src) return null;

    const handlers = Array.isArray(allowedImageHandlers) ? allowedImageHandlers : [];
    const show = handlers.some((value) => src.toLowerCase().startsWith(value.toLowerCase()));

    if (!show && defaultImageHandler === null) {
        return null;
    }

    const imageProps: {
        indicator: boolean;
        style: any;
        source: { uri: string };
        accessible?: boolean;
        accessibilityLabel?: string;
    } = {
        indicator: true,
        style: styles._VIEW_SAFE_image,
        source: {
            uri: show ? src : `${defaultImageHandler || ''}${src}`,
        },
    };

    if (node.attributes?.alt) {
        imageProps.accessible = true;
        imageProps.accessibilityLabel = node.attributes.alt;
    }

    return <FitImage key={node.key} {...imageProps} />;
};

const MarkdownRenderer = ({ rules, ...props }: MarkdownProps) => {
    return <Markdown {...props} rules={{ image: renderImage, ...(rules || {}) }} />;
};

export default MarkdownRenderer;
