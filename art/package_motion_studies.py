"""Build a standalone local comparison, without touching public/ or hosting."""
from pathlib import Path
import subprocess,json,shutil,argparse
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parent.parent
source=root/'render/crystal/motion-studies'
output=Path('C:/Users/kryst/Desktop/CingyTech-motion-lab')
output.mkdir(exist_ok=True)
results=[]
parser=argparse.ArgumentParser();parser.add_argument('--variant',choices=['together','counter','phases','continuous'])
args=parser.parse_args();variants=[args.variant] if args.variant else ['together','counter','phases']
contact=Image.new('RGB',(960,1008),(9,10,16))
for variant in variants:
    folder=source/variant;metadata=json.loads((folder/'metadata.json').read_text())
    frames=sorted(folder.glob('frame_*.png'))
    expected=384 if variant=='continuous' else 288
    if len(frames)!=expected or metadata['frames']!=expected:raise RuntimeError(f'{variant}: expected {expected} actual frames')
    minimum_margin=640;worst_black=0
    command=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size','640x640','-framerate','24','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(output/f'{variant}.mp4')]
    proc=subprocess.Popen(command,stdin=subprocess.PIPE)
    for index,path in enumerate(frames):
        frame=Image.open(path).convert('RGBA');arr=np.array(frame)
        opaque=arr[:,:,3]>230;black=(arr[:,:,:3].max(axis=2)<3)&opaque
        worst_black=max(worst_black,int(black.sum()))
        yy,xx=np.where(arr[:,:,3]>80)
        minimum_margin=min(minimum_margin,int(xx.min()),int(yy.min()),639-int(xx.max()),639-int(yy.max()))
        rgb=Image.new('RGB',frame.size);rgb.paste(frame,mask=frame.getchannel('A'))
        proc.stdin.write(rgb.tobytes())
        if index==0:rgb.save(output/f'{variant}.webp',quality=90)
        if index in (0,72,144):
            column=variants.index(variant)
            row=(0,72,144).index(index)
            contact.paste(rgb.resize((320,320),Image.Resampling.LANCZOS),(column*320,row*336+16))
    proc.stdin.close()
    if proc.wait()!=0:raise RuntimeError('Encoding failed')
    if minimum_margin<8:raise RuntimeError(f'{variant}: sculpture touches crop edge')
    if worst_black>600:raise RuntimeError(f'{variant}: suspicious opaque black material')
    shutil.copy2(folder/'study.blend',output/f'{variant}.blend')
    results.append({**metadata,'duration':expected/24,'minimumMargin':minimum_margin,'maxOpaqueBlackPixels':worst_black,'movieBytes':(output/f'{variant}.mp4').stat().st_size})
shutil.copy2(root/'public/assets/optical-backdrop-2560.webp',output/'backdrop.webp')
shutil.copy2(root/'public/assets/depth-water-drop.webp',output/'drop.webp')
(output/(f'{args.variant}-verification.json' if args.variant else 'verification.json')).write_text(json.dumps(results,indent=2))
contact.save(output/(f'{args.variant}-poses.png' if args.variant else 'porovnani.png'))
if not args.variant:
    html=Path(__file__).with_name('motion_studies.html').read_text(encoding='utf-8')
    (output/'index.html').write_text(html,encoding='utf-8')
print(json.dumps({'output':str(output),'variants':results},indent=2))
