'use client';

import React, { useState } from 'react';

/**
 * Standard Astro Data Types (Math degrees from 0-360 mapped from Swiss Ephemeris)
 */
export interface PlanetaryPosition {
    name: string;
    degree: number;
    sign: string;
}

export interface NatalChartData {
    planets: PlanetaryPosition[];
    houses: number[]; // 12 house cusp degrees
    ascendant: number;
}

interface NatalChartCanvasProps {
    data?: NatalChartData;
    size?: number;
}

// Fallback dummy data if no chart is generated yet
const DUMMY_DATA: NatalChartData = {
    planets: [
        { name: 'Sun', degree: 45, sign: 'Taurus' },
        { name: 'Moon', degree: 180, sign: 'Libra' },
        { name: 'Mercury', degree: 52, sign: 'Taurus' },
        { name: 'Venus', degree: 15, sign: 'Aries' },
        { name: 'Mars', degree: 210, sign: 'Scorpio' },
        { name: 'Jupiter', degree: 330, sign: 'Pisces' },
        { name: 'Saturn', degree: 120, sign: 'Leo' },
    ],
    houses: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
    ascendant: 0,
};

// Zodiac Symbols and Colors mapping
const ZODIAC_SIGNS = [
    { name: 'Aries', symbol: '♈', color: '#FF6B00' },     // Fire
    { name: 'Taurus', symbol: '♉', color: '#10B981' },    // Earth
    { name: 'Gemini', symbol: '♊', color: '#bc13fe' },    // Air
    { name: 'Cancer', symbol: '♋', color: '#00f0ff' },    // Water
    { name: 'Leo', symbol: '♌', color: '#FF6B00' },       // Fire
    { name: 'Virgo', symbol: '♍', color: '#10B981' },     // Earth
    { name: 'Libra', symbol: '♎', color: '#bc13fe' },     // Air
    { name: 'Scorpio', symbol: '♏', color: '#00f0ff' },    // Water
    { name: 'Sagittarius', symbol: '♐', color: '#FF6B00' },// Fire
    { name: 'Capricorn', symbol: '♑', color: '#10B981' }, // Earth
    { name: 'Aquarius', symbol: '♒', color: '#bc13fe' },   // Air
    { name: 'Pisces', symbol: '♓', color: '#00f0ff' },     // Water
];

const PLANET_COLORS: Record<string, string> = {
    'Sun': '#FBBF24',
    'Moon': '#E2E8F0',
    'Mercury': '#A78BFA',
    'Venus': '#F472B6',
    'Mars': '#EF4444',
    'Jupiter': '#34D399',
    'Saturn': '#9CA3AF',
    'Uranus': '#38BDF8',
    'Neptune': '#818CF8',
    'Pluto': '#1E293B',
};

// Trigonometry Helpers
const degreeToRadians = (degree: number) => (degree) * (Math.PI / 180);

const calculateCoordinate = (degree: number, radius: number, centerX: number, centerY: number) => {
    // We subtract from 180 to position 0 degrees (Ascendant) exactly at the left (9 o'clock)
    // and correctly map counter-clockwise
    const adjustedDegree = (180 - degree) % 360;
    const rad = degreeToRadians(adjustedDegree);
    return {
        x: centerX + radius * Math.cos(rad),
        y: centerY + radius * Math.sin(rad)
    };
};

