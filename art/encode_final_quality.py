"""Verify 1920 actual 4K frames and make isolated master/web derivatives."""
from pathlib import Path
import subprocess,json,time
from PIL import Image
import numpy as np

root=Path(__file__).resolve().parent.parent
source=root/'render/crystal/final4k'
target=root/'render/crystal/final-quality'
target.mkdir(exist_ok=True)
paths=[source/f'frame_{i:04d}.png' for i in range(1,1921)]
minimum=2160;worst=0
for index,path in enumerate(paths,1):
    if not path.exists():raise RuntimeError(f'Missing actual source frame {index}')
    with Image.open(path) as im:
        if im.size!=(3840,2160):raise RuntimeError(f'Not actual 4K: {index}')
        rgba=im.convert('RGBA');small=np.array(rgba.resize((384,216)))
        black=int(((small[:,:,:3].max(axis=2)<3)&(small[:,:,3]>240)).sum());worst=max(worst,black)
        if black>100:raise RuntimeError(f'Opaque black glass defect: {index}')
        box=rgba.getchannel('A').point(lambda x:255 if x>80 else 0).getbbox()
        minimum=min(minimum,box[0]-840,box[1],3000-box[2],2160-box[3])
    if index%120==0:print('VERIFY_4K_FRAME',index,flush=True)
if minimum<8:raise RuntimeError('Sculpture crop clipping')
proof={'frames':1920,'width':3840,'height':2160,'fps':60,'duration':32,'samples':32,'opaqueBlackPixelsAtProbeScale':worst,'minimumCropMargin':minimum,'source':'continuous-polish'}
(target/'source-proof.json').write_text(json.dumps(proof,indent=2))
first=Image.open(paths[0]).convert('RGBA');stage=Image.new('RGB',(3840,2160));stage.paste(first,mask=first.getchannel('A'))
for size in (768,1280,2160):stage.crop((840,0,3000,2160)).resize((size,size),Image.Resampling.LANCZOS).save(target/f'poster-{size}.webp',quality=92,method=6)

def scale(w,h):return f'scale={w}:{h}:in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p'
filters='[0:v]split=4[a][b][c][d];[a]'+scale(3840,2160)+'[master];[b]crop=2160:2160:840:0,'+scale(768,768)+',fps=30[small];[c]crop=2160:2160:840:0,'+scale(1080,1080)+'[medium];[d]crop=2160:2160:840:0,'+scale(1440,1440)+'[large]'
command=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size','3840x2160','-framerate','60','-i','pipe:0','-filter_complex',filters]
for name,path,cq,level in [('master','master-4k-60.mp4',17,'5.2'),('small','raw-768.mp4',22,'3.1'),('medium','raw-1080.mp4',21,'4.2'),('large','raw-1440.mp4',20,'4.2')]:
    command+=['-map',f'[{name}]','-an','-c:v','h264_nvenc','-preset','p6','-tune','hq','-rc','vbr','-cq',str(cq),'-b:v','0','-profile:v','high','-level:v',level,'-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-movflags','+faststart',str(target/path)]
process=subprocess.Popen(command,stdin=subprocess.PIPE)
try:
    for index,path in enumerate(paths,1):
        with Image.open(path) as im:
            frame=im.convert('RGBA');rgb=Image.new('RGB',frame.size);rgb.paste(frame,mask=frame.getchannel('A'));process.stdin.write(rgb.tobytes())
        if index%120==0:print('ENCODE_4K_FRAME',index,flush=True)
    process.stdin.close()
    if process.wait()!=0:raise RuntimeError('Master encoding failed')
except BaseException:
    process.kill();process.wait();raise
for size,crf,rate in [(768,24,'2M'),(1080,23,'5M'),(1440,22,'7M')]:
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(target/f'raw-{size}.mp4'),'-vf','hqdn3d=1:1:1.5:1.5','-an','-c:v','libx264','-preset','slow','-crf',str(crf),'-maxrate',rate,'-bufsize',str(int(rate[:-1])*2)+'M','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-movflags','+faststart',str(target/f'web-{size}.mp4')],check=True)
    print('WEB_ENCODE_COMPLETE',size,flush=True)
proof['movies']={}
for name in ['master-4k-60.mp4','web-768.mp4','web-1080.mp4','web-1440.mp4']:
    data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,avg_frame_rate,nb_frames','-show_entries','format=duration','-of','json',str(target/name)]))
    proof['movies'][name]={'probe':data,'bytes':(target/name).stat().st_size}
    expected=960 if name=='web-768.mp4' else 1920
    stream=data['streams'][0]
    width,height,fps={'master-4k-60.mp4':(3840,2160,60),'web-768.mp4':(768,768,30),'web-1080.mp4':(1080,1080,60),'web-1440.mp4':(1440,1440,60)}[name]
    numerator,denominator=map(int,stream['avg_frame_rate'].split('/'))
    if (stream['width'],stream['height'])!=(width,height) or denominator==0 or numerator/denominator!=fps:raise RuntimeError(f'Wrong actual resolution/frame rate: {name}')
    if int(stream['nb_frames'])!=expected or abs(float(data['format']['duration'])-32)>.01:raise RuntimeError('Wrong actual frame count/duration')
(target/'verification.json').write_text(json.dumps(proof,indent=2))
print('FINAL_QUALITY_READY',json.dumps(proof),flush=True)
