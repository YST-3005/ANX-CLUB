"use client";

import dynamic from 'next/dynamic';

// Dynamically import the SPA App component with SSR disabled
const Module1App = dynamic(() => import('@/modules/module1/App'), { ssr: false });

export default function Module1Page() {
  return <Module1App />;
}