const describeZodiacArc = (x: number, y: number, radius: number, startDegree: number, endDegree: number) => {
    // Path arc generation
    const start = calculateCoordinate(endDegree, radius, x, y);
    const end = calculateCoordinate(startDegree, radius, x, y);
    const largeArcFlag = endDegree - startDegree <= 180 ? "0" : "1";
    return [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
};

export function NatalChartCanvas({ data = DUMMY_DATA, size = 450 }: NatalChartCanvasProps) {
    const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);

    const center = size / 2;
    const outerRadius = (size / 2) * 0.9;
    const innerRadius = outerRadius - 40;
    const houseRadius = innerRadius - 20;

    return (
        <div className="relative w-full aspect-square max-w-[500px] mx-auto flex items-center justify-center">
            {/* Background Base */}
            <div className="absolute inset-0 rounded-full bg-background-dark/50 z-0 shadow-inner" />

            {/* SVG Canvas - Ethereal Chart Engine */}
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${size} ${size}`}
                className="relative z-10 w-full h-full max-w-full drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 0 10px rgba(228, 26, 255, 0.2))' }}
            >
                <defs>
                    <filter id="etherealGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="intenseGlow">
                        <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Layer 1: Zodiac Wheel (12 Segments) */}
                <g className="zodiac-wheel group/wheel">
                    {/* Dark track background */}
                    <circle cx={center} cy={center} r={outerRadius - 20} fill="none" stroke="#15151A" strokeWidth="40" opacity="0.8" />

                    {Array.from({ length: 12 }).map((_, i) => {
                        const startDegree = i * 30;
                        const endDegree = (i + 1) * 30;
                        const midDegree = startDegree + 15;
                        const sign = ZODIAC_SIGNS[i];

                        // Text positioning
                        const textPos = calculateCoordinate(midDegree, outerRadius - 20, center, center);

                        return (
                            <g key={`zodiac-${i}`}>
                                {/* Segment Divider */}
                                <line
                                    x1={calculateCoordinate(startDegree, outerRadius, center, center).x}
                                    y1={calculateCoordinate(startDegree, outerRadius, center, center).y}
                                    x2={calculateCoordinate(startDegree, innerRadius, center, center).x}
                                    y2={calculateCoordinate(startDegree, innerRadius, center, center).y}
                                    stroke="rgba(255,255,255,0.1)" strokeWidth="1"
                                />
                                {/* Colored Outer Arc glowing */}
                                <path
                                    d={describeZodiacArc(center, center, outerRadius, startDegree, endDegree)}
                                    fill="none"
                                    stroke={sign.color}
                                    strokeWidth="2"
                                    opacity="0.3"
                                    filter="url(#etherealGlow)"
                                />
                                {/* Symbol */}
                                <text
                                    x={textPos.x}
                                    y={textPos.y}
                                    fill={sign.color}
                                    fontSize="18"
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                    opacity="0.8"
                                    className="select-none"
                                >
                                    {sign.symbol}
                                </text>
                            </g>
                        );
                    })}
                </g>

                {/* Layer 2: Houses (Neon Fuchsia Lines cutting inward) */}
                <g className="houses">
                    {/* Inner bound circle */}
                    <circle cx={center} cy={center} r={houseRadius} fill="none" stroke="rgba(228, 26, 255, 0.2)" strokeWidth="1" />

                    {data.houses.map((houseDegree, i) => {
                        const { x: startX, y: startY } = calculateCoordinate(houseDegree, innerRadius, center, center);
                        const { x: endX, y: endY } = calculateCoordinate(houseDegree, houseRadius * 0.2, center, center);

                        // Determine mid-point angle for rendering house numbers securely
                        const nextHouse = data.houses[(i + 1) % 12];
                        let diff = nextHouse - houseDegree;
                        if (diff < 0) diff += 360; // handle 360 wraparound
                        const midDegree = houseDegree + (diff / 2);
                        const numPos = calculateCoordinate(midDegree, houseRadius * 0.85, center, center);

                        return (
                            <g key={`house-${i}`}>
                                <line
                                    x1={startX} y1={startY} x2={endX} y2={endY}
                                    stroke="#e41aff" strokeWidth={i === 0 || i === 9 ? "1.5" : "0.5"} // Bold for Ascendant and Midheaven
                                    opacity={i === 0 || i === 9 ? "0.8" : "0.3"}
                                />
                                <text
                                    x={numPos.x} y={numPos.y}
                                    fill="#e41aff"
                                    fontSize="10"
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                    opacity="0.5"
                                    className="select-none font-mono"
                                >
                                    {i + 1}
                                </text>
                            </g>
                        );
                    })}
                </g>

                {/* Layer 3: Aspects (Connecting Lasers inside inner circle) */}
                <g className="aspect-lasers">
                    {data.planets.map((p1, i) => {
                        return data.planets.slice(i + 1).map((p2, j) => {
                            const isHovered = hoveredPlanet === p1.name || hoveredPlanet === p2.name;
                            const isDimmed = hoveredPlanet !== null && !isHovered;

                            const diff = Math.abs(p1.degree - p2.degree);
                            const distance = Math.min(diff, 360 - diff);

                            let aspectColor = null;
                            if (Math.abs(distance - 120) < 8) aspectColor = '#00f0ff';       // Trine (Harmony/Blue)
                            else if (Math.abs(distance - 90) < 8) aspectColor = '#e41aff';  // Square (Tension/Fuchsia)
                            else if (Math.abs(distance - 180) < 8) aspectColor = '#ff0080'; // Opposition (Conflict/Pink)
                            else if (Math.abs(distance - 60) < 8) aspectColor = '#34D399';  // Sextile (Flow/Green)

                            if (aspectColor) {
                                const pos1 = calculateCoordinate(p1.degree, houseRadius * 0.7, center, center);
                                const pos2 = calculateCoordinate(p2.degree, houseRadius * 0.7, center, center);

                                return (
                                    <line
                                        key={`aspect-${i}-${j}`}
                                        x1={pos1.x} y1={pos1.y} x2={pos2.x} y2={pos2.y}
                                        stroke={aspectColor}
                                        strokeWidth={isHovered ? "2.5" : "1"}
                                        opacity={isHovered ? "0.9" : isDimmed ? "0.05" : "0.25"}
                                        filter={isHovered ? "url(#intenseGlow)" : "none"}
                                        className="transition-all duration-300"
                                    />
                                );
                            }
                            return null;
                        });
                    })}
                </g>

                {/* Layer 4: Planets (Glowing Orbs) */}
                <g className="planets">
                    {data.planets.map((planet, i) => {
                        const { x, y } = calculateCoordinate(planet.degree, houseRadius * 0.7, center, center);
                        const isHovered = hoveredPlanet === planet.name;
                        const isDimmed = hoveredPlanet !== null && !isHovered;
                        const color = PLANET_COLORS[planet.name] || '#FFF';

                        return (
                            <g
                                key={`planet-${i}`}
                                onMouseEnter={() => setHoveredPlanet(planet.name)}
                                onMouseLeave={() => setHoveredPlanet(null)}
                                className="cursor-pointer"
                            >
                                {/* Invisible larger hit area for easier hovering */}
                                <circle cx={x} cy={y} r="20" fill="transparent" />

                                {/* Outer Glow */}
                                <circle
                                    cx={x} cy={y}
                                    r={isHovered ? "14" : "10"}
                                    fill={color}
                                    opacity={isDimmed ? "0.1" : isHovered ? "0.6" : "0.3"}
                                    filter={isHovered ? "url(#intenseGlow)" : "url(#etherealGlow)"}
                                    className="transition-all duration-300"
                                />

                                {/* Solid Core */}
                                <circle
                                    cx={x} cy={y}
                                    r={4}
                                    fill="#FFF"
                                    opacity={isDimmed ? "0.3" : "1"}
                                />

                                {/* Planet Name Label */}
                                <text
                                    x={x}
                                    y={y + 20}
                                    fill={isHovered ? "#FFF" : color}
                                    fontSize={isHovered ? "12" : "10"}
                                    fontWeight={isHovered ? "bold" : "normal"}
                                    textAnchor="middle"
                                    opacity={isDimmed ? "0" : isHovered ? "1" : "0.8"}
                                    className="transition-all duration-300 select-none pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                                >
                                    {planet.name}
                                </text>

                                {/* Tooltip background box (only visible on hover) */}
                                {isHovered && (
                                    <g className="pointer-events-none">
                                        <rect
                                            x={x - 50}
                                            y={y - 45}
                                            width="100"
                                            height="30"
                                            rx="6"
                                            fill="#0A0A1F"
                                            stroke={color}
                                            strokeWidth="1"
                                            opacity="0.95"
                                        />
                                        <text x={x} y={y - 25} fill="#FFF" fontSize="10" textAnchor="middle" className="font-medium">
                                            {planet.degree.toFixed(1)}° {planet.sign}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </g>

                {/* Central Core Indicator */}
                <circle cx={center} cy={center} r={4} fill="#e41aff" filter="url(#etherealGlow)" opacity="0.5" />
                <circle cx={center} cy={center} r={1.5} fill="#FFF" />
            </svg>
        </div>
    );
}
