import type { IconName } from "@/lib/home-content";

const paths: Record<IconName, string> = {
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8z",
  shield: "M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6l-8-3z",
  check: "M5 12.5 10 17.5 19 7.5",
  video: "M3 7h11v10H3zM14 11l7-4v10l-7-4",
  pin: "M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21zM12 12a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z",
  plus: "M12 5v14M5 12h14",
  calc: "M6 3h12v18H6zM9 7h6M9 11h2M13 11h2M9 15h2M13 15h2",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13",
  lock: "M6 11h12v9H6zM8.500 11V8a3.500 3.500 0 0 1 7 0v3",
  eye: "M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  chat: "M4 5h16v11H9l-5 4z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.500-6 8-6s8 2 8 6",
  users:
    "M9 11a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7zM2 20c0-3.500 3-5.500 7-5.500M17 11a3 3 0 1 0 0-6M15 14.500c4 0 7 2 7 5.500",
  heart:
    "M12 20s-8-4.800-8-11a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 9c0 6.200-8 11-8 11z",
  spark: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
  home: "M4 11 12 4l8 7v9h-5v-6H9v6H4z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  camera: "M3 8h4l2-3h6l2 3h4v12H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};

export default function Icon({
  name,
  size = 22,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
