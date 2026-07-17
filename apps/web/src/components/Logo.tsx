import React from "react";

type LogoProps = {
  /** Overall pixel size of the square emblem. */
  size?: number;
  className?: string;
};

/**
 * NextCaseHQ brand mark: a brass "scales of justice" emblem inside a
 * rounded deep-green shield. Designed for the advocate / law-library palette.
 */
export default function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="NextCaseHQ emblem"
      className={className}
    >
      {/* Shield / emblem background */}
      <rect x="1" y="1" width="38" height="38" rx="10" fill="#0E241B" />
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="10"
        stroke="#C6A253"
        strokeWidth="1.5"
      />

      {/* Scales of justice, drawn in brass gold */}
      <g
        stroke="#E4C77E"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Central column */}
        <path d="M20 9v22" />
        {/* Base */}
        <path d="M14.5 31h11" />
        {/* Beam */}
        <path d="M11 13h18" />
        {/* Left hanger + pan */}
        <path d="M13 13l-2.5 6h5L13 13z" />
        <path d="M9.5 19a3.5 3.5 0 0 0 7 0" />
        {/* Right hanger + pan */}
        <path d="M27 13l-2.5 6h5L27 13z" />
        <path d="M23.5 19a3.5 3.5 0 0 0 7 0" />
      </g>
      {/* Top finial */}
      <circle cx="20" cy="9" r="1.8" fill="#E4C77E" />
    </svg>
  );
}
