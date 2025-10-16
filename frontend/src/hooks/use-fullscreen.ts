import { useRef, useState, useEffect, useCallback } from 'react';

export function useFullscreen() {
  const [fullscreen, setFullscreen] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const enterFullscreen = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    if (element.requestFullscreen) {
      element.requestFullscreen();
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (fullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [fullscreen, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const element = elementRef.current;
      setFullscreen(!!document.fullscreenElement && document.fullscreenElement === element);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return {
    fullscreen,
    elementRef,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
