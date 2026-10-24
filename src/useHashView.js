// @ts-check
import { useEffect, useState } from 'react';

/**
 * Which screen is showing, kept in the URL hash (#/mapping) so the back
 * button and shared links work on a static site with no router.
 * @param {string[]} viewIds
 */
export function useHashView(viewIds) {
  const read = () => {
    const id = window.location.hash.replace('#/', '');
    return viewIds.includes(id) ? id : viewIds[0];
  };
  const [view, setView] = useState(read);

  useEffect(() => {
    const onChange = () => setView(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  });

  return view;
}
