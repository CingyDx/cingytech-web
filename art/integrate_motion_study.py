"""Integrate chosen small study into an isolated local copy, never public/."""
from pathlib import Path
import shutil,json,argparse

root=Path(__file__).resolve().parent.parent
lab=Path('C:/Users/kryst/Desktop/CingyTech-motion-lab')
target=Path('C:/Users/kryst/Desktop/CingyTech-final-local')
parser=argparse.ArgumentParser();parser.add_argument('--variant',choices=['phases','continuous','continuous-polish'],default='phases')
parser.add_argument('--moving-background',action='store_true')
parser.add_argument('--rich-background',action='store_true')
parser.add_argument('--final-quality',action='store_true')
parser.add_argument('--final-polish',action='store_true')
args=parser.parse_args();variant=args.variant
if args.final_quality:args.final_polish=True
if args.rich_background:args.moving_background=True
if args.final_quality:
    final=root/'render/crystal/final-quality'
    if not (final/'verification.json').exists():raise RuntimeError('Actual final-quality verification is required first')
    backup=target.with_name('CingyTech-final-local-before-4k')
    if not backup.exists():shutil.copytree(target,backup)
if args.moving_background:
    backup=target.with_name('CingyTech-final-local-before-moving-background')
    if not backup.exists():shutil.copytree(target,backup)
if variant in ('continuous','continuous-polish'):
    backup=target.with_name('CingyTech-final-local-continuous' if variant=='continuous-polish' else 'CingyTech-final-local-C')
    if not backup.exists():shutil.copytree(target,backup)
shutil.copytree(root/'public',target,dirs_exist_ok=True)
shutil.copy2(lab/f'{variant}.mp4',target/f'assets/crystal-study-{variant}.mp4')
shutil.copy2(lab/f'{variant}.webp',target/f'assets/crystal-study-{variant}.webp')
page=target/'index.html';text=page.read_text(encoding='utf-8')
for size in (768,1080,1440):text=text.replace(f'crystal-loop-{size}.mp4?v=flow-4',f'crystal-study-{variant}.mp4?v=local-study-2')
for size in (720,1280,2160):text=text.replace(f'crystal-poster-{size}.webp?v=flow-4',f'crystal-study-{variant}.webp?v=local-study-2')
# Keep compatible MP4 as the sole local study source, avoiding the old motif.
text=text.replace('<source src="./assets/hero-glass-loop-720.webm" type="video/webm">','')
page.write_text(text,encoding='utf-8')
script=target/'depth-motion.js';text=script.read_text(encoding='utf-8')
if variant=='continuous-polish':
    text=text.replace('const omega=12,damping=.78','const omega=10.5,damping=.52').replace('about 2% overshoot (under .2px)','about 15% overshoot (around 1px on project cards)')
    text=text.replace('shift:(x-.5)*14','shift:(x-.5)*(element.matches(".site-header")?96:24)')
if args.final_polish:text=text.replace('damping=.52','damping=.48')
drops='[[4,0,22,111,-31],[94,0,18,129,-63]]'
if args.moving_background:
    drops='[[4,0,22,151,-28],[94,0,18,179,-93],[9,0,13,193,-124],[88,0,16,167,-12],[14,0,10,211,-65],[97,0,11,137,-73],[2,0,9,181,-146],[91,0,14,223,-42],[7,0,16,157,-103],[85,0,9,199,-172],[12,0,12,173,-37],[99,0,8,229,-132]]'
if args.rich_background:
    import random
    rng=random.Random(5070);specs=[]
    for i in range(28):
        x=rng.uniform(1.5,16) if i%2==0 else rng.uniform(84,98.5)
        specs.append([round(x,2),0,rng.randint(12,29),rng.randint(137,235),-rng.randint(8,210),round(rng.uniform(.34,.48),2)])
    for x in [30,38,45,55,63,69,34,60]:specs.append([x,0,rng.randint(6,10),rng.randint(193,289),-rng.randint(35,245),round(rng.uniform(.13,.2),2)])
    drops=json.dumps(specs,separators=(',',':'))
    text=text.replace('([x,y,size,duration,delay])','([x,y,size,duration,delay,alpha=.3])').replace("(duration?'':' depth-drop-still')","(duration?'':' depth-drop-still')+(alpha<.25?' depth-drop-far':'')")
    text=text.replace('--drop-delay:${delay}s','--drop-delay:${delay}s;--drop-alpha:${alpha}')
