// Stylised anatomy for the Personal body map. viewBox 0 0 200 400, centre line x = 100.
// Each region is drawn for the viewer's LEFT half only; the renderer mirrors it for the right half.
// Ids must match MUSCLE_GROUPS in src/lib/personal/muscle-map.ts.

export const BODY_VIEWBOX = "0 0 200 400";

// Rounded abdominal segment, left half: rows of the "six-pack".
function absRow(y1: number, y2: number): string {
  return `M98 ${y1} H89 Q85 ${y1} 85 ${y1 + 4} V${y2 - 4} Q85 ${y2} 89 ${y2} H98 Z`;
}

// Arm silhouette shared by biceps/triceps and both forearm views.
const UPPER_ARM =
  "M60 101 C56 100 53 102 52 106 C50 120 50 132 52 142 C56 144 60 143 64 141 C66 130 66 112 60 101Z";
const FOREARM =
  "M52 146 C50 160 48 178 46 196 L56 198 C60 184 64 164 65 146 C61 147 56 147 52 146Z";

export const FRONT_REGIONS: Record<string, string[]> = {
  "deltoid-front": ["M70 74 C67 72 64 71 62 72 L60 99 C66 100 72 100 76 99 C72 93 69 84 70 74Z"],
  "deltoid-side": ["M62 72 C57 71 52 74 50 80 C48 88 51 96 56 100 C57 100 59 100 60 99 Z"],
  pectorals: ["M98 70 C90 66 78 68 70 74 C69 84 72 93 76 99 C84 103 94 102 98 100 Z"],
  biceps: [UPPER_ARM],
  "forearms-front": [FOREARM],
  abs: [absRow(104, 118), absRow(121, 135), absRow(138, 152), absRow(155, 170)],
  obliques: ["M76 102 C74 120 75 148 80 170 L84 170 L84 104 C81 103 79 102 76 102Z"],
  "hip-flexors": ["M98 173 C92 172 86 172 80 173 C78 179 78 187 80 193 C86 197 92 198 98 196 Z"],
  quadriceps: [
    "M80 198 C73 214 70 240 73 264 C77 271 86 272 93 268 C91 250 90 228 94 200 C90 199 85 198 80 198Z",
  ],
  adductors: ["M94 200 C90 228 91 250 93 268 L98 270 L98 200Z"],
  tibialis: ["M76 282 C74 300 74 330 78 360 L86 360 C90 330 90 300 90 282 C85 284 80 284 76 282Z"],
};

export const BACK_REGIONS: Record<string, string[]> = {
  trapezius: ["M98 50 C90 54 80 60 70 66 C72 74 80 86 88 100 C92 108 96 120 98 130 Z"],
  "deltoid-rear": [
    "M70 66 C62 65 55 70 53 80 C52 90 55 96 60 99 C65 96 69 88 71 80 C72 74 71 70 70 66Z",
  ],
  triceps: [UPPER_ARM],
  "forearms-back": [FOREARM],
  lats: [
    "M66 102 C70 98 73 92 74 86 C80 96 88 104 91 112 C91 126 90 140 88 152 C84 160 80 166 78 168 C74 150 68 124 66 102Z",
  ],
  "lower-back": ["M98 128 C93 130 90 140 88 152 C86 162 87 170 92 176 L98 178 Z"],
  glutes: ["M98 178 C90 175 80 177 76 185 C73 195 76 207 84 213 C90 215 96 213 98 211 Z"],
  hamstrings: [
    "M76 216 C72 232 71 250 73 266 C78 272 88 272 94 268 C96 250 97 230 98 216 C90 218 82 218 76 216Z",
  ],
  calves: [
    "M75 282 C72 298 73 322 78 340 C80 346 86 348 90 344 C92 330 94 305 91 282 C86 284 80 284 75 282Z",
  ],
};

// Non-interactive anatomy, drawn in a quiet neutral so the map reads as a body.
export const DECOR_CENTER = [
  "M100 10 C108 10 116 18 116 28 C116 40 108 46 100 46 C92 46 84 40 84 28 C84 18 92 10 100 10Z",
  "M93 44 L107 44 L107 58 L93 58Z",
];
export const DECOR_LEFT_FRONT = [
  "M52 140 C56 143 62 142 65 139 L66 148 C61 149 56 149 51 148Z",
  "M74 266 C80 272 88 272 93 268 L92 284 C86 286 80 286 76 284Z",
  "M46 198 C44 208 45 216 49 220 C53 220 56 214 56 200Z",
  "M78 362 C76 372 74 384 76 392 L90 392 C88 380 88 370 86 362Z",
];
export const DECOR_LEFT_BACK = [
  "M52 140 C56 143 62 142 65 139 L66 148 C61 149 56 149 51 148Z",
  "M74 266 C80 272 88 272 93 268 L92 284 C86 286 80 286 76 284Z",
  "M46 198 C44 208 45 216 49 220 C53 220 56 214 56 200Z",
  "M78 342 C79 356 80 368 82 380 L88 380 C90 368 90 356 90 344Z",
  "M78 380 C76 388 76 394 80 396 L90 396 C90 390 89 384 88 380Z",
];

// Fine fibre and striation lines, drawn inside each region at low contrast for anatomical definition.
export const FRONT_LINES: Record<string, string[]> = {
  pectorals: ["M96 76 C88 76 80 79 74 84", "M96 86 C88 87 81 90 77 94"],
  quadriceps: ["M84 204 C80 224 80 246 83 264", "M88 202 C86 226 86 248 88 266"],
  biceps: ["M58 108 C57 120 58 132 60 140"],
  "forearms-front": ["M54 152 C53 166 52 182 51 194"],
  obliques: ["M77 112 L83 116", "M77 126 L83 130", "M78 140 L83 144"],
  tibialis: ["M82 288 C82 312 83 336 84 356"],
};
export const BACK_LINES: Record<string, string[]> = {
  trapezius: ["M96 60 C90 70 90 88 94 110"],
  lats: ["M72 100 C76 118 78 138 80 160", "M80 104 C82 122 84 140 84 152"],
  glutes: ["M96 184 C88 184 82 190 80 200"],
  hamstrings: ["M84 220 C83 238 84 256 86 266", "M90 220 C90 238 90 254 90 264"],
  calves: ["M80 288 C79 306 81 326 84 340"],
  triceps: ["M58 108 C57 120 58 132 60 140"],
  "lower-back": ["M95 140 C93 152 93 164 95 174"],
  "deltoid-rear": ["M62 72 C60 82 60 90 62 96"],
};
