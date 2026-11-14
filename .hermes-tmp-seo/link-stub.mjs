import React from 'react';
export default function Link({ href, className, children }) {
  return React.createElement('a', { href, className }, children);
}
