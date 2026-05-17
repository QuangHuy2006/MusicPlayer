import { Capacitor } from '@capacitor/core';

const defaultUrl = 'https://apimusic.werchat.io.vn';
const androidUrl = 'https://apimusic.werchat.io.vn';

export const API_BASE = import.meta.env.VITE_API_URL || (Capacitor.getPlatform() === 'android' ? androidUrl : defaultUrl);