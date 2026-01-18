/**
 * Styled Markdown Overlay
 *
 * Renders markdown text with syntax dimming as an overlay.
 * This creates the visual effect of dimmed syntax characters while
 * keeping the actual TextInput transparent for editing.
 */

import React, {useMemo} from 'react';
import {Text, StyleSheet, View, TouchableOpacity, type TextStyle} from 'react-native';
import {
  parseMarkdownSegments,
  SYNTAX_OPACITY,
  type StyledSegment,
} from '../../utils/markdownStyles';
import {colors, radius} from '../../theme';

const FOCUS_MODE_DIM_OPACITY = 0.4;
const FRONTMATTER_REGEX = /^---\n[\s\S]*?\n---\n?/;

export interface StyledMarkdownOverlayProps {
  text: string;
  style?: object;
  focusMode?: boolean;
  currentParagraphIndex?: number;
  frontmatterCollapsed?: boolean;
  onToggleFrontmatter?: () => void;
}

const HEADING_STYLES: Record<number, TextStyle> = {
  1: {fontSize: 28, fontWeight: '700'},
  2: {fontSize: 24, fontWeight: '700'},
  3: {fontSize: 22, fontWeight: '600'},
  4: {fontSize: 20, fontWeight: '600'},
  5: {fontSize: 20, fontWeight: '600'},
  6: {fontSize: 20, fontWeight: '600'},
};

function getSegmentStyle(segment: StyledSegment): TextStyle | TextStyle[] {
  switch (segment.type) {
    case 'syntax':
      return styles.syntax;
    case 'wikilink':
    case 'linkUrl':
      return styles.link;
    case 'heading':
      return [styles.syntax, HEADING_STYLES[segment.headingLevel ?? 1] ?? {}];
    case 'checkbox':
      return styles.checkbox;
    case 'checkboxChecked':
      return styles.checkboxChecked;
    case 'content':
    default:
      return styles.content;
  }
}

interface ParagraphData {
  text: string;
  startIndex: number;
  endIndex: number;
  isFrontmatter: boolean;
}

function parseParagraphs(text: string): ParagraphData[] {
  const paragraphs: ParagraphData[] = [];
  const frontmatterMatch = FRONTMATTER_REGEX.exec(text);
  let startIndex = 0;
  
  if (frontmatterMatch) {
    paragraphs.push({
      text: frontmatterMatch[0],
      startIndex: 0,
      endIndex: frontmatterMatch[0].length,
      isFrontmatter: true,
    });
    startIndex = frontmatterMatch[0].length;
  }
  
  const remainingText = text.slice(startIndex);
  const parts = remainingText.split(/(\n\n+)/);
  let currentIndex = startIndex;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part && part.length > 0) {
      paragraphs.push({
        text: part,
        startIndex: currentIndex,
        endIndex: currentIndex + part.length,
        isFrontmatter: false,
      });
      currentIndex += part.length;
    }
  }
  
  return paragraphs;
}

export function StyledMarkdownOverlay({
  text,
  style,
  focusMode = false,
  currentParagraphIndex = 0,
  frontmatterCollapsed = true,
  onToggleFrontmatter,
}: StyledMarkdownOverlayProps): React.JSX.Element {
  const paragraphs = useMemo(() => parseParagraphs(text), [text]);
  
  const hasFrontmatter = useMemo(() => {
    return paragraphs.length > 0 && paragraphs[0]?.isFrontmatter === true;
  }, [paragraphs]);

  const renderSegments = (segmentText: string, dimmed: boolean) => {
    const segments = parseMarkdownSegments(segmentText);
    return segments.map((segment, index) => {
      const baseStyle = getSegmentStyle(segment);
      const dimStyle = dimmed ? styles.dimmedText : undefined;
      return (
        <Text
          key={index}
          style={[baseStyle, dimStyle]}>
          {segment.text}
        </Text>
      );
    });
  };

  const renderParagraph = (paragraph: ParagraphData, paragraphIndex: number) => {
    const isCurrentParagraph = paragraphIndex === currentParagraphIndex;
    const shouldDim = focusMode && !isCurrentParagraph;
    
    return (
      <Text key={paragraphIndex}>
        {renderSegments(paragraph.text, shouldDim)}
      </Text>
    );
  };

  const renderFrontmatterBadge = () => (
    <TouchableOpacity
      style={styles.frontmatterBadge}
      onPress={onToggleFrontmatter}
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
      <Text style={styles.frontmatterBadgeText}>
        frontmatter {frontmatterCollapsed ? '▼' : '▲'}
      </Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (!hasFrontmatter) {
      return paragraphs.map((p, i) => renderParagraph(p, i));
    }

    const frontmatter = paragraphs[0]!;
    const restParagraphs = paragraphs.slice(1);
    
    return (
      <>
        {frontmatterCollapsed ? (
          <>
            {renderFrontmatterBadge()}
            <Text>{'\n'}</Text>
          </>
        ) : (
          <TouchableOpacity onPress={onToggleFrontmatter}>
            <Text style={styles.dimmedText}>
              {renderSegments(frontmatter.text, true)}
            </Text>
          </TouchableOpacity>
        )}
        {restParagraphs.map((p, i) => renderParagraph(p, hasFrontmatter ? i + 1 : i))}
      </>
    );
  };

  return (
    <View style={[styles.container, style]} pointerEvents="box-none">
      <Text style={styles.text}>
        {renderContent()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 30,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  syntax: {
    opacity: SYNTAX_OPACITY,
  },
  content: {
    opacity: 1,
  },
  link: {
    color: colors.accent,
    opacity: 1,
  },
  checkbox: {
    opacity: SYNTAX_OPACITY,
  },
  checkboxChecked: {
    opacity: SYNTAX_OPACITY,
    color: colors.success,
  },
  dimmedText: {
    opacity: FOCUS_MODE_DIM_OPACITY,
  },
  frontmatterBadge: {
    backgroundColor: colors.backgroundCard,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  frontmatterBadgeText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
});
