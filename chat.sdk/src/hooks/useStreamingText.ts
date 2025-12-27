import { useState, useEffect, useRef } from 'react';

interface UseStreamingTextOptions {
  text: string;
  isStreaming: boolean;
}

export function useStreamingText({ text, isStreaming }: UseStreamingTextOptions) {
  const [displayedText, setDisplayedText] = useState(text);
  const previousLength = useRef(0);

  useEffect(() => {
    if (isStreaming) {
      // During streaming, update immediately
      setDisplayedText(text);
      previousLength.current = text.length;
    } else {
      // When streaming ends, ensure we have the full text
      setDisplayedText(text);
      previousLength.current = text.length;
    }
  }, [text, isStreaming]);

  return displayedText;
}
