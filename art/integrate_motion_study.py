"""Integrate chosen small study into an isolated local copy, never public/."""
from pathlib import Path
import shutil,json

root=Path(__file__).resolve().parent.parent
lab=Path('C:/Users/kryst/Desktop/CingyTech-motion-lab')
target=Path('C:/Users/kryst/Desktop/CingyTech-final-local')
shutil.copytree(root/'public',target,dirs_exist_ok=True)
shutil.copy2(lab/'phases.mp4',target/'assets/crystal-study-phases.mp4')
shutil.copy2(lab/'phases.webp',target/'assets/crystal-study-phases.webp')
page=target/'index.html';text=page.read_text(encoding='utf-8')
for size in (768,1080,1440):text=text.replace(f'crystal-loop-{size}.mp4?v=flow-4','crystal-study-phases.mp4?v=local-study-1')
for size in (720,1280,2160):text=text.replace(f'crystal-poster-{size}.webp?v=flow-4','crystal-study-phases.webp?v=local-study-1')
# Keep compatible MP4 as the sole local study source, avoiding the old motif.
text=text.replace('<source src="./assets/hero-glass-loop-720.webm" type="video/webm">','')
page.write_text(text,encoding='utf-8')
script=target/'depth-motion.js';text=script.read_text(encoding='utf-8')
text=text.replace('[[3,12,17,111,-31],[9,55,11,137,-74],[14,82,15,123,-9],[87,18,14,129,-63],[95,46,19,147,-101],[91,76,12,119,-45],[38,25,9,0,0],[65,72,8,0,0]]','[[4,0,22,111,-31],[94,0,18,129,-63]]')
script.write_text(text,encoding='utf-8')
css=target/'crystal-studio.css'
text=css.read_text(encoding='utf-8')
text+='''
/* Local study only: two lenses, low-frequency illumination approximation. */
@keyframes depth-descent{0%{transform:translate3d(0,-30px,0);opacity:0;filter:brightness(.94)}14%{opacity:.24}32%{opacity:.34;filter:brightness(1.18)}48%{opacity:.25;filter:brightness(.94)}68%{opacity:.32;filter:brightness(1.14)}88%{opacity:.24;filter:brightness(.96)}100%{transform:translate3d(0,105vh,0);opacity:0;filter:brightness(.94)}}
.optical-lite .depth-drop:first-child{top:22%!important}.optical-lite .depth-drop:nth-child(2){top:68%!important}
'''
css.write_text(text,encoding='utf-8')
(target/'LOCAL-PREVIEW.txt').write_text('''Cingy.Tech — integrated local study
Preserved baseline: Desktop/CingyTech-prototyp-2.1 and repo commit 37215a4.
Selected variant: C/phases. Small Cycles preview: 640x640, 24fps, 288 genuine frames, 12s.
No upscaling/4K claim; independent motion is baked into the video.
Two background lenses use a low contrast CSS illumination approximation.
No Netlify deploy, production publication or new purchase.
''',encoding='utf-8')
print(json.dumps({'directory':str(target),'selected':'phases','movieBytes':(target/'assets/crystal-study-phases.mp4').stat().st_size,'backgroundDroplets':2}))
