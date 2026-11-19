// Stylised anatomy for the Personal body map (v2). viewBox 0 0 200 400, centre line x = 100.
// Every region is drawn for the viewer's LEFT half only; the renderer mirrors it for the right half.
// Ids must match MUSCLE_GROUPS in src/lib/personal/muscle-map.ts.

export const BODY_VIEWBOX = "0 0 200 400";

// Rounded abdominal segment, left half. Rows taper toward the waist like a real rectus abdominis.
function absRow(y1: number, y2: number, x: number): string {
  return `M98.5 ${y1} H${x + 3} Q${x} ${y1} ${x} ${y1 + 3} V${y2 - 3} Q${x} ${y2} ${x + 3} ${y2} H98.5 Z`;
}

const UPPER_ARM =
  "M58 116 C54 118 51 126 51 138 C51 148 53 156 56 162 C60 164 64 162 66 158 C68 148 68 134 66 124 C64 118 61 116 58 116Z";
const FOREARM =
  "M54 168 C50 182 47 200 45 218 L55 222 C59 208 63 190 64 170 C60 172 57 172 54 168Z";

export const FRONT_REGIONS: Record<string, string[]> = {
  neck: ["M92 52 C90 58 91 64 95 72 L99 76 L99 58 C96 57 93 55 92 52Z"],
  "deltoid-front": ["M72 83 C69 79 64 77 60 77 L58 113 C62 115 67 114 70 108 C71 99 72 91 72 83Z"],
  "deltoid-side": ["M60 77 C55 77 51 82 50 90 C49 99 51 108 54 113 C56 114 57 114 58 113 L60 77Z"],
  pectorals: [
    "M99 85 C94 81 88 80 82 81 C77 82 74 84 72 87 C71 96 73 106 78 114 C84 120 92 122 99 120 Z",
  ],
  serratus: [
    "M74 112 L82 116 L80 123 L72 119Z",
    "M73 122 L81 126 L79 133 L72 129Z",
    "M73 132 L80 136 L79 142 L73 139Z",
  ],
  biceps: [UPPER_ARM],
  "forearms-front": [FOREARM],
  abs: [absRow(126, 141, 86), absRow(144, 159, 87), absRow(162, 177, 88), absRow(180, 194, 90)],
  obliques: ["M74 144 C72 158 73 174 78 192 L85 196 L84 146 C80 146 77 145 74 144Z"],
  "hip-flexors": ["M99 198 C92 196 84 197 78 201 C76 207 78 213 84 217 C90 219 95 217 99 214Z"],
  quadriceps: [
    "M80 218 C72 232 69 262 72 290 C77 298 88 298 94 292 C93 268 93 240 97 224 C92 222 86 220 80 218Z",
  ],
  adductors: ["M97 224 C93 240 93 268 94 292 L100 298 L100 224Z"],
  tibialis: ["M76 308 C74 326 75 348 78 370 L86 370 C89 348 90 326 90 308 C85 311 80 311 76 308Z"],
};

export const BACK_REGIONS: Record<string, string[]> = {
  trapezius: [
    "M99 54 C92 58 82 62 72 68 C66 72 62 76 60 80 C64 86 72 92 82 96 C90 98 96 100 99 100Z",
  ],
  "deltoid-rear": [
    "M72 82 C66 76 58 76 54 82 C51 90 52 102 57 110 C62 112 68 108 71 100 C73 94 73 88 72 82Z",
  ],
  // Outer edge is the exact inner edge of the lats, so no gap is left between them.
  rhomboids: ["M99 100 C92 100 86 98 78 94 C77 104 80 112 86 120 C92 126 96 130 97 134 L99 136Z"],
  triceps: [UPPER_ARM],
  "forearms-back": [FOREARM],
  lats: [
    "M66 104 C70 100 74 96 78 94 C77 104 80 112 86 120 C92 126 96 130 97 134 C95 148 91 164 87 178 C84 184 79 184 76 178 C70 152 67 126 66 104Z",
  ],
  "lower-back": ["M99 134 C94 136 91 146 90 158 C89 168 92 176 97 182 L99 184Z"],
  "hip-abductors": ["M72 176 C67 182 65 192 67 204 C71 206 75 202 77 196 C78 188 77 181 72 176Z"],
  glutes: ["M99 186 C92 183 82 184 77 190 C73 198 74 210 80 216 C87 220 94 218 99 214 Z"],
  hamstrings: [
    "M76 220 C72 238 71 258 73 288 C78 296 88 296 94 290 C96 262 97 240 98 222 C90 224 82 224 76 220Z",
  ],
  calves: [
    "M76 304 C72 318 73 336 78 348 C81 352 86 352 90 348 C93 336 94 318 91 304 C86 307 81 307 76 304Z",
  ],
  soleus: ["M78 350 C79 358 80 366 82 372 L88 372 C89 364 90 356 90 350 C86 353 82 353 78 350Z"],
};

