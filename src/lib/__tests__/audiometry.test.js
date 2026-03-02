import { describe, it, expect } from "vitest";

/* ═════════════════════════════════════════════════════════
   Pure Functions (inlined to avoid "use client" imports)
   ═════════════════════════════════════════════════════════ */

/**
 * Calculate Pure Tone Average (PTA) from ear results
 * Averages thresholds at 500, 1000, 2000, 4000 Hz
 */
function calcPTA(ear) {
    const freqs = [500, 1000, 2000, 4000];
    const vals = freqs.filter(f => ear?.[f] !== undefined).map(f => ear[f]);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/**
 * Classify hearing loss level based on PTA threshold
 */
function classify(avg) {
    if (avg <= 15) return { label: "Bình thường", color: "#10b981", cls: "normal" };
    if (avg <= 25) return { label: "Gần bình thường", color: "#84cc16", cls: "normal" };
    if (avg <= 40) return { label: "Nhẹ", color: "#f59e0b", cls: "mild" };
    if (avg <= 55) return { label: "Trung bình", color: "#f97316", cls: "moderate" };
    if (avg <= 70) return { label: "TB-Nặng", color: "#ef4444", cls: "severe" };
    if (avg <= 90) return { label: "Nặng", color: "#dc2626", cls: "severe" };
    return { label: "Sâu", color: "#9333ea", cls: "profound" };
}

/**
 * Calculate NAL-NL2 hearing aid gain prescriptions
 * Higher gain for lower frequencies, reduces for higher frequencies
 */
function calcNAL_NL2(pta) {
    if (!pta || pta <= 0) return {};
    const gains = {
        250: Math.min(60, Math.max(0, pta * 0.46 + 3.48)),
        500: Math.min(60, Math.max(0, pta * 0.48 + 1.05)),
        1000: Math.min(60, Math.max(0, pta * 0.47 - 0.66)),
        2000: Math.min(60, Math.max(0, pta * 0.46 - 3.33)),
        4000: Math.min(60, Math.max(0, pta * 0.44 - 5.99)),
        8000: Math.min(60, Math.max(0, pta * 0.40 - 6.32)),
    };
    return Object.entries(gains).reduce((acc, [f, g]) => {
        acc[f] = Math.round(g);
        return acc;
    }, {});
}

/**
 * Calculate DSL v5.0 hearing aid gain prescriptions
 * Targets higher gains than NAL-NL2 (more aggressive amplification)
 */
function calcDSL_v5(pta) {
    if (!pta || pta <= 0) return {};
    const gains = {
        250: Math.min(65, Math.max(0, pta * 0.50 + 5.0)),
        500: Math.min(65, Math.max(0, pta * 0.52 + 3.0)),
        1000: Math.min(65, Math.max(0, pta * 0.51 + 0.5)),
        2000: Math.min(65, Math.max(0, pta * 0.50 - 2.0)),
        4000: Math.min(65, Math.max(0, pta * 0.48 - 5.0)),
        8000: Math.min(65, Math.max(0, pta * 0.45 - 6.5)),
    };
    return Object.entries(gains).reduce((acc, [f, g]) => {
        acc[f] = Math.round(g);
        return acc;
    }, {});
}

/* ═════════════════════════════════════════════════════════
   TESTS
   ═════════════════════════════════════════════════════════ */

describe("calcPTA", () => {
    it("should return 0 for empty ear data", () => {
        expect(calcPTA({})).toBe(0);
    });

    it("should return 0 when no relevant frequencies exist", () => {
        expect(calcPTA({ 250: 10, 8000: 15 })).toBe(0);
    });

    it("should average 4 PTA frequencies correctly", () => {
        const result = calcPTA({ 500: 20, 1000: 30, 2000: 40, 4000: 50 });
        expect(result).toBe(35); // (20+30+40+50)/4 = 35
    });

    it("should handle partial frequency data", () => {
        const result = calcPTA({ 500: 10, 1000: 20, 2000: 30 });
        expect(result).toBe(20); // (10+20+30)/3 = 20
    });

    it("should handle normal hearing thresholds", () => {
        const normal = calcPTA({ 500: 5, 1000: 5, 2000: 10, 4000: 10 });
        expect(normal).toBe(7.5); // (5+5+10+10)/4 = 7.5 → rounds to 8
    });

    it("should handle mild hearing loss", () => {
        const mild = calcPTA({ 500: 20, 1000: 25, 2000: 30, 4000: 35 });
        expect(mild).toBe(27.5); // rounds to 28
    });

    it("should handle severe hearing loss", () => {
        const severe = calcPTA({ 500: 60, 1000: 70, 2000: 75, 4000: 80 });
        expect(severe).toBe(71.25); // rounds to 71
    });
});

describe("classify", () => {
    it("should classify normal hearing (≤15 dB)", () => {
        expect(classify(10).cls).toBe("normal");
        expect(classify(15).cls).toBe("normal");
        expect(classify(15).label).toBe("Bình thường");
    });

    it("should classify near-normal hearing (16-25 dB)", () => {
        expect(classify(20).cls).toBe("normal");
        expect(classify(20).label).toBe("Gần bình thường");
    });

    it("should classify mild hearing loss (26-40 dB)", () => {
        expect(classify(30).cls).toBe("mild");
        expect(classify(30).label).toBe("Nhẹ");
    });

    it("should classify moderate hearing loss (41-55 dB)", () => {
        expect(classify(45).cls).toBe("moderate");
        expect(classify(45).label).toBe("Trung bình");
    });

    it("should classify moderate-severe hearing loss (56-70 dB)", () => {
        expect(classify(60).cls).toBe("severe");
        expect(classify(60).label).toBe("TB-Nặng");
    });

    it("should classify severe hearing loss (71-90 dB)", () => {
        expect(classify(80).cls).toBe("severe");
        expect(classify(80).label).toBe("Nặng");
    });

    it("should classify profound hearing loss (>90 dB)", () => {
        expect(classify(100).cls).toBe("profound");
        expect(classify(100).label).toBe("Sâu");
    });

    it("should return correct color codes", () => {
        expect(classify(10).color).toBe("#10b981"); // green for normal
        expect(classify(30).color).toBe("#f59e0b"); // yellow for mild
        expect(classify(75).color).toBe("#dc2626"); // dark red for severe
        expect(classify(100).color).toBe("#9333ea"); // purple for profound
    });
});

describe("calcNAL_NL2", () => {
    it("should return empty object for null/zero PTA", () => {
        expect(calcNAL_NL2(null)).toEqual({});
        expect(calcNAL_NL2(0)).toEqual({});
    });

    it("should provide positive gain for hearing loss", () => {
        const gains = calcNAL_NL2(40);
        Object.values(gains).forEach(g => {
            expect(g).toBeGreaterThan(0);
        });
    });

    it("should clamp gains to [0, 60] dB", () => {
        const gains = calcNAL_NL2(100);
        Object.values(gains).forEach(g => {
            expect(g).toBeGreaterThanOrEqual(0);
            expect(g).toBeLessThanOrEqual(60);
        });
    });

    it("should show higher gain at lower frequencies", () => {
        const gains = calcNAL_NL2(50);
        // 250 and 500 Hz should have more gain than 4000-8000 Hz
        expect(gains[250]).toBeGreaterThan(gains[4000]);
        expect(gains[500]).toBeGreaterThan(gains[8000]);
    });

    it("should calculate correct gains for mild loss", () => {
        const gains = calcNAL_NL2(30);
        expect(gains[500]).toBeGreaterThan(10); // Should be positive
        expect(gains[500]).toBeLessThan(20);
    });

    it("should return integer gain values", () => {
        const gains = calcNAL_NL2(45);
        Object.values(gains).forEach(g => {
            expect(Number.isInteger(g)).toBe(true);
        });
    });
});

describe("calcDSL_v5", () => {
    it("should return empty object for null/zero PTA", () => {
        expect(calcDSL_v5(null)).toEqual({});
        expect(calcDSL_v5(0)).toEqual({});
    });

    it("should provide positive gain for hearing loss", () => {
        const gains = calcDSL_v5(40);
        Object.values(gains).forEach(g => {
            expect(g).toBeGreaterThan(0);
        });
    });

    it("should clamp gains to [0, 65] dB", () => {
        const gains = calcDSL_v5(100);
        Object.values(gains).forEach(g => {
            expect(g).toBeGreaterThanOrEqual(0);
            expect(g).toBeLessThanOrEqual(65);
        });
    });

    it("should provide higher gains than NAL-NL2 for same PTA", () => {
        const pta = 50;
        const nal = calcNAL_NL2(pta);
        const dsl = calcDSL_v5(pta);

        // DSL should generally provide higher targets (more aggressive)
        expect(dsl[500]).toBeGreaterThanOrEqual(nal[500]);
        expect(dsl[1000]).toBeGreaterThanOrEqual(nal[1000]);
    });

    it("should show higher gain at lower frequencies", () => {
        const gains = calcDSL_v5(50);
        expect(gains[250]).toBeGreaterThan(gains[4000]);
        expect(gains[500]).toBeGreaterThan(gains[8000]);
    });

    it("should return integer gain values", () => {
        const gains = calcDSL_v5(45);
        Object.values(gains).forEach(g => {
            expect(Number.isInteger(g)).toBe(true);
        });
    });
});

describe("Integration: calcPTA + classify workflow", () => {
    it("should correctly classify normal hearing from audiogram", () => {
        const right = { 500: 5, 1000: 5, 2000: 10, 4000: 10 };
        const left = { 500: 5, 1000: 5, 2000: 10, 4000: 10 };
        const ptaMax = Math.max(calcPTA(right), calcPTA(left));
        const result = classify(ptaMax);
        expect(result.cls).toBe("normal");
    });

    it("should correctly classify mild hearing loss from audiogram", () => {
        const right = { 500: 25, 1000: 30, 2000: 35, 4000: 40 };
        const left = { 500: 20, 1000: 25, 2000: 30, 4000: 35 };
        const ptaMax = Math.max(calcPTA(right), calcPTA(left));
        const result = classify(ptaMax);
        expect(result.cls).toBe("mild");
    });

    it("should correctly classify moderate-to-severe loss", () => {
        const right = { 500: 50, 1000: 55, 2000: 60, 4000: 65 };
        const left = { 500: 45, 1000: 50, 2000: 55, 4000: 60 };
        const ptaMax = Math.max(calcPTA(right), calcPTA(left));
        const result = classify(ptaMax);
        expect(result.cls).toBe("severe");
    });
});

describe("Integration: Hearing aid prescriptions", () => {
    it("should provide reasonable NAL-NL2 gains for mild-moderate loss", () => {
        const pta = 45;
        const nal = calcNAL_NL2(pta);

        // All frequencies should have gain
        expect(nal[250]).toBeGreaterThan(15);
        expect(nal[500]).toBeGreaterThan(15);
        expect(nal[1000]).toBeGreaterThan(10);

        // Should be within reasonable limits
        expect(nal[250]).toBeLessThan(50);
    });

    it("should provide DSL_v5 gains aggressively for severe loss", () => {
        const pta = 70;
        const dsl = calcDSL_v5(pta);

        // Severe loss needs substantial gain
        expect(dsl[250]).toBeGreaterThan(30);
        expect(dsl[500]).toBeGreaterThan(30);
        expect(dsl[1000]).toBeGreaterThan(25);
    });

    it("should show frequency-dependent gain reduction pattern", () => {
        const pta = 60;
        const nal = calcNAL_NL2(pta);

        // Typical audiometric curve: higher gain at 250Hz, reduces toward 8kHz
        // (with possible dip at mid frequencies)
        expect(nal[250]).toBeGreaterThan(nal[8000]);
    });
});
