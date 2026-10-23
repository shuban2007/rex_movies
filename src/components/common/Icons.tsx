import type { SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number;
}

export interface HeartIconProps extends IconProps {
  filled?: boolean;
}

/**
 * Premium Home Icon from SVGS/house-line-svgrepo-com.svg
 */
export function HomeIcon({
  size = 24,
  strokeWidth = 2,
  className = '',
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M9 16.9999H15M3 14.5999V12.1301C3 10.9814 3 10.407 3.14805 9.87807C3.2792 9.40953 3.49473 8.96886 3.78405 8.57768C4.11067 8.13608 4.56404 7.78346 5.47078 7.07822L8.07078 5.056C9.47608 3.96298 10.1787 3.41648 10.9546 3.2064C11.6392 3.02104 12.3608 3.02104 13.0454 3.2064C13.8213 3.41648 14.5239 3.96299 15.9292 5.056L18.5292 7.07822C19.436 7.78346 19.8893 8.13608 20.2159 8.57768C20.5053 8.96886 20.7208 9.40953 20.8519 9.87807C21 10.407 21 10.9814 21 12.1301V14.5999C21 16.8401 21 17.9603 20.564 18.8159C20.1805 19.5685 19.5686 20.1805 18.816 20.564C17.9603 20.9999 16.8402 20.9999 14.6 20.9999H9.4C7.15979 20.9999 6.03969 20.9999 5.18404 20.564C4.43139 20.1805 3.81947 19.5685 3.43597 18.8159C3 17.9603 3 16.8401 3 14.5999Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Premium Search Icon from SVGS/search-alt-2-svgrepo-com.svg
 */
export function SearchIcon({
  size = 24,
  strokeWidth = 2,
  className = '',
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M11 6C13.7614 6 16 8.23858 16 11M16.6588 16.6549L21 21M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Premium Heart Icon from SVGS/heart-svgrepo-com.svg
 * For liked/active state: filled in red (#e50914) inside the heart.
 */
export function HeartIcon({
  size = 24,
  filled = false,
  strokeWidth = 1.6,
  className = '',
  fill,
  stroke,
  ...props
}: HeartIconProps) {
  const heartFill = fill ?? (filled ? '#e50914' : 'none');
  const heartStroke = stroke ?? (filled ? '#e50914' : 'currentColor');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -0.5 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.4997 18.9911L9.5767 15.9911L6.6767 12.9911C5.10777 11.3331 5.10777 8.73809 6.6767 7.08009C7.44494 6.34175 8.48548 5.95591 9.54937 6.01489C10.6133 6.07387 11.6048 6.57236 12.2867 7.39109L12.4997 7.60009L12.7107 7.38209C13.3926 6.56336 14.3841 6.06487 15.448 6.00589C16.5119 5.94691 17.5525 6.33275 18.3207 7.07109C19.8896 8.72909 19.8896 11.3241 18.3207 12.9821L15.4207 15.9821L12.4997 18.9911Z"
        fill={heartFill}
        stroke={heartStroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Premium Download Icon from SVGS/download-03-svgrepo-com.svg
 */
export function DownloadIcon({
  size = 24,
  strokeWidth = 2,
  className = '',
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M8 12L12 16M12 16L16 12M12 16V8M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Premium History Icon from SVGS/history-svgrepo-com.svg
 */
export function HistoryIcon({
  size = 24,
  strokeWidth = 2,
  className = '',
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M5.52786 16.7023C6.6602 18.2608 8.3169 19.3584 10.1936 19.7934C12.0703 20.2284 14.0409 19.9716 15.7434 19.0701C17.446 18.1687 18.766 16.6832 19.4611 14.8865C20.1562 13.0898 20.1796 11.1027 19.527 9.29011C18.8745 7.47756 17.5898 5.96135 15.909 5.02005C14.2282 4.07875 12.2641 3.77558 10.3777 4.16623C8.49129 4.55689 6.80919 5.61514 5.64045 7.14656C4.47171 8.67797 3.89482 10.5797 4.01579 12.5023M4.01579 12.5023L2.51579 11.0023M4.01579 12.5023L5.51579 11.0023"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8V12L15 15"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Premium 3D Isometric Dice Icon matching user's reference
 */
export function DiceIcon({
  size = 24,
  className = '',
  fill = '#FFFFFF',
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 74 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Top Face with 1 pip cutout */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M36 1.5 C37.5 1.5 38.5 2 40 2.8 L68 15 C70 16 70.5 17.5 69.5 18.8 L40 31.2 C38 32 35 32 33 31.2 L4.5 18.8 C3.5 17.5 4 16 6 15 L32 2.8 C33.5 2 34.5 1.5 36 1.5 Z M36.5 13.3 C39.54 13.3 42 14.73 42 16.5 C42 18.27 39.54 19.7 36.5 19.7 C33.46 19.7 31 18.27 31 16.5 C31 14.73 33.46 13.3 36.5 13.3 Z"
        fill={fill}
      />
      {/* Left Face with 5 pips cutout */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.5 22.5 C1.5 21 2.8 20.5 4 21.2 L31.5 35.5 C32.8 36.2 33.5 37.2 33.5 38.8 L33.5 71.5 C33.5 73.5 32 74.5 30.5 73.8 L3.5 60 C2.2 59.2 1.5 57.8 1.5 56 Z M9 32.3 C10.77 32.3 12.2 33.73 12.2 35.5 C12.2 37.27 10.77 38.7 9 38.7 C7.23 38.7 5.8 37.27 5.8 35.5 C5.8 33.73 7.23 32.3 9 32.3 Z M24.5 40.3 C26.27 40.3 27.7 41.73 27.7 43.5 C27.7 45.27 26.27 46.7 24.5 46.7 C22.73 46.7 21.3 45.27 21.3 43.5 C21.3 41.73 22.73 40.3 24.5 40.3 Z M16.5 44.4 C18.27 44.4 19.7 45.83 19.7 47.6 C19.7 49.37 18.27 50.8 16.5 50.8 C14.73 50.8 13.3 49.37 13.3 47.6 C13.3 45.83 14.73 44.4 16.5 44.4 Z M9 49.3 C10.77 49.3 12.2 50.73 12.2 52.5 C12.2 54.27 10.77 55.7 9 55.7 C7.23 55.7 5.8 54.27 5.8 52.5 C5.8 50.73 7.23 49.3 9 49.3 Z M24.5 57.3 C26.27 57.3 27.7 58.73 27.7 60.5 C27.7 62.27 26.27 63.7 24.5 63.7 C22.73 63.7 21.3 62.27 21.3 60.5 C21.3 58.73 22.73 57.3 24.5 57.3 Z"
        fill={fill}
      />
      {/* Right Face with 4 pips cutout */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M72.5 22.5 C72.5 21 71.2 20.5 70 21.2 L42.5 35.5 C41.2 36.2 40.5 37.2 40.5 38.8 L40.5 71.5 C40.5 73.5 42 74.5 43.5 73.8 L70.5 60 C71.8 59.2 72.5 57.8 72.5 56 Z M48.5 40.3 C50.27 40.3 51.7 41.73 51.7 43.5 C51.7 45.27 50.27 46.7 48.5 46.7 C46.73 46.7 45.3 45.27 45.3 43.5 C45.3 41.73 46.73 40.3 48.5 40.3 Z M64 32.3 C65.77 32.3 67.2 33.73 67.2 35.5 C67.2 37.27 65.77 38.7 64 38.7 C62.23 38.7 60.8 37.27 60.8 35.5 C60.8 33.73 62.23 32.3 64 32.3 Z M48.5 57.3 C50.27 57.3 51.7 58.73 51.7 60.5 C51.7 62.27 50.27 63.7 48.5 63.7 C46.73 63.7 45.3 62.27 45.3 60.5 C45.3 58.73 46.73 57.3 48.5 57.3 Z M64 49.3 C65.77 49.3 67.2 50.73 67.2 52.5 C67.2 54.27 65.77 55.7 64 55.7 C62.23 55.7 60.8 54.27 60.8 52.5 C60.8 50.73 62.23 49.3 64 49.3 Z"
        fill={fill}
      />
    </svg>
  );
}
