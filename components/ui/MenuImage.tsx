"use client";

// Reusable image component for menu product and category images.
//
// Responsibilities:
//  - Serves images directly from Supabase Storage via unoptimized next/image.
//  - Renders the caller-supplied `fallback` when src is empty or the remote
//    image fails to load (onError).
//  - Supports both fill-layout (fill + sizes) and fixed-size (width + height).
//  - Is a Client Component so it can hold the error state; safe to import from
//    Server Components (Next.js handles the boundary automatically).

import Image from "next/image";
import { useState } from "react";

interface BaseProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
  /** Rendered when src is falsy or the remote image errors. */
  fallback?: React.ReactNode;
}

interface FillProps extends BaseProps {
  fill: true;
  sizes: string;
  width?: never;
  height?: never;
}

interface FixedProps extends BaseProps {
  fill?: never;
  width: number;
  height: number;
  sizes?: never;
}

type MenuImageProps = FillProps | FixedProps;

export default function MenuImage(props: MenuImageProps) {
  const { src, alt, className, style, loading = "lazy", fallback = null } =
    props;

  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return <>{fallback}</>;
  }

  if (props.fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={props.sizes}
        className={className}
        style={style}
        loading={loading}
        unoptimized
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={props.width}
      height={props.height}
      className={className}
      style={style}
      loading={loading}
      unoptimized
      onError={() => setErrored(true)}
    />
  );
}
