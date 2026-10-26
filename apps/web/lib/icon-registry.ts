// lib/icon-registry.ts — the closed set of icons an admin-editable block may
// point at. The database stores the icon NAME (a string), because a React
// component cannot be serialised; this map is the only place a name becomes a
// component. An unknown name falls back to the school glyph rather than
// rendering nothing.

import type { IconType } from "react-icons";
import {
    FaAward,
    FaBook,
    FaBookOpen,
    FaBullseye,
    FaBus,
    FaCalendarCheck,
    FaChalkboardUser,
    FaDumbbell,
    FaEye,
    FaFlask,
    FaGraduationCap,
    FaHeart,
    FaLaptopCode,
    FaMicroscope,
    FaMoneyBillWave,
    FaMusic,
    FaPersonRunning,
    FaSchool,
    FaStar,
    FaTrophy,
    FaUserCheck,
    FaUserGraduate,
    FaUsers,
    FaUtensils,
} from "react-icons/fa6";

/** Every icon a block may use. Order is the order the admin picker shows. */
export const ICON_NAMES = [
    "FaGraduationCap",
    "FaChalkboardUser",
    "FaBookOpen",
    "FaBook",
    "FaFlask",
    "FaMicroscope",
    "FaLaptopCode",
    "FaTrophy",
    "FaAward",
    "FaStar",
    "FaHeart",
    "FaUsers",
    "FaUserGraduate",
    "FaUserCheck",
    "FaSchool",
    "FaBullseye",
    "FaEye",
    "FaCalendarCheck",
    "FaPersonRunning",
    "FaMusic",
    "FaDumbbell",
    "FaUtensils",
    "FaBus",
    "FaMoneyBillWave",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

const ICONS: Record<IconName, IconType> = {
    FaGraduationCap,
    FaChalkboardUser,
    FaBookOpen,
    FaBook,
    FaFlask,
    FaMicroscope,
    FaLaptopCode,
    FaTrophy,
    FaAward,
    FaStar,
    FaHeart,
    FaUsers,
    FaUserGraduate,
    FaUserCheck,
    FaSchool,
    FaBullseye,
    FaEye,
    FaCalendarCheck,
    FaPersonRunning,
    FaMusic,
    FaDumbbell,
    FaUtensils,
    FaBus,
    FaMoneyBillWave,
};

/** Resolve a stored icon name. Unknown or missing names render the fallback. */
export function resolveIcon(name: unknown): IconType {
    return typeof name === "string" && name in ICONS ? ICONS[name as IconName] : FaSchool;
}