text=text.replace('[[3,12,17,111,-31],[9,55,11,137,-74],[14,82,15,123,-9],[87,18,14,129,-63],[95,46,19,147,-101],[91,76,12,119,-45],[38,25,9,0,0],[65,72,8,0,0]]',drops)
script.write_text(text,encoding='utf-8')
css=target/'crystal-studio.css'
text=css.read_text(encoding='utf-8')
text+='''
/* Local study only: two lenses, low-frequency illumination approximation. */
@keyframes depth-descent{0%{transform:translate3d(0,-30px,0);opacity:0;filter:brightness(.94)}14%{opacity:.24}32%{opacity:.34;filter:brightness(1.18)}48%{opacity:.25;filter:brightness(.94)}68%{opacity:.32;filter:brightness(1.14)}88%{opacity:.24;filter:brightness(.96)}100%{transform:translate3d(0,105vh,0);opacity:0;filter:brightness(.94)}}
.optical-lite .depth-drop:first-child{top:22%!important}.optical-lite .depth-drop:nth-child(2){top:68%!important}
@media(min-width:761px) and (max-width:1050px){body:not(.subpage) .hero-copy>p{max-width:min(340px,44vw)}}
'''
css.write_text(text,encoding='utf-8')
if variant=='continuous-polish':
    with css.open('a',encoding='utf-8') as file:file.write('''
.optical-surface:hover>.glass-optics>.glass-glint,.optical-surface:focus-within>.glass-optics>.glass-glint{opacity:.18}
.site-header.optical-surface>.glass-optics>.glass-glint{background:radial-gradient(ellipse at 50% 0,rgba(230,208,255,.55),rgba(176,131,231,.16) 38%,transparent 68%)}
.site-header.optical-surface:hover>.glass-optics>.glass-glint,.site-header.optical-surface:focus-within>.glass-optics>.glass-glint{opacity:.16}
.site-header.optical-surface.depth-managed>.glass-optics>.glass-glint{opacity:clamp(0,calc(var(--hover-progress,0)*.16),.16);transition:none}
''')
if args.moving_background:
    from PIL import Image
    source=root/'render/crystal/clean-glass-1920.png'
    metadata=json.loads(source.with_suffix('.json').read_text())
    if metadata['waterLenses']!=0 or metadata['width']!=1920:raise RuntimeError('Expected small clean background without baked water lenses')
    image=Image.open(source).convert('RGB')
    image.save(target/'assets/clean-glass-1920.webp',quality=84,method=6)
    image.resize((1280,720),Image.Resampling.LANCZOS).save(target/'assets/clean-glass-1280.webp',quality=82,method=6)
    image.crop((1296,0,1920,1080)).resize((720,1246),Image.Resampling.LANCZOS).save(target/'assets/clean-glass-mobile.webp',quality=82,method=6)
    with css.open('a',encoding='utf-8') as file:file.write('''
/* A clean Cycles material plate, with all background water in real DOM layers. */
.optical-pane{background-image:url('./assets/clean-glass-1920.webp?v=local-water-1')}
.optical-lite .optical-pane{background-image:url('./assets/clean-glass-1280.webp?v=local-water-1')}
@media(max-width:760px){.optical-lite .optical-pane{background-image:url('./assets/clean-glass-mobile.webp?v=local-water-1')}}
@keyframes depth-descent{0%{transform:translate3d(0,-30px,0);opacity:0;filter:brightness(.94)}10%{transform:translate3d(0,-20px,0);opacity:.2;filter:brightness(.96)}30%{transform:translate3d(0,30vh,0);opacity:.3;filter:brightness(1.14)}42%{transform:translate3d(0,30vh,0);opacity:.27;filter:brightness(1.1)}75%{transform:translate3d(0,72vh,0);opacity:.23;filter:brightness(.97)}86%{transform:translate3d(0,72vh,0);opacity:.25;filter:brightness(1.08)}100%{transform:translate3d(0,108vh,0);opacity:0;filter:brightness(.94)}}
.optical-lite .depth-drop:nth-child(3){top:45%!important}.optical-lite .depth-drop:nth-child(4){top:82%!important}
''')
    shutil.copy2(source.with_suffix('.json'),target/'BACKGROUND-SOURCE.json')
