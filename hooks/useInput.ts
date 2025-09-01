import { useRef, useEffect } from 'react';

export const useInput = (): React.MutableRefObject<Record<string, boolean>> => {
  const keysPressedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressedRef.current[event.code] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressedRef.current[event.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return keysPressedRef;
};