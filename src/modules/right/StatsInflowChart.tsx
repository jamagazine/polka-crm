import { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import { getMastersInflowData, DrillDownTarget } from './statsHelper';
import { CalendarViewMode, DateRange } from '../../core/store/rightSlice';
import { Master } from '../../api/client';

interface Props {
    masters: Master[];
    viewYear: number;
    viewMonth: number;
    mode: CalendarViewMode;
    dateRange: DateRange;
    rangeText: string;
    onDrillDown: (mode: CalendarViewMode, start: Date, end: Date) => void;
    onDrillUp: () => void;
}

export function StatsInflowChart({ masters, viewYear, viewMonth, mode, dateRange, rangeText, onDrillDown, onDrillUp }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 280, height: 150 });
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setDimensions({ width, height });
                }
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const data = useMemo(() => {
        return getMastersInflowData(masters, viewYear, viewMonth, mode, dateRange);
    }, [masters, viewYear, viewMonth, mode, dateRange]);

    const realMax = useMemo(() => {
        if (!data.length) return 0;
        return Math.max(...data.map(d => d.value));
    }, [data]);

    // Force maxVal to be at least 5 to prevent extreme stretching for single values
    const maxVal = Math.max(5, realMax);
    const totalMasters = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

    // Determining if we can go "UP"
    // We can go UP if we are NOT at the year level without date range restrictions
    const canGoUp = mode !== 'year' || dateRange.start !== null;

    if (data.length === 0) return null;

    const paddingLeft = 24;
    const paddingRight = 10;
    const paddingTop = 20;
    const paddingBottom = 40;

    const { width, height } = dimensions;
    const chartWidth = Math.max(width - paddingLeft - paddingRight, 10);
    const chartHeight = Math.max(height - paddingTop - paddingBottom, 10);

    const isYearMode = mode === 'year';

    // Calculation for X positions
    const getXPosition = (index: number) => {
        let barSpacing = 4;
        if (data.length <= 5) barSpacing = 16;
        else if (data.length === 12) barSpacing = 8;
        else if (data.length === 7) barSpacing = 12;

        const availableWidth = chartWidth - (data.length - 1) * barSpacing;
        let itemWidth = Math.max(availableWidth / data.length, 4);

        const totalContentWidth = data.length * itemWidth + (data.length - 1) * barSpacing;
        const startX = paddingLeft + (chartWidth - totalContentWidth) / 2;

        return {
            x: startX + index * (itemWidth + barSpacing),
            itemWidth
        };
    };

    const points = data.map((d, i) => {
        const { x, itemWidth } = getXPosition(i);
        const centerX = x + itemWidth / 2;
        const barH = (d.value / maxVal) * chartHeight;
        const y = paddingTop + chartHeight - barH;
        return { x, itemWidth, centerX, y, value: d.value, label: d.label, fullDateLabel: d.fullDateLabel, target: d.target, isActive: d.isActive };
    });

    const handleItemClick = (target?: DrillDownTarget) => {
        if (target) {
            onDrillDown(target.mode, target.rangeStart, target.rangeEnd);
        }
    };

    return (
        <div className="flex flex-col flex-1 w-full h-full pb-2">
            {/* Header: 2 rows (Select/Up Button + Period Text) */}
            <div className="flex flex-col gap-0.5 px-3 pt-3 pb-2 shrink-0">
                {/* Row 1: Select & Button */}
                <div className="flex items-center justify-between w-full">
                    <select
                        className="text-[11px] font-bold uppercase text-foreground bg-transparent border-none outline-none cursor-pointer hover:bg-muted/10 rounded px-1 -ml-1 transition-colors shrink-0"
                        defaultValue="inflow"
                    >
                        <option value="inflow">Приток мастеров</option>
                    </select>

                    {canGoUp && (
                        <button
                            onClick={onDrillUp}
                            className="text-muted-foreground hover:bg-black/5 rounded p-1 transition-colors shrink-0 border border-border/50 bg-white shadow-sm"
                            title="Наверх"
                        >
                            <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Row 2: Range Text */}
                <div className="text-[10px] text-muted-foreground pl-1 truncate" title={rangeText}>
                    {rangeText}
                </div>
            </div>

            {/* SVG Chart */}
            <div ref={containerRef} className="flex-1 w-full relative min-h-[120px] px-1 pointer-events-none">
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${width} ${height}`}
                    className="absolute inset-0 text-primary overflow-visible pointer-events-auto"
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if (canGoUp) onDrillUp();
                    }}
                >
                    {/* Y Axis */}
                    <path
                        d={`M ${paddingLeft} ${paddingTop} L ${paddingLeft} ${paddingTop + chartHeight} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight}`}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity={0.2}
                        strokeWidth={1}
                    />

                    {/* Y Labels */}
                    <text
                        x={paddingLeft - 4}
                        y={paddingTop + 4}
                        fontSize="9"
                        fill="currentColor"
                        className="text-muted-foreground opacity-60"
                        textAnchor="end"
                    >
                        {maxVal}
                    </text>
                    <text
                        x={paddingLeft - 4}
                        y={paddingTop + chartHeight}
                        fontSize="9"
                        fill="currentColor"
                        className="text-muted-foreground opacity-60"
                        textAnchor="end"
                    >
                        0
                    </text>

                    {/* Render Line Chart for Year Mode */}
                    {isYearMode && (
                        <>
                            {/* Quarter Backgrounds for Drill-Down */}
                            {[0, 1, 2, 3].map((q) => {
                                let qX = paddingLeft;
                                if (q > 0) {
                                    const prevLast = points[q * 3 - 1].centerX;
                                    const thisFirst = points[q * 3].centerX;
                                    qX = (prevLast + thisFirst) / 2;
                                }

                                let qEnd = paddingLeft + chartWidth;
                                if (q < 3) {
                                    const thisLast = points[q * 3 + 2].centerX;
                                    const nextFirst = points[q * 3 + 3].centerX;
                                    qEnd = (thisLast + nextFirst) / 2;
                                }

                                const qWidth = Math.max(0, qEnd - qX);
                                const qStartMonth = q * 3;

                                const start = new Date(viewYear, qStartMonth, 1);
                                const end = new Date(viewYear, qStartMonth + 3, 0);

                                return (
                                    <rect
                                        key={`quarter-bg-${q}`}
                                        x={qX}
                                        y={paddingTop}
                                        width={qWidth}
                                        height={chartHeight}
                                        className="fill-transparent hover:fill-primary/5 cursor-pointer transition-colors"
                                        onClick={() => onDrillDown('quarter', start, end)}
                                    >
                                        <title>{['I', 'II', 'III', 'IV'][q]} кв. {viewYear}г.</title>
                                    </rect>
                                );
                            })}

                            {/* Dotted lines separating quarters */}
                            {[1, 2, 3].map((divider) => {
                                const p1 = points[divider * 3 - 1].centerX;
                                const p2 = points[divider * 3].centerX;
                                const lineX = (p1 + p2) / 2;

                                return (
                                    <line
                                        key={`q-divider-${divider}`}
                                        x1={lineX}
                                        y1={paddingTop}
                                        x2={lineX}
                                        y2={paddingTop + chartHeight}
                                        stroke="currentColor"
                                        strokeWidth="1"
                                        strokeDasharray="2,2"
                                        className="opacity-20 pointer-events-none"
                                    />
                                );
                            })}

                            <polyline
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={points.map(p => `${p.centerX},${p.y}`).join(' ')}
                                className="opacity-70 pointer-events-none"
                            />
                            {points.map((p, i) => (
                                <g
                                    key={`point-${i}`}
                                    onClick={() => handleItemClick(p.target)}
                                    className="cursor-pointer group"
                                    onMouseEnter={() => setHoveredPoint(i)}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                >
                                    <circle
                                        cx={p.centerX}
                                        cy={p.y}
                                        r="4"
                                        fill="currentColor"
                                        className="transition-all duration-200 group-hover:r-5 group-hover:opacity-100 opacity-90"
                                    />
                                    {/* Transparent larger circle for easier clicking */}
                                    <circle
                                        cx={p.centerX}
                                        cy={p.y}
                                        r="12"
                                        fill="transparent"
                                    />

                                    {/* Value Text above circle */}
                                    {p.value > 0 && (
                                        <text
                                            x={p.centerX}
                                            y={p.y - 8}
                                            fontSize="8"
                                            fontWeight="bold"
                                            fill="currentColor"
                                            textAnchor="middle"
                                            className="pointer-events-none"
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeLinejoin="round"
                                            paintOrder="stroke"
                                        >
                                            {p.value}
                                        </text>
                                    )}

                                    {hoveredPoint === i && (
                                        <g className="pointer-events-none z-10">
                                            <rect
                                                x={p.centerX - 35}
                                                y={p.y - 45}
                                                width="70"
                                                height="20"
                                                fill="#222"
                                                rx="4"
                                            />
                                            <text
                                                x={p.centerX}
                                                y={p.y - 31}
                                                fill="#fff"
                                                fontSize="9"
                                                textAnchor="middle"
                                                className="font-medium"
                                            >
                                                {p.fullDateLabel ? `${p.value} (${p.fullDateLabel})` : p.value}
                                            </text>
                                        </g>
                                    )}
                                </g>
                            ))}
                        </>
                    )}

                    {/* Render Bar Chart for other Modes */}
                    {!isYearMode && points.map((p, i) => {
                        const isAnyActive = points.some(point => point.isActive);
                        const isFaded = isAnyActive && !p.isActive;

                        return (
                            <g
                                key={`bar-${i}`}
                                onClick={() => handleItemClick(p.target)}
                                className={cn(p.target && "cursor-pointer group")}
                            >
                                {/* Track */}
                                <rect
                                    x={p.x}
                                    y={paddingTop}
                                    width={p.itemWidth}
                                    height={chartHeight}
                                    className={cn(
                                        "transition-colors duration-200",
                                        p.isActive
                                            ? "fill-muted/60"
                                            : (isFaded ? "fill-muted/5" : "fill-muted/20"),
                                        p.target && !p.isActive && "group-hover:fill-muted/40"
                                    )}
                                    rx="2"
                                />
                                {/* Fill */}
                                {p.value > 0 && (
                                    <rect
                                        x={p.x}
                                        y={p.y}
                                        width={p.itemWidth}
                                        height={paddingTop + chartHeight - p.y}
                                        fill="currentColor"
                                        rx="2"
                                        className={cn(
                                            "transition-all duration-300",
                                            isFaded ? "opacity-30" : (p.target ? "opacity-90 group-hover:opacity-100" : "opacity-100")
                                        )}
                                    />
                                )}
                                {/* Value Header */}
                                {p.value > 0 && (
                                    <text
                                        x={p.centerX}
                                        y={p.y - 4}
                                        fontSize="9"
                                        fill="currentColor"
                                        textAnchor="middle"
                                        className={cn(
                                            "font-bold pointer-events-none stroke-white",
                                            isFaded && "opacity-50"
                                        )}
                                        strokeWidth="3"
                                        strokeLinejoin="round"
                                        paintOrder="stroke"
                                    >
                                        {p.value}
                                    </text>
                                )}
                            </g>
                        )
                    })}

                    {/* X Axis Labels (Shared for both charts) */}
                    {points.map((p, i) => {
                        const isQtr = mode === 'quarter';

                        return (
                            <g key={`label-${i}`} transform={`translate(${p.centerX}, ${paddingTop + chartHeight + (isYearMode ? 8 : 12)})`}>
                                <text
                                    x={0}
                                    y={0}
                                    fontSize={isQtr ? "10" : "9"}
                                    fill="currentColor"
                                    className="text-muted-foreground font-medium pointer-events-none"
                                    textAnchor={isYearMode ? "end" : "middle"}
                                    alignmentBaseline="middle"
                                    transform={isYearMode ? "rotate(-90)" : ""}
                                >
                                    {p.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Summary Footer */}
            <div className="flex items-center justify-center shrink-0 h-[24px] mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                Итого: {totalMasters} {totalMasters === 1 ? 'мастер' : (totalMasters > 1 && totalMasters < 5) ? 'мастера' : 'мастеров'}
            </div>
        </div>
    );
}
