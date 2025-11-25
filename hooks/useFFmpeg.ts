
import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export const useFFmpeg = () => {
  const [loaded, setLoaded] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());
  const messageRef = useRef<string | null>(null);

  const load = async () => {
    if (loaded) return;
    
    // CORRECCIÓN CRÍTICA: Usamos la versión 0.12.10 (más reciente) y apuntamos a UMD que es más seguro para blobs
    // NOTA: No usamos /esm/ aquí para evitar problemas de resolución de rutas relativas en el blob
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
    
    const ffmpeg = ffmpegRef.current;

    // Logger para que veas qué pasa en la consola (F12)
    ffmpeg.on('log', ({ message }) => {
      messageRef.current = message;
      console.log('FFmpeg Log:', message);
    });

    try {
      console.log("Cargando FFmpeg Core desde:", baseURL);
      
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        // Importante: Forzamos carga secuencial (Single Thread implícito al no cargar worker multihilo)
      });
      
      console.log("FFmpeg cargado exitosamente!");
      setLoaded(true);
    } catch (error) {
      console.error("ERROR FATAL cargando FFmpeg:", error);
    }
  };

  return {
    ffmpeg: ffmpegRef.current,
    loaded,
    load,
  };
};