// Non-interactive anatomy, drawn in a quiet neutral so the map reads as a body.
export const DECOR_CENTER = [
  "M100 8 C110 8 117 15 117 27 C117 40 110 52 100 52 C90 52 83 40 83 27 C83 15 90 8 100 8Z",
  "M93 46 L107 46 L107 62 L93 62Z",
];
const JOINTS = ["M52 160 C57 164 63 163 66 158 L65 171 C60 173 55 173 53 170Z"];
export const DECOR_LEFT_FRONT = [
  ...JOINTS,
  "M92 66 C84 70 72 74 62 78 L72 84 C78 80 88 76 99 76Z",
  "M45 224 C43 234 44 242 48 246 C53 246 56 238 55 226Z",
  "M76 296 C78 301 86 301 90 296 C89 306 87 308 83 308 C79 308 77 306 76 296Z",
  "M78 372 C76 382 75 390 78 394 L92 394 C90 386 89 378 88 372Z",
];
export const DECOR_LEFT_BACK = [
  ...JOINTS,
  "M45 224 C43 234 44 242 48 246 C53 246 56 238 55 226Z",
  "M76 292 C80 298 88 298 94 292 L93 304 C88 307 80 307 77 304Z",
  "M78 372 C79 380 80 388 82 394 L90 394 C90 386 89 378 88 372Z",
];

// Fine fibre and striation lines, drawn inside each region at low contrast for anatomical definition.
export const FRONT_LINES: Record<string, string[]> = {
  pectorals: [
    "M96 88 C88 88 80 90 75 94",
    "M96 98 C88 99 81 102 77 106",
    "M96 108 C90 110 84 113 80 115",
  ],
  quadriceps: ["M84 222 C79 240 79 262 82 288", "M89 222 C86 244 86 266 88 290"],
  biceps: ["M58 120 C57 132 58 146 60 158"],
  "forearms-front": ["M55 172 C54 188 52 204 50 216"],
  obliques: ["M77 150 L83 154", "M77 164 L83 168", "M78 178 L83 182"],
  tibialis: ["M82 314 C82 332 83 350 84 366"],
  "deltoid-front": ["M66 82 C65 94 64 104 64 112"],
  neck: ["M94 58 C94 64 96 69 98 73"],
};
export const BACK_LINES: Record<string, string[]> = {
  trapezius: ["M96 60 C90 70 90 84 96 98"],
  lats: ["M72 104 C76 120 78 140 80 162", "M80 110 C84 128 86 146 84 162"],
  glutes: ["M96 192 C88 192 82 198 80 208"],
  hamstrings: ["M84 226 C83 244 84 264 86 288", "M90 226 C90 244 90 262 90 286"],
  calves: ["M80 310 C79 322 81 336 84 346"],
  triceps: ["M58 120 C57 132 58 146 60 158"],
  "lower-back": ["M95 142 C93 154 93 168 95 178"],
  "deltoid-rear": ["M62 80 C60 88 60 98 62 106"],
};

// Whole-body anatomical landmarks (not muscles): collarbone, midline, rib hints, navel.
export const FRONT_LANDMARKS = [
  "M99 78 C90 77 80 77 70 80",
  "M99 126 L99 196",
  "M84 122 C88 124 94 125 98 124",
];
export const BACK_LANDMARKS = ["M99 56 L99 184", "M62 80 C68 86 74 92 80 96"];