if args.rich_background:
    with css.open('a',encoding='utf-8') as file:file.write('''
@keyframes depth-descent{0%{transform:translate3d(0,-30px,0);opacity:0;filter:brightness(.94)}10%{transform:translate3d(0,-20px,0);opacity:calc(var(--drop-alpha)*.72);filter:brightness(.98)}30%{transform:translate3d(0,30vh,0);opacity:var(--drop-alpha);filter:brightness(1.23)}42%{transform:translate3d(0,30vh,0);opacity:calc(var(--drop-alpha)*.92);filter:brightness(1.16)}75%{transform:translate3d(0,72vh,0);opacity:calc(var(--drop-alpha)*.8);filter:brightness(1.02)}86%{transform:translate3d(0,72vh,0);opacity:calc(var(--drop-alpha)*.88);filter:brightness(1.14)}100%{transform:translate3d(0,108vh,0);opacity:0;filter:brightness(.94)}}
.depth-drop-far{z-index:0}.optical-lite .depth-drop{opacity:.15!important}
''')
if args.final_quality:
    for size in (768,1080,1440):shutil.copy2(final/f'web-{size}.mp4',target/f'assets/final-crystal-{size}.mp4')
    for size in (768,1280,2160):shutil.copy2(final/f'poster-{size}.webp',target/f'assets/final-crystal-poster-{size}.webp')
    html=page.read_text(encoding='utf-8')
    for level,size in [('Small',768),('Medium',1080),('Large',1440)]:html=html.replace(f'data-mp4-{level.lower()}="./assets/crystal-study-{variant}.mp4?v=local-study-2"',f'data-mp4-{level.lower()}="./assets/final-crystal-{size}.mp4?v=final-1"')
    html=html.replace(f'<source src="./assets/crystal-study-{variant}.mp4?v=local-study-2"', '<source src="./assets/final-crystal-768.mp4?v=final-1"')
    html=html.replace(f'poster="./assets/crystal-study-{variant}.webp?v=local-study-2"','poster="./assets/final-crystal-poster-1280.webp?v=final-1"')
    html=html.replace(f'<source media="(min-width: 1600px)" srcset="./assets/crystal-study-{variant}.webp?v=local-study-2"','<source media="(min-width: 1600px)" srcset="./assets/final-crystal-poster-2160.webp?v=final-1"').replace(f'<source media="(max-width: 760px)" srcset="./assets/crystal-study-{variant}.webp?v=local-study-2"','<source media="(max-width: 760px)" srcset="./assets/final-crystal-poster-768.webp?v=final-1"')
    html=html.replace(f'src="./assets/crystal-study-{variant}.webp?v=local-study-2"','src="./assets/final-crystal-poster-1280.webp?v=final-1"');page.write_text(html,encoding='utf-8')
    player=target/'hero-orb.js';code=player.read_text(encoding='utf-8')
    code=code.replace("const limited = saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType) || (connection?.downlink > 0 && connection.downlink <= 2)","const limited = saveData || (!(location.hostname === '127.0.0.1' || location.hostname === 'localhost') && (['slow-2g', '2g', '3g'].includes(connection?.effectiveType) || (connection?.downlink > 0 && connection.downlink <= 2)))")
    player.write_text(code,encoding='utf-8');shutil.copy2(final/'verification.json',target/'FINAL-QUALITY-VERIFICATION.json')
(target/'LOCAL-PREVIEW.txt').write_text('''Cingy.Tech — integrated local study
Preserved baseline: Desktop/CingyTech-prototyp-2.1 and repo commit 37215a4.
Selected variant and actual frame dimensions are in SOURCE-VERIFICATION.json.
No upscaling/4K claim; independent motion is baked into the video.
Background lenses use a low contrast CSS illumination approximation.
No Netlify deploy, production publication or new purchase.
''',encoding='utf-8')
if args.final_quality:
    (target/'LOCAL-PREVIEW.txt').write_text('''Cingy.Tech — final local quality
Actual source: 1920 Blender Cycles frames, 3840x2160, 60fps, 32 seconds.
4K master: render/crystal/final-quality/master-4k-60.mp4 in the worktree.
The page serves compressed 768/30fps, 1080/60fps or 1440/60fps variants.
Source, frame counts and output sizes: FINAL-QUALITY-VERIFICATION.json.
The browser plays a prerendered movie; it does not perform live ray tracing.
No Netlify deploy, production publication or new purchase.
''',encoding='utf-8')
verification=lab/(f'{variant}-verification.json' if variant in ('continuous','continuous-polish') else 'verification.json')
shutil.copy2(verification,target/'SOURCE-VERIFICATION.json')
if args.final_quality:shutil.copy2(final/'verification.json',target/'SOURCE-VERIFICATION.json')
print(json.dumps({'directory':str(target),'selected':variant,'finalQuality':args.final_quality,'movieBytes':(target/f'assets/crystal-study-{variant}.mp4').stat().st_size,'backgroundDroplets':36 if args.rich_background else 12 if args.moving_background else 2,'bakedBackgroundDroplets':0 if args.moving_background else 36}))
