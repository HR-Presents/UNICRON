import React from 'react';
const paths={
  cube:<><path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7.5 5l9 4v5"/></>,
  grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  chat:<path d="M20 11.5a8 8 0 0 1-8 8H4l1.5-3A8 8 0 1 1 20 11.5zM9 11.5h.01m3 0h.01m3 0h.01"/>,
  lock:<><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v2"/></>,
  chevron:<path d="m6 9 6 6 6-6"/>,
  right:<path d="M5 12h14m-6-6 6 6-6 6"/>,
  play:<path d="m8 5 12 7-12 7z"/>,
  pause:<><path d="M9 5v14m6-14v14"/></>,
  plus:<path d="M12 5v14M5 12h14"/>,
  minus:<path d="M5 12h14"/>,
  focus:<><path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/><circle cx="12" cy="12" r="2"/></>,
  motion:<path d="M2 12h4l2.5-6 4 12 2.5-6H22"/>,
  users:<><circle cx="9" cy="7" r="3"/><path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2m1-16a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5v2"/></>,
  layers:<path d="m12 3 9 5-9 5-9-5zm-9 9 9 5 9-5M3 16l9 5 9-5"/>,
  spark:<><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3zM20 3v4m-2-2h4"/></>,
  history:<><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></>,
  check:<path d="m5 12 4 4 10-10"/>,
  shield:<path d="m12 3 7 3v5c0 4.1-2.9 7.2-7 10-4.1-2.8-7-5.9-7-10V6zm-3 8 2 2 4-4"/>,
  file:<path d="M6 3h8l4 4v14H6zm8 0v5h4M9 13h6m-6 4h6"/>,
  link:<path d="m10 13 4-4m-6 7-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m2 6a3 3 0 0 0 4 0l4-4a3 3 0 0 0-4-4l-1 1"/>,
  download:<path d="M12 3v12m-4-4 4 4 4-4m-11 5v4h14v-4"/>,
  rotate:<path d="M4 11a8 8 0 1 1 1.4 6M4 6v5h5"/>,
  compass:<><circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4z"/></>,
};
export function Icon({name,size=18}) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
