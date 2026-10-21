import { Bricolage_Grotesque, Host_Grotesk } from 'next/font/google';

export const display = Bricolage_Grotesque({
  subsets: ['latin'],
  axes: ['opsz', 'wdth'],
  variable: '--font-display',
  display: 'swap',
});

export const text = Host_Grotesk({
  subsets: ['latin'],
  variable: '--font-text',
  display: 'swap',
});
