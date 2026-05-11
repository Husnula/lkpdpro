const fs = require('fs');

let content = fs.readFileSync('app/page.tsx', 'utf-8');

// 1. Add "use client" and imports
content = content.replace(
  `import React, { useState, useEffect } from 'react';`,
  `"use client";\n\nimport React, { useState, useEffect, useRef } from 'react';\nimport { Swiper, SwiperSlide } from 'swiper/react';\nimport type { Swiper as SwiperType } from 'swiper';\nimport 'swiper/css';`
);

// 2. Remove GoogleGenAI import
content = content.replace(
  `import { GoogleGenAI } from '@google/genai';`,
  ``
);

// 3. Update callGeminiAPI
const apiOldStart = '// Helper: Call Gemini API with Exponential Backoff';
const apiOldEnd = 'export default function App() {';
const apiNew = `// Helper: Call Gemini API using Next.js API Route
const callGeminiAPI = async (userPrompt: string, systemInstruction: string, isJson = false) => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userPrompt, systemInstruction, isJson }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate content');
  }
  
  const data = await response.json();
  return data.result;
};

`;
let startIdx = content.indexOf(apiOldStart);
let endIdx = content.indexOf(apiOldEnd);
if(startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + apiNew + content.substring(endIdx);
}

// 4. Update state logic
content = content.replace(
  `const [step, setStep] = useState(1);`,
  `const [step, setStep] = useState(1);\n  const swiperRef = useRef<SwiperType | null>(null);\n\n  const goToStep = (newStep: number) => {\n    setStep(newStep);\n    if (swiperRef.current) {\n      swiperRef.current.slideTo(newStep - 1);\n    }\n    window.scrollTo(0, 0);\n  };`
);

content = content.replace(/setStep\(2\)/g, 'goToStep(2)');
content = content.replace(/setStep\(3\)/g, 'goToStep(3)');
content = content.replace(/setStep\(1\)/g, 'goToStep(1)');
content = content.replace(/setStep\(\(prev\) => prev - 1\)/g, 'goToStep(step - 1)');
content = content.replace(/window\.scrollTo\(0, 0\);/g, '');


// 5. Transform STEPs to Swiper
// Replace step 1 wrapper
const step1Start = `{/* STEP 1 */}\n              {step === 1 && (\n`;
const step1End = `  )}\n\n              {/* STEP 2 */}`;

const rep1_Start = `<Swiper
                onSwiper={(swiper) => (swiperRef.current = swiper)}
                onSlideChange={(swiper) => setStep(swiper.activeIndex + 1)}
                allowTouchMove={false}
                autoHeight={true}
                className="w-full"
              >
                <SwiperSlide>\n              {/* STEP 1 */}\n              `;
const rep1_End = `              </SwiperSlide>\n\n              {/* STEP 2 */}`;

content = content.replace(step1Start, rep1_Start);
content = content.replace(step1End, rep1_End);

// Replace step 2 wrapper
const step2Start = `{/* STEP 2 */}\n              {step === 2 && (\n`;
const step2End = `  )}\n\n              {/* STEP 3 */}`;
const rep2_Start = `              <SwiperSlide>\n              {/* STEP 2 */}\n              `;
const rep2_End = `              </SwiperSlide>\n\n              {/* STEP 3 */}`;

content = content.replace(step2Start, rep2_Start);
content = content.replace(step2End, rep2_End);

// Replace step 3 wrapper
const step3Start = `{/* STEP 3 */}\n              {step === 3 && (\n`;
const rep3_Start = `              <SwiperSlide>\n              {/* STEP 3 */}\n              `;
content = content.replace(step3Start, rep3_Start);

// At the end of step 3, we have:
//               )}
// 
//             </div>
//           </div>
//         </main>
// We need to replace `)}` with `</SwiperSlide>\n              </Swiper>`
const step3End = `              )}\n\n            </div>\n          </div>\n        </main>`;
const rep3_End = `              </SwiperSlide>\n              </Swiper>\n\n            </div>\n          </div>\n        </main>`;
content = content.replace(step3End, rep3_End);


fs.writeFileSync('app/page.tsx', content);
