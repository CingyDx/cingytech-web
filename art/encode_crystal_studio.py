"""Composite genuine 3840x2160 Cycles frames and encode responsive videos.

Requires Pillow, NumPy, FFmpeg with h264_nvenc. No interpolated movie frames.
The 4K/60 master stays in ignored render/; web derivatives are square crops.
"""
from pathlib import Path
import subprocess, json, argparse
import numpy as np
from PIL import Image
from verify_crystal_frames import verify_frames

root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--frames-dir',default='render/crystal/frames-4k-clean');parser.add_argument('--clean-stage',action='store_true');args=parser.parse_args()
frames=root/args.frames_dir
verify_frames(frames)
assets=root/'public/assets'
paths=[frames/f'crystal_{i:04d}.png' for i in range(1,361)]
if any(not p.is_file() for p in paths):raise RuntimeError('All 360 source frames are required')
for p in (paths[0],paths[-1]):
    if Image.open(p).size!=(3840,2160):raise RuntimeError('A source frame is not 4K')

# A stationary studio light field is baked into the video, so browsers need
# no per-frame blur, colour filter, alpha mask or backdrop effect for playback.
y,x=np.mgrid[0:2160,0:2160].astype(np.float32)/2159
edge=np.minimum.reduce([x,1-x,y,1-y]);fade=np.clip(edge/.08,0,1)
broad=np.exp(-((x-.50)/.40)**2-((y-.79)/.22)**2)*fade
pool=np.exp(-((x-.50)/.31)**2-((y-.91)/.048)**2)*fade
rgb=np.empty((2160,2160,3),dtype=np.uint8)
for i,(gain,pool_gain) in enumerate(zip((18,5,43),(11,3,28))):rgb[:,:,i]=np.clip(broad*gain+pool*pool_gain,0,255).astype(np.uint8)
# Pure black + screen composition keeps the movie edge invisible over the
# optical backdrop without a per-frame alpha mask or expensive colour filter.
stage=Image.new('RGB',(3840,2160),(0,0,0))
if not args.clean_stage:stage.paste(Image.fromarray(rgb),(840,0))

first=Image.open(paths[0]).convert('RGBA')
first_rgb=stage.copy();first_rgb.paste(first,(0,0),first.getchannel('A'))
square=first_rgb.crop((840,0,3000,2160))
for width in (720,1280,2160):square.resize((width,width),Image.Resampling.LANCZOS).save(assets/f'crystal-poster-{width}.webp',quality=92,method=6)
first.crop((840,0,3000,2160)).resize((1440,1440),Image.Resampling.LANCZOS).save(root/'render/crystal/figma-object.png')

def colour_scale(w,h):return f'scale={w}:{h}:in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p'
filters='[0:v]split=4[a][b][c][d];[a]'+colour_scale(3840,2160)+'[master];[b]crop=2160:2160:840:0,'+colour_scale(768,768)+',fps=30[small];[c]crop=2160:2160:840:0,'+colour_scale(1080,1080)+'[medium];[d]crop=2160:2160:840:0,'+colour_scale(1440,1440)+'[large]'
command=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size','3840x2160','-framerate','60','-i','pipe:0','-filter_complex',filters]
outputs=[('master',root/'render/crystal/crystal-master-4k-60.mp4',19,'5.2'),('small',root/'render/crystal/crystal-loop-768-raw.mp4',23,'3.1'),('medium',root/'render/crystal/crystal-loop-1080-raw.mp4',22,'4.2'),('large',root/'render/crystal/crystal-loop-1440-raw.mp4',22,'4.2')]
for name,path,cq,level in outputs:
    command+=['-map',f'[{name}]','-an','-c:v','h264_nvenc','-preset','p6','-tune','hq','-rc','vbr','-cq',str(cq),'-b:v','0','-profile:v','high','-level:v',level,'-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-movflags','+faststart',str(path)]
process=subprocess.Popen(command,stdin=subprocess.PIPE)
try:
    for index,path in enumerate(paths,1):
        frame=Image.open(path).convert('RGBA');composite=stage.copy();composite.paste(frame,(0,0),frame.getchannel('A'))
        process.stdin.write(composite.tobytes())
        if index%60==0:print('ENCODE_FRAME',index,flush=True)
    process.stdin.close()
    if process.wait()!=0:raise RuntimeError('FFmpeg failed')
except BaseException:
    process.kill();process.wait();raise
print(json.dumps({name:{'path':str(path),'bytes':path.stat().st_size} for name,path,_,_ in outputs},indent=2))
