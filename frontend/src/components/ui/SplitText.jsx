import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const isWhitespace = (value) => /^\s+$/.test(value);

const toCssValue = (value, unit = 'px') => {
  if (value === undefined || value === null) {
    return `0${unit}`;
  }

  return typeof value === 'number' ? `${value}${unit}` : value;
};

const buildTransform = (state = {}) => {
  const transforms = [];
  const x = state.x ?? 0;
  const y = state.y ?? 0;
  const z = state.z ?? 0;

  if (x || y || z) {
    transforms.push(`translate3d(${toCssValue(x)}, ${toCssValue(y)}, ${toCssValue(z)})`);
  }

  if (state.scale !== undefined) {
    transforms.push(`scale(${state.scale})`);
  }

  if (state.rotate !== undefined) {
    transforms.push(`rotate(${toCssValue(state.rotate, 'deg')})`);
  }

  if (state.rotateX !== undefined) {
    transforms.push(`rotateX(${toCssValue(state.rotateX, 'deg')})`);
  }

  if (state.rotateY !== undefined) {
    transforms.push(`rotateY(${toCssValue(state.rotateY, 'deg')})`);
  }

  return transforms.length ? transforms.join(' ') : undefined;
};

const createSegments = (text, splitType) => {
  if (!text) {
    return [];
  }

  if (splitType && splitType.includes('word')) {
    return text.split(/(\s+)/).map((segment, index) => ({
      id: `word-${index}`,
      value: segment,
      whitespace: isWhitespace(segment),
    }));
  }

  return Array.from(text).map((segment, index) => ({
    id: `char-${index}`,
    value: segment,
    whitespace: isWhitespace(segment),
  }));
};

const SplitText = ({
  text,
  className = '',
  itemClassName = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  textAlign = 'left',
  tag = 'span',
  initialDelay = 0,
  disabled = false,
  onLetterAnimationComplete,
}) => {
  const rootRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(disabled);

  const segments = useMemo(() => createSegments(text, splitType), [text, splitType]);

  useEffect(() => {
    setHasAnimated(disabled);
  }, [text, splitType, disabled]);

  const initialItemStyle = useMemo(() => {
    if (disabled || hasAnimated) {
      return undefined;
    }

    return {
      opacity: from?.opacity ?? 0,
      transform: buildTransform(from),
      display: 'inline-block',
      willChange: 'transform, opacity',
      transformOrigin: '50% 100%',
      backfaceVisibility: 'hidden',
    };
  }, [disabled, from, hasAnimated]);

  useGSAP(() => {
    const items = rootRef.current?.querySelectorAll('[data-split-item]');

    if (!items?.length) {
      return undefined;
    }

    if (hasAnimated && !disabled) {
      return undefined;
    }

    if (disabled) {
      gsap.set(items, {
        opacity: to?.opacity ?? 1,
        x: to?.x ?? 0,
        y: to?.y ?? 0,
        scale: to?.scale ?? 1,
        rotate: to?.rotate ?? 0,
        rotateX: to?.rotateX ?? 0,
        rotateY: to?.rotateY ?? 0,
        clearProps: 'transform,opacity,willChange',
      });
      onLetterAnimationComplete?.();
      return undefined;
    }

    const tween = gsap.to(items, {
      ...to,
      duration,
      ease,
      delay: initialDelay,
      stagger: delay / 1000,
      onComplete: () => {
        gsap.set(items, { clearProps: 'transform,opacity,willChange' });
        setHasAnimated(true);
        onLetterAnimationComplete?.();
      },
    });

    return () => {
      tween.kill();
      gsap.killTweensOf(items);
    };
  }, {
    dependencies: [
      text,
      splitType,
      delay,
      duration,
      ease,
      initialDelay,
      disabled,
      hasAnimated,
      JSON.stringify(from),
      JSON.stringify(to),
    ],
    scope: rootRef,
  });

  const Tag = tag;
  const rootDisplay = Tag === 'span' ? 'inline-block' : 'block';

  return (
    <Tag
      ref={rootRef}
      className={className}
      style={{
        textAlign,
        display: rootDisplay,
        maxWidth: '100%',
        whiteSpace: 'pre-wrap',
        overflow: 'visible',
      }}
      aria-label={text}
    >
      {segments.map((segment) => (
        segment.whitespace ? (
          <span key={segment.id} aria-hidden="true" style={{ whiteSpace: 'pre' }}>
            {segment.value.replace(/ /g, '\u00A0')}
          </span>
        ) : (
          <span
            key={segment.id}
            data-split-item
            aria-hidden="true"
            className={itemClassName}
            style={initialItemStyle}
          >
            {segment.value}
          </span>
        )
      ))}
    </Tag>
  );
};

export default SplitText;